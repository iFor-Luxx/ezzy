// Auth propietario Fase 5 (piloto sintético): hash de owner_secret + allowlist instalaciones + revocación.
// Nunca guarda el secreto en claro. Sesión corta atada a installation_id.
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class AuthStore {
  ownerHash: string | null = null;
  installations = new Map<string, { enabled: boolean }>();
  async bootstrap(ownerSecret: string, installationId: string): Promise<boolean> {
    this.ownerHash = await sha256Hex(ownerSecret);
    this.installations.set(installationId, { enabled: true });
    return true;
  }

  async enroll(installationId: string, ownerSecret: string): Promise<boolean> {
    if (!this.ownerHash) return false;
    if ((await sha256Hex(ownerSecret)) !== this.ownerHash) return false;
    this.installations.set(installationId, { enabled: true });
    return true;
  }

  revoke(installationId: string): void {
    this.installations.set(installationId, { enabled: false });
  }

  isAuthorized(installationId: string): boolean {
    return this.installations.get(installationId)?.enabled === true;
  }

  enabledCount(): number {
    let n = 0;
    for (const i of this.installations.values()) if (i.enabled) n += 1;
    return n;
  }

  getOwnerHash(): string | null {
    return this.ownerHash;
  }
}

// Puerto que usa SyncServer: admite AuthStore en memoria (tests/piloto)
// o D1AuthStore persistente (prod). Así el PIN sobrevive reinicios del Worker.
export interface AuthPort {
  getOwnerHash(): string | null | Promise<string | null>;
  bootstrap(ownerSecret: string, installationId: string): boolean | Promise<boolean>;
  enroll(installationId: string, ownerSecret: string): boolean | Promise<boolean>;
  revoke(installationId: string): void | Promise<void>;
  isAuthorized(installationId: string): boolean | Promise<boolean>;
  enabledCount(): number | Promise<number>;
}

// Tipos mínimos estructurales de D1 (sin dependencia de workers-types).
export interface D1Result {
  results?: Record<string, unknown>[];
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all(): Promise<D1Result>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK (id = 1), hash TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS installations (id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1)",
];

// Auth persistente en D1: una sola fuente de verdad aunque Cloudflare
// recicle isolates. Nunca guarda el secreto, solo su hash SHA-256.
export class D1AuthStore implements AuthPort {
  private db: D1Database;
  private ready: Promise<void> | null = null;

  constructor(db: D1Database) {
    this.db = db;
  }

  private schema(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await this.db.batch(SCHEMA.map((q) => this.db.prepare(q)));
      })();
    }
    return this.ready;
  }

  async getOwnerHash(): Promise<string | null> {
    await this.schema();
    const row = await this.db.prepare("SELECT hash FROM owner WHERE id = 1").first<{ hash?: unknown }>();
    const h = row?.hash;
    return typeof h === "string" && h ? h : null;
  }

  // Crea al dueño solo si aún no existe. Devuelve false si otro secreto ya manda.
  async bootstrap(ownerSecret: string, installationId: string): Promise<boolean> {
    await this.schema();
    const hash = await sha256Hex(ownerSecret);
    await this.db.prepare("INSERT OR IGNORE INTO owner (id, hash) VALUES (1, ?)").bind(hash).run();
    const current = await this.getOwnerHash();
    if (current !== hash) return false;
    await this.db.prepare("INSERT OR REPLACE INTO installations (id, enabled) VALUES (?, 1)").bind(installationId).run();
    return true;
  }

  async enroll(installationId: string, ownerSecret: string): Promise<boolean> {
    await this.schema();
    const current = await this.getOwnerHash();
    if (!current) return false;
    if ((await sha256Hex(ownerSecret)) !== current) return false;
    await this.db.prepare("INSERT OR REPLACE INTO installations (id, enabled) VALUES (?, 1)").bind(installationId).run();
    return true;
  }

  async revoke(installationId: string): Promise<void> {
    await this.schema();
    await this.db.prepare("UPDATE installations SET enabled = 0 WHERE id = ?").bind(installationId).run();
  }

  async isAuthorized(installationId: string): Promise<boolean> {
    await this.schema();
    const row = await this.db.prepare("SELECT enabled FROM installations WHERE id = ?").bind(installationId).first<{ enabled?: unknown }>();
    return row?.enabled === 1;
  }

  async enabledCount(): Promise<number> {
    await this.schema();
    const row = await this.db.prepare("SELECT COUNT(*) AS n FROM installations WHERE enabled = 1").first<{ n?: unknown }>();
    return typeof row?.n === "number" ? row.n : 0;
  }
}
