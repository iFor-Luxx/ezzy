// Adaptador HTTP del sync-api: expone el protocolo a la extensión y al panel.
// Rutas: POST /v1/enroll · GET /v1/status · GET /v1/data · POST /v1/sync/push · GET /v1/sync/pull?cursor=
// IA (proxy): POST /v1/ai/key · GET /v1/ai/status · GET /v1/ai/key · POST /v1/ai/forget · GET /v1/ai/models · POST /v1/ai/chat
// Auth por header x-ezzy-installation (instalación enrolada). /v1/status es público mínimo (sin contenido).
// Auth + datos persistentes en D1 (una sola fuente de verdad aunque Cloudflare recicle isolates).
// La API key de OpenCode NUNCA se devuelve ni se lista: solo se escribe y el Worker la usa para firmar el proxy.
// Costo cero: sin polling, 1 query por data/pull, 2 counts por status, push en 1 batch.
import { SyncServer, D1RecordStore, D1UsageStore } from "./server";
import { AuthStore, D1AuthStore, type AuthPort, type D1Database } from "./auth";
import { MemoryAiKeyStore, D1AiKeyStore, isValidAiKeyFormat, type AiKeyStore } from "./ai_key";
import { SCHEMA_VERSION } from "@ezzy/contracts";
import { errorEnvelope } from "@ezzy/sync-client";

interface Env {
  EZZY_DB?: D1Database;
}

// Base Go verificada: lista y chat van con prefijo /go (igual que el panel anterior).
const GO_BASE = "https://opencode.ai/inference/go";

// Un SyncServer por binding D1 (misma fuente de verdad en todo el isolate).
// Sin binding (tests): servidor en memoria.
const memAuth = new AuthStore();
const memServer = new SyncServer(memAuth);
const servers = new WeakMap<D1Database, SyncServer>();

// Key de IA por binding D1 (write-only, nunca se lista). Memoria en tests.
const memAiKeys = new MemoryAiKeyStore();
const aiStores = new WeakMap<D1Database, AiKeyStore>();

function getAiKeys(env?: Env): AiKeyStore {
  const db = env?.EZZY_DB;
  if (!db) return memAiKeys;
  let s = aiStores.get(db);
  if (!s) {
    s = new D1AiKeyStore(db);
    aiStores.set(db, s);
  }
  return s;
}

function getServer(env?: Env): SyncServer {
  const db = env?.EZZY_DB;
  if (!db) return memServer;
  let s = servers.get(db);
  if (!s) {
    s = new SyncServer(new D1AuthStore(db), new D1RecordStore(db), new D1UsageStore(db));
    servers.set(db, s);
  }
  return s;
}

function getAuth(server: SyncServer): AuthPort {
  return server.auth;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,x-ezzy-installation",
    },
  });
}

async function authorizedId(req: Request, auth: AuthPort): Promise<string | null> {
  const id = req.headers.get("x-ezzy-installation")?.trim();
  return id && (await auth.isAuthorized(id)) ? id : null;
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = (await req.json()) as unknown;
    return typeof b === "object" && b !== null ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(req: Request, env?: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const server = getServer(env);
    const auth = getAuth(server);

    // Preflight CORS: la web en Pages llama al Worker desde otro origen.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,x-ezzy-installation",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (req.method === "POST" && path === "/v1/enroll") {
      const body = await readJson(req);
      const installationId = body?.["installationId"];
      const ownerSecret = body?.["ownerSecret"];
      if (typeof installationId !== "string" || !installationId || typeof ownerSecret !== "string" || !ownerSecret) {
        return json(errorEnvelope("VALIDATION_ERROR", "installationId y ownerSecret requeridos", false), 400);
      }
      let ok: boolean;
      if (!(await auth.getOwnerHash())) {
        ok = await auth.bootstrap(ownerSecret, installationId);
      } else {
        ok = await auth.enroll(installationId, ownerSecret);
      }
      if (!ok) return json(errorEnvelope("FORBIDDEN", "secreto incorrecto", false), 403);
      return json({ schemaVersion: SCHEMA_VERSION, ok: true });
    }

    if (req.method === "GET" && path === "/v1/status") {
      return json(await server.status());
    }

    const installationId = await authorizedId(req, auth);
    if (!installationId) {
      return json(errorEnvelope("UNAUTHORIZED", "instalación no enrolada o revocada (header x-ezzy-installation)", false), 401);
    }

    if (req.method === "GET" && path === "/v1/data") {
      return json({ schemaVersion: SCHEMA_VERSION, data: await server.list() });
    }

    if (req.method === "POST" && path === "/v1/sync/push") {
      const body = await readJson(req);
      if (!Array.isArray(body?.["changes"])) {
        return json(errorEnvelope("VALIDATION_ERROR", "changes requerido", false), 400);
      }
      const out = await server.push({
        installationId,
        schemaVersion: typeof body?.["schemaVersion"] === "number" ? (body?.["schemaVersion"] as number) : SCHEMA_VERSION,
        changes: body?.["changes"] as never,
      });
      return json({ schemaVersion: SCHEMA_VERSION, ...out });
    }

    if (req.method === "GET" && path === "/v1/sync/pull") {
      return json({ schemaVersion: SCHEMA_VERSION, ...(await server.pull(url.searchParams.get("cursor") ?? undefined)) });
    }

    // --- IA proxy (write-only): requiere instalación enrolada (ya verificado arriba) ---
    const aiKeys = getAiKeys(env);

    if (req.method === "POST" && path === "/v1/ai/key") {
      const body = await readJson(req);
      const raw = body?.["apiKey"] ?? body?.["key"];
      if (typeof raw !== "string" || !isValidAiKeyFormat(raw)) {
        return json(errorEnvelope("VALIDATION_ERROR", "apiKey inválida (formato oc_sk_…)", false), 400);
      }
      await aiKeys.set(raw);
      await server.usage.track(1, 0, 1);
      return json({ schemaVersion: SCHEMA_VERSION, ok: true, configured: true });
    }

    // Lectura para el dueño (panel privado tras PIN): devuelve la key para
    // rellenar el campo tras recargar y usarla en cualquier PC.
    if (req.method === "GET" && path === "/v1/ai/status") {
      return json({ schemaVersion: SCHEMA_VERSION, configured: await aiKeys.has(), updatedAt: await aiKeys.updatedAt() });
    }

    // Lectura para el dueño (panel privado tras PIN): devuelve la key para
    // rellenar el campo tras recargar y usarla en cualquier PC.
    if (req.method === "GET" && path === "/v1/ai/key") {
      const key = await aiKeys.get();
      if (!key) return json(errorEnvelope("VALIDATION_ERROR", "key no configurada: guárdala primero", false), 400);
      return json({ schemaVersion: SCHEMA_VERSION, apiKey: key });
    }

    if (req.method === "POST" && path === "/v1/ai/forget") {
      await aiKeys.clear();
      await server.usage.track(1, 0, 1);
      return json({ schemaVersion: SCHEMA_VERSION, ok: true, configured: false });
    }

    if (req.method === "GET" && path === "/v1/ai/models") {
      const key = await aiKeys.get();
      if (!key) return json(errorEnvelope("VALIDATION_ERROR", "key no configurada: guárdala primero", false), 400);
      await server.usage.track(1, 0, 0);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      try {
        const up = await fetch(`${GO_BASE}/v1/models`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: ctrl.signal,
        });
        if (up.status === 401) return json(errorEnvelope("UNAUTHORIZED", "key revocada o inválida (401)", false), 401);
        if (up.status === 403) return json(errorEnvelope("FORBIDDEN", "sin permiso para listar (403)", false), 403);
        if (!up.ok) return json(errorEnvelope("TEMPORARY_FAILURE", `no se pudo listar (${up.status})`, up.status >= 500), 502);
        const raw = (await up.json().catch(() => null)) as unknown;
        const models = parseUpstreamModels(raw);
        if (models.length === 0) return json(errorEnvelope("VALIDATION_ERROR", "sin modelos disponibles", false), 502);
        return json({ schemaVersion: SCHEMA_VERSION, models });
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return json(errorEnvelope("TEMPORARY_FAILURE", "timeout listando modelos", true), 504);
        return json(errorEnvelope("TEMPORARY_FAILURE", "fallo de red listando modelos", true), 502);
      } finally {
        clearTimeout(timer);
      }
    }

    if (req.method === "POST" && path === "/v1/ai/chat") {
      const body = await readJson(req);
      const modelId = body?.["modelId"];
      const text = body?.["text"];
      const sessionId = typeof body?.["sessionId"] === "string" ? (body?.["sessionId"] as string).slice(0, 100) : undefined;
      const stream = body?.["stream"] === true;
      if (typeof modelId !== "string" || !modelId.trim() || modelId.length > 200) {
        return json(errorEnvelope("VALIDATION_ERROR", "modelId requerido", false), 400);
      }
      if (typeof text !== "string" || !text.trim() || text.length > 8000) {
        return json(errorEnvelope("VALIDATION_ERROR", "text requerido (1-8000)", false), 400);
      }
      const key = await aiKeys.get();
      if (!key) return json(errorEnvelope("VALIDATION_ERROR", "key no configurada: guárdala primero", false), 400);
      await server.usage.track(1, 0, 0);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120000);
      const upstreamBody: Record<string, unknown> = {
        model: modelId.trim(),
        messages: [{ role: "user", content: text }],
      };
      if (stream) {
        upstreamBody["stream"] = true;
        upstreamBody["stream_options"] = { include_usage: true };
      }
      try {
        const up = await fetch(`${GO_BASE}/openai/v1/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "x-opencode-session": sessionId || crypto.randomUUID(),
          },
          body: JSON.stringify(upstreamBody),
          signal: ctrl.signal,
        });
        if (up.status === 401) return json(errorEnvelope("UNAUTHORIZED", "key revocada o inválida (401)", false), 401);
        if (up.status === 403) return json(errorEnvelope("FORBIDDEN", "sin permiso (403)", false), 403);
        if (stream) {
          if (!up.ok || !up.body) {
            const detail = await up.text().catch(() => "");
            void detail;
            return json(errorEnvelope("VALIDATION_ERROR", `solicitud rechazada ${up.status}`, false), 502);
          }
          // Passthrough SSE: el navegador lee tokens en vivo. La key nunca sale al cliente.
          return new Response(up.body, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
        const data = (await up.text().then((t) => {
          try {
            return t ? (JSON.parse(t) as unknown) : null;
          } catch {
            return null;
          }
        }).catch(() => null)) as { choices?: Array<{ message?: { content?: unknown } }>; usage?: { cost?: unknown; total_tokens?: unknown } } | null;
        if (up.status === 429 || up.status >= 500) {
          return json(errorEnvelope("TEMPORARY_FAILURE", `transitorio ${up.status}`, true), 502);
        }
        if (!up.ok) return json(errorEnvelope("VALIDATION_ERROR", `solicitud rechazada ${up.status}`, false), 502);
        const out = typeof data?.choices?.[0]?.message?.content === "string" ? (data.choices[0].message.content as string).trim() : "";
        if (!out) return json(errorEnvelope("VALIDATION_ERROR", "respuesta vacía", false), 502);
        return json({ schemaVersion: SCHEMA_VERSION, text: out });
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return json(errorEnvelope("TEMPORARY_FAILURE", "timeout 120s", false), 504);
        return json(errorEnvelope("TEMPORARY_FAILURE", "fallo transitorio", true), 502);
      } finally {
        clearTimeout(timer);
      }
    }

    return json(errorEnvelope("VALIDATION_ERROR", "ruta no encontrada", false), 404);
  },
};

// Modelos tal cual los trae tu key: acepta {data:[...]} o {models:[...]} o array directo,
// items string o {id|modelId|slug|name} o anidados {model:{...}}. Sin hardcodear IDs.
function parseUpstreamModels(data: unknown): { id: string }[] {
  const raw = data as Record<string, unknown> | unknown[];
  const arr = Array.isArray(raw) ? raw : (raw?.["data"] ?? (raw as Record<string, unknown>)?.["models"]);
  if (!Array.isArray(arr)) return [];
  const out: { id: string }[] = [];
  for (const m of arr) {
    if (typeof m === "string") {
      if (m) out.push({ id: m });
      continue;
    }
    if (typeof m === "object" && m !== null) {
      const o = m as Record<string, unknown>;
      const inner = (o["model"] as Record<string, unknown> | undefined) ?? o;
      const id = inner["id"] ?? inner["modelId"] ?? inner["slug"] ?? inner["name"];
      if (typeof id === "string" && id) out.push({ id });
    }
  }
  return out;
}
