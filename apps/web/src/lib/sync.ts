// Fuente de verdad: Cloudflare D1 vía Worker. localStorage solo es caché.
// Costo cero: sin polling ni intervalos. 1 GET /v1/data por sesión,
// 1 POST /v1/sync/push por guardado (lote), nada más.
import { getInstallationId, getWorkerUrl } from "./auth";
import { buildTombstone, buildUpsert, parseStatus, type CloudStatusView, type RemoteRecord, type SyncChange } from "./cloud";
import { audit, nowIso, type WebState } from "./store";

export function cloudBase(): string {
  return getWorkerUrl().trim().replace(/\/+$/, "");
}

export function cloudInstallation(): string {
  return getInstallationId().trim();
}

async function cloudFetch(base: string, installationId: string, path: string, init?: RequestInit, timeoutMs = 15000): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-ezzy-installation": installationId, ...(init?.headers ?? {}) },
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data) {
      const err = data?.["error"] as { message?: unknown } | undefined;
      throw new Error(typeof err?.message === "string" ? err.message : `error ${res.status}`);
    }
    if (data["error"]) {
      const err = data["error"] as { message?: unknown };
      throw new Error(typeof err.message === "string" ? err.message : "rechazado");
    }
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("sin respuesta (15s)");
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Convierte los registros de la nube al estado de la web. Los eliminados se omiten. */
export function recordsToState(records: RemoteRecord[], prevAudits: WebState["audits"] = []): WebState {
  const products: WebState["products"] = [];
  const variants: WebState["variants"] = [];
  const prices: WebState["prices"] = [];
  const messages: WebState["messages"] = [];
  for (const r of records) {
    if (r.deleted || !r.dto) continue;
    const d = r.dto;
    if (r.entity_type === "product") {
      if (typeof d["id"] !== "string" || typeof d["name"] !== "string") continue;
      products.push({
        id: String(d["id"]), name: String(d["name"]),
        fabric: typeof d["fabric"] === "string" ? (d["fabric"] as string) : undefined,
        brand: typeof d["brand"] === "string" ? (d["brand"] as string) : undefined,
        description: str(d["description"]), status: d["status"] === "archived" ? "archived" : "active",
        created_at: str(d["created_at"], nowIso()), updated_at: str(d["updated_at"], nowIso()),
        revision: num(d["revision"] ?? r.revision, r.revision),
      });
    } else if (r.entity_type === "variant") {
      if (typeof d["id"] !== "string" || typeof d["product_id"] !== "string") continue;
      variants.push({
        id: String(d["id"]), product_id: String(d["product_id"]), label: str(d["label"]),
        size: typeof d["size"] === "string" ? (d["size"] as string) : undefined,
        active: d["active"] !== false, revision: num(d["revision"] ?? r.revision, r.revision),
      });
    } else if (r.entity_type === "price") {
      if (typeof d["id"] !== "string" || typeof d["product_id"] !== "string") continue;
      prices.push({
        id: String(d["id"]), product_id: String(d["product_id"]),
        variant_id: typeof d["variant_id"] === "string" ? (d["variant_id"] as string) : undefined,
        amount_minor: num(d["amount_minor"]), currency: str(d["currency"], "PEN"),
        source: str(d["source"], "panel"), verified_at: str(d["verified_at"], nowIso()),
        revision: num(d["revision"] ?? r.revision, r.revision),
      });
    } else if (r.entity_type === "approved_message") {
      if (typeof d["id"] !== "string") continue;
      messages.push({
        id: String(d["id"]), title: str(d["title"]), body: str(d["body"]),
        intent: str(d["intent"], "general"), channel: str(d["channel"], "whatsapp"),
        tags: Array.isArray(d["tags"]) ? (d["tags"] as unknown[]).filter((t): t is string => typeof t === "string") : [],
        status: d["status"] === "archived" ? "archived" : d["status"] === "draft" ? "draft" : "approved",
        verified_at: str(d["verified_at"], nowIso()),
        revision: num(d["revision"] ?? r.revision, r.revision),
        command_alias: typeof d["command_alias"] === "string" ? (d["command_alias"] as string) : undefined,
      });
    }
  }
  return { products, variants, prices, messages, audits: prevAudits };
}

/** Descarga todo una vez (al entrar). 1 sola petición. */
export async function pullWebState(prevAudits: WebState["audits"] = []): Promise<WebState> {
  const records = await ensureRawRecords();
  return recordsToState(records, prevAudits);
}

/** Sube un lote (1 petición). Lanza si hay conflicto: recarga y reintenta. */
export async function pushChanges(changes: SyncChange[]): Promise<void> {
  if (changes.length === 0) return;
  const base = cloudBase();
  const inst = cloudInstallation();
  if (!base.startsWith("https://")) throw new Error("servidor no configurado");
  if (!inst) throw new Error("instalación no configurada");
  const out = await cloudFetch(base, inst, "/v1/sync/push", {
    method: "POST",
    body: JSON.stringify({ schemaVersion: 1, changes }),
  });
  const conflicts = out["conflicts"] as unknown;
  if (Array.isArray(conflicts) && conflicts.length > 0) {
    throw new Error("conflicto: otro avanzó primero, recarga y reintenta");
  }
  invalidateRecords(); // lo siguiente que lea la nube trae fresco (1 sola petición)
}

// Caché de sesión: una sola descarga de /v1/data aunque varios componentes la pidan.
// Sin polling ni refetch al cambiar de pestaña. Las mutaciones invalidan.
let rawCache: RemoteRecord[] | null = null;
let rawInflight: Promise<RemoteRecord[]> | null = null;

async function fetchRaw(): Promise<RemoteRecord[]> {
  const base = cloudBase();
  const inst = cloudInstallation();
  if (!base.startsWith("https://")) throw new Error("servidor no configurado");
  if (!inst) throw new Error("instalación no configurada");
  const out = await cloudFetch(base, inst, "/v1/data");
  const data = out["data"];
  if (!Array.isArray(data)) throw new Error("respuesta inválida");
  return data as RemoteRecord[];
}

export function getCachedRecords(): RemoteRecord[] | null {
  return rawCache;
}

export function invalidateRecords(): void {
  rawCache = null;
}

/** Devuelve registros: caché si hay, o la única petición en curso (single-flight). */
export async function ensureRawRecords(): Promise<RemoteRecord[]> {
  if (rawCache) return rawCache;
  if (!rawInflight) {
    rawInflight = fetchRaw().then((r) => {
      rawCache = r;
      return r;
    }).finally(() => {
      rawInflight = null;
    });
  }
  return rawInflight;
}

/** Refresca a la fuerza (botón recargar, guardar, enrolar). 1 petición. */
export async function refreshRawRecords(): Promise<RemoteRecord[]> {
  rawInflight = fetchRaw().then((r) => {
    rawCache = r;
    return r;
  }).finally(() => {
    rawInflight = null;
  });
  return rawInflight;
}

// Estado del servidor en caché: 1 sola consulta por sesión.
// Al volver a la sección se muestra lo guardado sin redibujar ni pedir de nuevo.
let statusCache: CloudStatusView | null = null;
let statusInflight: Promise<CloudStatusView> | null = null;

async function fetchStatus(): Promise<CloudStatusView> {
  const base = cloudBase();
  if (!base.startsWith("https://")) throw new Error("servidor no configurado");
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${base}/v1/status`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`el servidor respondió ${res.status}`);
    return parseStatus(await res.json());
  } finally {
    window.clearTimeout(timer);
  }
}

export function getCachedStatus(): CloudStatusView | null {
  return statusCache;
}

/** Devuelve el estado: caché si hay, o la única petición en curso. */
export async function ensureStatus(): Promise<CloudStatusView> {
  if (statusCache) return statusCache;
  if (!statusInflight) {
    statusInflight = fetchStatus().then((s) => {
      statusCache = s;
      return s;
    }).finally(() => {
      statusInflight = null;
    });
  }
  return statusInflight;
}

/** Refresca a la fuerza (botón Actualizar). 1 petición. */
export async function refreshStatus(): Promise<CloudStatusView> {
  statusInflight = fetchStatus().then((s) => {
    statusCache = s;
    return s;
  }).finally(() => {
    statusInflight = null;
  });
  return statusInflight;
}

export function productPayload(p: { id: string; name: string; fabric?: string; brand?: string; description: string; status: string; created_at: string; updated_at: string }): Record<string, unknown> {
  return { id: p.id, name: p.name, fabric: p.fabric, brand: p.brand, description: p.description, status: p.status, created_at: p.created_at, updated_at: p.updated_at };
}

export function productChanges(
  p: { id: string; name: string; fabric?: string; brand?: string; description: string; status: "active" | "archived"; created_at: string; updated_at: string },
  baseRevision: number,
  vRows: { id: string; label: string; size?: string; active: boolean }[],
  prRows: { id: string; variant_id?: string; amount_minor: number; currency: string; source: string; verified_at: string }[],
): SyncChange[] {
  const rev = baseRevision + 1;
  const out: SyncChange[] = [buildUpsert("product", p.id, baseRevision, { ...productPayload(p), revision: rev })];
  for (const v of vRows) out.push(buildUpsert("variant", v.id, 0, { id: v.id, product_id: p.id, label: v.label, size: v.size, active: v.active, revision: 1 }));
  for (const pr of prRows) out.push(buildUpsert("price", pr.id, 0, { id: pr.id, product_id: p.id, variant_id: pr.variant_id, amount_minor: pr.amount_minor, currency: pr.currency, source: pr.source, verified_at: pr.verified_at, revision: 1 }));
  return out;
}

export function messageChanges(
  m: { id: string; title: string; body: string; intent: string; channel: string; tags: string[]; status: string; verified_at: string; command_alias?: string },
  baseRevision: number,
): SyncChange[] {
  return [buildUpsert("approved_message", m.id, baseRevision, { ...m, revision: baseRevision + 1 })];
}

export function deleteProductChanges(productId: string, revision: number, variantIds: { id: string; revision: number }[], priceIds: { id: string; revision: number }[]): SyncChange[] {
  return [
    buildTombstone("product", productId, revision),
    ...variantIds.map((v) => buildTombstone("variant", v.id, v.revision)),
    ...priceIds.map((p) => buildTombstone("price", p.id, p.revision)),
  ];
}

export function withAudit(prev: WebState, next: Omit<WebState, "audits">, action: string, detail: string): WebState {
  return audit({ ...next, audits: prev.audits }, action, detail);
}
