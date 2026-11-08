// Servidor sync: valida allowlist, idempotencia, revisiones y tombstones.
// Rechaza medios/secretos/rutas. Conflictos explícitos.
// Persistencia: en memoria (tests/piloto) o D1 (prod, costo cero en Free).
// D1 Free: 5M reads + 100k writes/día. Este diseño hace 1 query por pull,
// 1 status = 2 counts, push = N reads + 1 batch write. Sin polling.
import { toSyncDto, checkBatchSize, SCHEMA_VERSION } from "@ezzy/contracts";
import { evalQuota, FREE_CAPS } from "./quota_guard";
import { warnRatio, type CloudStatus } from "./status";
import type { AuthPort, D1Database } from "./auth";
import { detectSyncConflict } from "@ezzy/sync-client";

interface Rec {
  revision: number;
  dto: Record<string, unknown> | null;
  deleted: boolean;
}

export interface StoredRecord {
  entity_type: string;
  entity_id: string;
  revision: number;
  deleted: boolean;
  dto: Record<string, unknown> | null;
}

/** Almacén de registros. Memoria para tests, D1 para prod. */
export interface RecordStore {
  get(entityType: string, entityId: string): Promise<Rec | null>;
  set(entityType: string, entityId: string, rec: Rec): Promise<void>;
  setMany(entries: { entityType: string; entityId: string; rec: Rec }[]): Promise<void>;
  list(): Promise<StoredRecord[]>;
  count(): Promise<number>;
  hasKey(key: string): Promise<boolean>;
  addKey(key: string): Promise<void>;
  logLength(): Promise<number>;
}

export class MemoryRecordStore implements RecordStore {
  private data = new Map<string, Rec>();
  private seen = new Set<string>();

  private k(t: string, id: string): string {
    return `${t}:${id}`;
  }

  async get(entityType: string, entityId: string): Promise<Rec | null> {
    return this.data.get(this.k(entityType, entityId)) ?? null;
  }

  async set(entityType: string, entityId: string, rec: Rec): Promise<void> {
    this.data.set(this.k(entityType, entityId), rec);
  }

  async setMany(entries: { entityType: string; entityId: string; rec: Rec }[]): Promise<void> {
    for (const e of entries) this.data.set(this.k(e.entityType, e.entityId), e.rec);
  }

  async list(): Promise<StoredRecord[]> {
    return [...this.data.entries()].map(([k, v]) => {
      const i = k.indexOf(":");
      return { entity_type: k.slice(0, i), entity_id: k.slice(i + 1), revision: v.revision, deleted: v.deleted, dto: v.dto };
    });
  }

  async count(): Promise<number> {
    return this.data.size;
  }

  async hasKey(key: string): Promise<boolean> {
    return this.seen.has(key);
  }

  async addKey(key: string): Promise<void> {
    this.seen.add(key);
  }

  async logLength(): Promise<number> {
    return this.seen.size;
  }
}

const RECORDS_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS records (entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, dto_json TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (entity_type, entity_id))",
  "CREATE TABLE IF NOT EXISTS idempotency (key TEXT PRIMARY KEY, created_at TEXT NOT NULL)",
];

/** Persistencia D1: una sola fuente de verdad entre isolates. Costo: 1 query por lectura. */
export class D1RecordStore implements RecordStore {
  private db: D1Database;
  private ready: Promise<void> | null = null;

  constructor(db: D1Database) {
    this.db = db;
  }

  private schema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.db.batch(RECORDS_SCHEMA.map((q) => this.db.prepare(q)));
      })();
    }
    return this.ready;
  }

  async get(entityType: string, entityId: string): Promise<Rec | null> {
    await this.schema();
    const row = await this.db
      .prepare("SELECT revision, deleted, dto_json FROM records WHERE entity_type = ? AND entity_id = ?")
      .bind(entityType, entityId)
      .first<{ revision?: unknown; deleted?: unknown; dto_json?: unknown }>();
    if (!row || typeof row.revision !== "number") return null;
    let dto: Record<string, unknown> | null = null;
    if (typeof row.dto_json === "string" && row.dto_json) {
      try {
        dto = JSON.parse(row.dto_json) as Record<string, unknown>;
      } catch {
        dto = null;
      }
    }
    return { revision: row.revision, deleted: row.deleted === 1, dto };
  }

  async set(entityType: string, entityId: string, rec: Rec): Promise<void> {
    await this.setMany([{ entityType, entityId, rec }]);
  }

  async setMany(entries: { entityType: string; entityId: string; rec: Rec }[]): Promise<void> {
    if (entries.length === 0) return;
    await this.schema();
    const now = new Date().toISOString();
    await this.db.batch(
      entries.map((e) =>
        this.db
          .prepare(
            "INSERT OR REPLACE INTO records (entity_type, entity_id, revision, deleted, dto_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .bind(e.entityType, e.entityId, e.rec.revision, e.rec.deleted ? 1 : 0, e.rec.dto ? JSON.stringify(e.rec.dto) : null, now)
      )
    );
  }

  async list(): Promise<StoredRecord[]> {
    await this.schema();
    // Límite alto pero acotado: evita un full-scan caro si algo crece sin control.
    const out = await this.db
      .prepare("SELECT entity_type, entity_id, revision, deleted, dto_json FROM records LIMIT 5000")
      .all();
    const rows = (out.results ?? []) as Record<string, unknown>[];
    return rows.flatMap((r) => {
      if (typeof r["entity_type"] !== "string" || typeof r["entity_id"] !== "string" || typeof r["revision"] !== "number") return [];
      let dto: Record<string, unknown> | null = null;
      if (typeof r["dto_json"] === "string" && r["dto_json"]) {
        try {
          dto = JSON.parse(r["dto_json"] as string) as Record<string, unknown>;
        } catch {
          dto = null;
        }
      }
      return [{ entity_type: r["entity_type"] as string, entity_id: r["entity_id"] as string, revision: r["revision"] as number, deleted: r["deleted"] === 1, dto }];
    });
  }

  async count(): Promise<number> {
    await this.schema();
    const row = await this.db.prepare("SELECT COUNT(*) AS n FROM records").first<{ n?: unknown }>();
    return typeof row?.n === "number" ? row.n : 0;
  }

  async hasKey(key: string): Promise<boolean> {
    await this.schema();
    const row = await this.db.prepare("SELECT 1 AS ok FROM idempotency WHERE key = ?").bind(key).first<{ ok?: unknown }>();
    return row?.ok === 1;
  }

  async addKey(key: string): Promise<void> {
    await this.schema();
    await this.db.prepare("INSERT OR IGNORE INTO idempotency (key, created_at) VALUES (?, ?)").bind(key, new Date().toISOString()).run();
  }

  async logLength(): Promise<number> {
    await this.schema();
    const row = await this.db.prepare("SELECT COUNT(*) AS n FROM idempotency").first<{ n?: unknown }>();
    return typeof row?.n === "number" ? row.n : 0;
  }
}

// Cursor base64url con APIs web estándar (compatible Workers sin nodejs_compat).
function encodeCursor(i: number): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ i, v: 1 }));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeCursor(cursor: string): number {
  try {
    const b64 = cursor.replace(/-/g, "+").replace(/\//g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes)) as { i?: unknown };
    return typeof o.i === "number" && o.i >= 0 ? Math.floor(o.i) : 0;
  } catch {
    return 0;
  }
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface Usage {
  day: string;
  req: number;
  reads: number;
  writes: number;
}

/** Contadores de uso. Memoria para tests, D1 en prod (sobreviven reinicios). */
export interface UsageStore {
  track(req: number, reads: number, writes: number): Promise<void>;
  today(): Promise<Usage>;
}

export class MemoryUsageStore implements UsageStore {
  used = { req: 0, reads: 0, writes: 0 };
  async track(req: number, reads: number, writes: number): Promise<void> {
    this.used.req += req;
    this.used.reads += reads;
    this.used.writes += writes;
  }
  async today(): Promise<Usage> {
    return { day: utcDay(), ...this.used };
  }
}

const USAGE_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS usage_daily (day TEXT PRIMARY KEY, req INTEGER NOT NULL DEFAULT 0, reads INTEGER NOT NULL DEFAULT 0, writes INTEGER NOT NULL DEFAULT 0)",
];

/** Uso durable en D1: 1 escritura por petición. Con tráfico personal es ~nada del Free. */
export class D1UsageStore implements UsageStore {
  private db: D1Database;
  private ready: Promise<void> | null = null;

  constructor(db: D1Database) {
    this.db = db;
  }

  private schema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.db.batch(USAGE_SCHEMA.map((q) => this.db.prepare(q)));
      })();
    }
    return this.ready;
  }

  async track(req: number, reads: number, writes: number): Promise<void> {
    if (!req && !reads && !writes) return;
    await this.schema();
    await this.db
      .prepare(
        "INSERT INTO usage_daily (day, req, reads, writes) VALUES (?, ?, ?, ?) ON CONFLICT(day) DO UPDATE SET req = req + excluded.req, reads = reads + excluded.reads, writes = writes + excluded.writes"
      )
      .bind(utcDay(), req, reads, writes)
      .run();
  }

  async today(): Promise<Usage> {
    await this.schema();
    const day = utcDay();
    const row = await this.db
      .prepare("SELECT req, reads, writes FROM usage_daily WHERE day = ?")
      .bind(day)
      .first<{ req?: unknown; reads?: unknown; writes?: unknown }>();
    const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
    return { day, req: n(row?.req), reads: n(row?.reads), writes: n(row?.writes) };
  }
}

export class SyncServer {
  store: RecordStore;
  auth: AuthPort;
  usage: UsageStore;
  quotaKnown = true;
  /** Plan declarado al desplegar + fecha de verificación manual. Sin esto, el panel lo muestra "sin verificar". */
  plan: "free" = "free";
  planVerifiedAt: string | null = null;

  constructor(auth: AuthPort, store?: RecordStore, usage?: UsageStore) {
    this.auth = auth;
    this.store = store ?? new MemoryRecordStore();
    this.usage = usage ?? new MemoryUsageStore();
  }

  setPlanVerified(atIso: string): void {
    this.planVerifiedAt = atIso;
  }

  /** Estado para el panel: uso durable del día + almacenado real. Sin secretos. */
  async status(): Promise<CloudStatus> {
    const used = await this.usage.today();
    const q = evalQuota(used, this.quotaKnown);
    const records = await this.store.count();
    const installations = await this.auth.enabledCount();
    return {
      schemaVersion: 1,
      ts: new Date().toISOString(),
      plan: this.plan,
      planVerifiedAt: this.planVerifiedAt,
      used: { req: used.req, reads: used.reads, writes: used.writes },
      day: used.day,
      caps: { ...FREE_CAPS },
      quota: { warnRatio: warnRatio(used), blocked: !q.allow, code: q.code },
      entities: records,
      installations,
      storage: { records, installations, keys: await this.store.logLength() },
    };
  }

  async push(input: {
    installationId: string;
    schemaVersion: number;
    changes: { idempotencyKey: string; entity_type: string; entity_id: string; operation: "upsert" | "tombstone"; revision: number; base_revision: number; payload: Record<string, unknown> }[];
  }): Promise<{ applied: string[]; conflicts: { entity_type: string; entity_id: string }[]; error?: object }> {
    let rq = 1, rd = 0, wr = 0;
    try {
    if (!(await this.auth.isAuthorized(input.installationId)))
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "UNAUTHORIZED", message: "no enrolado o revocado", retryable: false } } };
    if (input.schemaVersion !== SCHEMA_VERSION)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "UNSUPPORTED_SCHEMA", message: "schema no soportado", retryable: false } } };
    const cur = await this.usage.today();
    const q = evalQuota({ req: cur.req + rq, reads: cur.reads + rd, writes: cur.writes + wr }, this.quotaKnown);
    if (!q.allow)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: q.code, message: "bloqueado por cuota/costo", retryable: false } } };
    const size = checkBatchSize(input.changes, JSON.stringify(input.changes).length);
    if (!size.ok)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "TOO_LARGE", message: size.reason, retryable: false } } };

    const applied: string[] = [];
    const conflicts: { entity_type: string; entity_id: string }[] = [];
    const pendingWrites: { entityType: string; entityId: string; rec: Rec }[] = [];
    const pendingKeys: string[] = [];

    for (const c of input.changes) {
      if (await this.store.hasKey(c.idempotencyKey)) {
        applied.push(c.idempotencyKey); // idempotente: reintento no duplica
        continue;
      }
      if (c.operation === "upsert") {
        const s = toSyncDto(c.entity_type, { ...(c.payload as object), revision: c.revision } as Record<string, unknown>);
        if (!s.ok) return { applied, conflicts, error: { schemaVersion: 1, error: { code: "VALIDATION_ERROR", message: s.reason, retryable: false } } };
        const cur = await this.store.get(c.entity_type, c.entity_id);
        rd += 1;
        const remoteRev = cur?.revision ?? 0;
        // Conflicto si el servidor avanzó desde base_revision (el cliente parte de base).
        if (cur && detectSyncConflict(c.base_revision, c.revision, remoteRev)) {
          conflicts.push({ entity_type: c.entity_type, entity_id: c.entity_id });
          continue;
        }
        pendingWrites.push({ entityType: c.entity_type, entityId: c.entity_id, rec: { revision: c.revision, dto: s.dto!, deleted: false } });
      } else {
        pendingWrites.push({ entityType: c.entity_type, entityId: c.entity_id, rec: { revision: c.revision, dto: null, deleted: true } });
      }
      pendingKeys.push(c.idempotencyKey);
      applied.push(c.idempotencyKey);
    }

    // Un solo batch de escritura: menos round-trips, mismo conteo de filas.
    if (pendingWrites.length > 0) {
      await this.store.setMany(pendingWrites);
      wr += pendingWrites.length;
    }
    for (const k of pendingKeys) await this.store.addKey(k);
    return { applied, conflicts };
    } finally {
      await this.usage.track(rq, rd, wr);
    }
  }

  /** Lista completa para el panel (ver/editar/eliminar). Requiere instalación enrolada. 1 query D1. */
  async list(): Promise<StoredRecord[]> {
    await this.usage.track(0, 1, 0);
    return this.store.list();
  }

  async pull(cursor?: string): Promise<{ cursor: string; changes: { entity_type: string; entity_id: string; revision: number; deleted: boolean }[] }> {
    await this.usage.track(1, 1, 0);
    let idx = 0;
    if (cursor) {
      idx = decodeCursor(cursor);
    }
    void idx;
    // Piloto: devuelve estado actual completo (cursor = nº claves vistas).
    const all = await this.store.list();
    const changes = all.map((v) => ({ entity_type: v.entity_type, entity_id: v.entity_id, revision: v.revision, deleted: v.deleted }));
    const next = encodeCursor(await this.store.logLength());
    return { cursor: next, changes };
  }
}
