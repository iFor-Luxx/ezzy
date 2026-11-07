var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../packages/contracts/src/allowlist.ts
var SCHEMA_VERSION = 1;
var SYNCABLE_TYPES = [
  "product",
  "variant",
  "price",
  "promotion",
  "approved_message",
  "strategy",
  "faq",
  "knowledge_example",
  "extension_installation",
  "app_setting"
];
var ALLOWLIST = {
  product: ["id", "sku", "name", "category_id", "description", "fabric", "status", "created_at", "updated_at", "revision"],
  variant: ["id", "product_id", "label", "size", "color", "attributes", "attributes_json", "active", "revision"],
  price: ["id", "product_id", "variant_id", "amount_minor", "currency", "valid_from", "valid_to", "source", "verified_at", "revision"],
  promotion: ["id", "name", "rules", "rules_json", "starts_at", "ends_at", "status", "verified_at", "revision"],
  approved_message: ["id", "title", "body", "intent", "channel", "tags", "status", "verified_at", "revision", "command_alias"],
  strategy: ["id", "title", "body", "category", "status", "revision"],
  faq: ["id", "question", "answer", "source_refs", "status", "revision"],
  knowledge_example: ["id", "anonymized_text", "category", "approved_at", "provenance", "revision"],
  extension_installation: ["id", "user_label", "browser_family", "enrolled_at", "enabled"],
  app_setting: ["key", "value", "updated_at"]
};
var FORBIDDEN_KEY_RE = /(blob|image|video|audio|screenshot|secret|api_key|apikey|token|password|cookie|localstorage|path|route|file)/i;
var ABS_PATH_RE = /(^[A-Za-z]:\\|\/home\/|\/Users\/|file:\/\/|C:\\\\|\\\\\\\\)/;
var URL_RE = /^https?:\/\//i;
function hasForbiddenValue(v) {
  if (typeof v === "string") {
    if (ABS_PATH_RE.test(v)) return true;
    return false;
  }
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) return true;
  return false;
}
__name(hasForbiddenValue, "hasForbiddenValue");
function toSyncDto(entityType, entity) {
  if (!SYNCABLE_TYPES.includes(entityType))
    return { ok: false, reason: `tipo no sincronizable: ${entityType}` };
  const allowed = ALLOWLIST[entityType];
  for (const k of Object.keys(entity)) {
    if (!allowed.includes(k)) return { ok: false, reason: `campo no permitido: ${k}` };
    if (FORBIDDEN_KEY_RE.test(k)) return { ok: false, reason: `clave sensible: ${k}` };
  }
  const dto = {};
  for (const k of allowed) {
    const v = entity[k];
    if (v === void 0) continue;
    if (typeof v === "string" && hasForbiddenValue(v)) {
      if (!(entityType === "faq" && k === "source_refs")) return { ok: false, reason: `valor prohibido en ${k}` };
    }
    if (v instanceof Uint8Array || v instanceof ArrayBuffer)
      return { ok: false, reason: `binario prohibido en ${k}` };
    if (typeof v === "string" && URL_RE.test(v) && k !== "source" && k !== "provenance" && k !== "source_refs")
      return { ok: false, reason: `URL externa prohibida en ${k}` };
    if (v !== void 0) dto[k] = v;
  }
  if (entityType === "knowledge_example" && !dto["approved_at"])
    return { ok: false, reason: "knowledge_example sin approved_at" };
  if (entityType === "app_setting" && typeof dto["key"] === "string" && FORBIDDEN_KEY_RE.test(dto["key"]))
    return { ok: false, reason: "app_setting sensible" };
  return { ok: true, dto };
}
__name(toSyncDto, "toSyncDto");
var MAX_BATCH = 50;
var MAX_PAYLOAD_BYTES = 64 * 1024;
function checkBatchSize(items, payloadBytes) {
  if (items.length > MAX_BATCH) return { ok: false, reason: `lote >${MAX_BATCH}` };
  if (payloadBytes > MAX_PAYLOAD_BYTES) return { ok: false, reason: "payload >64KB" };
  return { ok: true };
}
__name(checkBatchSize, "checkBatchSize");

// src/quota_guard.ts
var FREE_CAPS = { workersReqDay: 1e5, d1ReadsDay: 5e6, d1WritesDay: 1e5 };
function evalQuota(used, known) {
  if (!known) return { allow: false, code: "COST_GUARD_BLOCKED" };
  const r = [used.req / FREE_CAPS.workersReqDay, used.reads / FREE_CAPS.d1ReadsDay, used.writes / FREE_CAPS.d1WritesDay];
  const max = Math.max(...r);
  if (max >= 0.7) return { allow: false, code: "QUOTA_BLOCKED", reset: "00:00Z" };
  return { allow: true };
}
__name(evalQuota, "evalQuota");

// src/status.ts
function warnRatio(used) {
  return Math.max(
    used.req / FREE_CAPS.workersReqDay,
    used.reads / FREE_CAPS.d1ReadsDay,
    used.writes / FREE_CAPS.d1WritesDay
  );
}
__name(warnRatio, "warnRatio");

// ../../packages/sync-client/src/protocol.ts
function detectSyncConflict(base, localRev, remoteRev) {
  return localRev > base && remoteRev > base && localRev !== remoteRev;
}
__name(detectSyncConflict, "detectSyncConflict");
function errorEnvelope(code, message, retryable) {
  return { schemaVersion: 1, error: { code, message, retryable, correlationId: crypto.randomUUID() } };
}
__name(errorEnvelope, "errorEnvelope");

// src/server.ts
function encodeCursor(i) {
  const bytes = new TextEncoder().encode(JSON.stringify({ i, v: 1 }));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(encodeCursor, "encodeCursor");
function decodeCursor(cursor) {
  try {
    const b64 = cursor.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    return typeof o.i === "number" && o.i >= 0 ? Math.floor(o.i) : 0;
  } catch {
    return 0;
  }
}
__name(decodeCursor, "decodeCursor");
var SyncServer = class {
  static {
    __name(this, "SyncServer");
  }
  data = /* @__PURE__ */ new Map();
  seenKeys = /* @__PURE__ */ new Set();
  log = [];
  auth;
  quotaKnown = true;
  used = { req: 0, reads: 0, writes: 0 };
  /** Plan declarado al desplegar + fecha de verificación manual. Sin esto, el panel lo muestra "sin verificar". */
  plan = "free";
  planVerifiedAt = null;
  constructor(auth) {
    this.auth = auth;
  }
  setPlanVerified(atIso) {
    this.planVerifiedAt = atIso;
  }
  /** Estado para el panel: uso vs topes, cuota y conteos. Sin secretos. */
  async status() {
    const q = evalQuota(this.used, this.quotaKnown);
    return {
      schemaVersion: 1,
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      plan: this.plan,
      planVerifiedAt: this.planVerifiedAt,
      used: { ...this.used },
      caps: { ...FREE_CAPS },
      quota: { warnRatio: warnRatio(this.used), blocked: !q.allow, code: q.code },
      entities: this.data.size,
      installations: await this.auth.enabledCount()
    };
  }
  k(t, id) {
    return `${t}:${id}`;
  }
  async push(input) {
    this.used.req += 1;
    if (!await this.auth.isAuthorized(input.installationId))
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "UNAUTHORIZED", message: "no enrolado o revocado", retryable: false } } };
    if (input.schemaVersion !== SCHEMA_VERSION)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "UNSUPPORTED_SCHEMA", message: "schema no soportado", retryable: false } } };
    const q = evalQuota(this.used, this.quotaKnown);
    if (!q.allow)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: q.code, message: "bloqueado por cuota/costo", retryable: false } } };
    const size = checkBatchSize(input.changes, JSON.stringify(input.changes).length);
    if (!size.ok)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "TOO_LARGE", message: size.reason, retryable: false } } };
    const applied = [];
    const conflicts = [];
    for (const c of input.changes) {
      if (this.seenKeys.has(c.idempotencyKey)) {
        applied.push(c.idempotencyKey);
        continue;
      }
      if (c.operation === "upsert") {
        const s = toSyncDto(c.entity_type, { ...c.payload, revision: c.revision });
        if (!s.ok) return { applied, conflicts, error: { schemaVersion: 1, error: { code: "VALIDATION_ERROR", message: s.reason, retryable: false } } };
        const cur = this.data.get(this.k(c.entity_type, c.entity_id));
        const remoteRev = cur?.revision ?? 0;
        if (cur && detectSyncConflict(c.base_revision, c.revision, remoteRev)) {
          conflicts.push({ entity_type: c.entity_type, entity_id: c.entity_id });
          continue;
        }
        this.data.set(this.k(c.entity_type, c.entity_id), { revision: c.revision, dto: s.dto, deleted: false });
        this.used.writes += 1;
      } else {
        this.data.set(this.k(c.entity_type, c.entity_id), { revision: c.revision, dto: null, deleted: true });
        this.used.writes += 1;
      }
      this.seenKeys.add(c.idempotencyKey);
      this.log.push({ key: c.idempotencyKey, index: this.log.length });
      applied.push(c.idempotencyKey);
    }
    return { applied, conflicts };
  }
  /** Lista completa para el panel (ver/editar/eliminar). Requiere instalación enrolada. */
  list() {
    return [...this.data.entries()].map(([k, v]) => {
      const i = k.indexOf(":");
      return { entity_type: k.slice(0, i), entity_id: k.slice(i + 1), revision: v.revision, deleted: v.deleted, dto: v.dto };
    });
  }
  pull(cursor) {
    this.used.req += 1;
    this.used.reads += 1;
    let idx = 0;
    if (cursor) {
      idx = decodeCursor(cursor);
    }
    void idx;
    const changes = [...this.data.entries()].map(([k, v]) => {
      const [entity_type, entity_id] = k.split(":");
      return { entity_type, entity_id, revision: v.revision, deleted: v.deleted };
    });
    const next = encodeCursor(this.log.length);
    return { cursor: next, changes };
  }
};

// src/auth.ts
async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
var AuthStore = class {
  static {
    __name(this, "AuthStore");
  }
  ownerHash = null;
  installations = /* @__PURE__ */ new Map();
  async bootstrap(ownerSecret, installationId) {
    this.ownerHash = await sha256Hex(ownerSecret);
    this.installations.set(installationId, { enabled: true });
    return true;
  }
  async enroll(installationId, ownerSecret) {
    if (!this.ownerHash) return false;
    if (await sha256Hex(ownerSecret) !== this.ownerHash) return false;
    this.installations.set(installationId, { enabled: true });
    return true;
  }
  revoke(installationId) {
    this.installations.set(installationId, { enabled: false });
  }
  isAuthorized(installationId) {
    return this.installations.get(installationId)?.enabled === true;
  }
  enabledCount() {
    let n = 0;
    for (const i of this.installations.values()) if (i.enabled) n += 1;
    return n;
  }
  getOwnerHash() {
    return this.ownerHash;
  }
};
var SCHEMA = [
  "CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK (id = 1), hash TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS installations (id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1)"
];
var D1AuthStore = class {
  static {
    __name(this, "D1AuthStore");
  }
  db;
  ready = null;
  constructor(db) {
    this.db = db;
  }
  schema() {
    if (!this.ready) {
      this.ready = (async () => {
        await this.db.batch(SCHEMA.map((q) => this.db.prepare(q)));
      })();
    }
    return this.ready;
  }
  async getOwnerHash() {
    await this.schema();
    const row = await this.db.prepare("SELECT hash FROM owner WHERE id = 1").first();
    const h = row?.hash;
    return typeof h === "string" && h ? h : null;
  }
  // Crea al dueño solo si aún no existe. Devuelve false si otro secreto ya manda.
  async bootstrap(ownerSecret, installationId) {
    await this.schema();
    const hash = await sha256Hex(ownerSecret);
    await this.db.prepare("INSERT OR IGNORE INTO owner (id, hash) VALUES (1, ?)").bind(hash).run();
    const current = await this.getOwnerHash();
    if (current !== hash) return false;
    await this.db.prepare("INSERT OR REPLACE INTO installations (id, enabled) VALUES (?, 1)").bind(installationId).run();
    return true;
  }
  async enroll(installationId, ownerSecret) {
    await this.schema();
    const current = await this.getOwnerHash();
    if (!current) return false;
    if (await sha256Hex(ownerSecret) !== current) return false;
    await this.db.prepare("INSERT OR REPLACE INTO installations (id, enabled) VALUES (?, 1)").bind(installationId).run();
    return true;
  }
  async revoke(installationId) {
    await this.schema();
    await this.db.prepare("UPDATE installations SET enabled = 0 WHERE id = ?").bind(installationId).run();
  }
  async isAuthorized(installationId) {
    await this.schema();
    const row = await this.db.prepare("SELECT enabled FROM installations WHERE id = ?").bind(installationId).first();
    return row?.enabled === 1;
  }
  async enabledCount() {
    await this.schema();
    const row = await this.db.prepare("SELECT COUNT(*) AS n FROM installations WHERE enabled = 1").first();
    return typeof row?.n === "number" ? row.n : 0;
  }
};

// src/worker.ts
var memAuth = new AuthStore();
var memServer = new SyncServer(memAuth);
var servers = /* @__PURE__ */ new WeakMap();
function getServer(env) {
  const db = env?.EZZY_DB;
  if (!db) return memServer;
  let s = servers.get(db);
  if (!s) {
    s = new SyncServer(new D1AuthStore(db));
    servers.set(db, s);
  }
  return s;
}
__name(getServer, "getServer");
function getAuth(server) {
  return server.auth;
}
__name(getAuth, "getAuth");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,x-ezzy-installation"
    }
  });
}
__name(json, "json");
async function authorizedId(req, auth) {
  const id = req.headers.get("x-ezzy-installation")?.trim();
  return id && await auth.isAuthorized(id) ? id : null;
}
__name(authorizedId, "authorizedId");
async function readJson(req) {
  try {
    const b = await req.json();
    return typeof b === "object" && b !== null ? b : null;
  } catch {
    return null;
  }
}
__name(readJson, "readJson");
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const server = getServer(env);
    const auth = getAuth(server);
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,x-ezzy-installation",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (req.method === "POST" && path === "/v1/enroll") {
      const body = await readJson(req);
      const installationId2 = body?.["installationId"];
      const ownerSecret = body?.["ownerSecret"];
      if (typeof installationId2 !== "string" || !installationId2 || typeof ownerSecret !== "string" || !ownerSecret) {
        return json(errorEnvelope("VALIDATION_ERROR", "installationId y ownerSecret requeridos", false), 400);
      }
      let ok;
      if (!await auth.getOwnerHash()) {
        ok = await auth.bootstrap(ownerSecret, installationId2);
      } else {
        ok = await auth.enroll(installationId2, ownerSecret);
      }
      if (!ok) return json(errorEnvelope("FORBIDDEN", "secreto incorrecto", false), 403);
      return json({ schemaVersion: SCHEMA_VERSION, ok: true });
    }
    if (req.method === "GET" && path === "/v1/status") {
      return json(await server.status());
    }
    const installationId = await authorizedId(req, auth);
    if (!installationId) {
      return json(errorEnvelope("UNAUTHORIZED", "instalaci\xF3n no enrolada o revocada (header x-ezzy-installation)", false), 401);
    }
    if (req.method === "GET" && path === "/v1/data") {
      return json({ schemaVersion: SCHEMA_VERSION, data: server.list() });
    }
    if (req.method === "POST" && path === "/v1/sync/push") {
      const body = await readJson(req);
      if (!Array.isArray(body?.["changes"])) {
        return json(errorEnvelope("VALIDATION_ERROR", "changes requerido", false), 400);
      }
      const out = await server.push({
        installationId,
        schemaVersion: typeof body?.["schemaVersion"] === "number" ? body?.["schemaVersion"] : SCHEMA_VERSION,
        changes: body?.["changes"]
      });
      return json({ schemaVersion: SCHEMA_VERSION, ...out });
    }
    if (req.method === "GET" && path === "/v1/sync/pull") {
      return json({ schemaVersion: SCHEMA_VERSION, ...server.pull(url.searchParams.get("cursor") ?? void 0) });
    }
    return json(errorEnvelope("VALIDATION_ERROR", "ruta no encontrada", false), 404);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
