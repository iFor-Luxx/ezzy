// Custodia server-side de la API key de OpenCode (write-only).
// La key NUNCA se expone: no sale en /v1/data, /v1/status, ni en errores/logs.
// Solo el Worker la lee en memoria para firmar el proxy hacia opencode.ai.
// D1 es la fuente de verdad (sobrevive reinicios); memoria para tests.
import type { D1Database } from "./auth";

export interface AiKeyStore {
  get(): Promise<string | null>;
  set(key: string): Promise<void>;
  has(): Promise<boolean>;
  clear(): Promise<void>;
  /** Fecha ISO de la última escritura, o null si no hay key. Nunca el valor. */
  updatedAt(): Promise<string | null>;
}

export function isValidAiKeyFormat(key: string): boolean {
  return typeof key === "string" && key.startsWith("oc_sk_") && key.length >= 20 && key.length <= 500;
}

export class MemoryAiKeyStore implements AiKeyStore {
  private key: string | null = null;
  private at: string | null = null;
  async get(): Promise<string | null> {
    return this.key;
  }
  async set(key: string): Promise<void> {
    if (!isValidAiKeyFormat(key)) throw new Error("formato esperado oc_sk_…");
    this.key = key;
    this.at = new Date().toISOString();
  }
  async has(): Promise<boolean> {
    return this.key !== null;
  }
  async clear(): Promise<void> {
    this.key = null;
    this.at = null;
  }
  async updatedAt(): Promise<string | null> {
    return this.at;
  }
}

const SCHEMA = ["CREATE TABLE IF NOT EXISTS ai_settings (id INTEGER PRIMARY KEY CHECK (id = 1), api_key TEXT NOT NULL, updated_at TEXT NOT NULL)"];

// D1: una sola fila (id=1). Nunca se lista ni se sincroniza: solo get/set internos.
export class D1AiKeyStore implements AiKeyStore {
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

  async get(): Promise<string | null> {
    await this.schema();
    const row = await this.db.prepare("SELECT api_key FROM ai_settings WHERE id = 1").first<{ api_key?: unknown }>();
    const v = row?.api_key;
    return typeof v === "string" && v ? v : null;
  }

  async set(key: string): Promise<void> {
    if (!isValidAiKeyFormat(key)) throw new Error("formato esperado oc_sk_…");
    await this.schema();
    await this.db
      .prepare("INSERT OR REPLACE INTO ai_settings (id, api_key, updated_at) VALUES (1, ?, ?)")
      .bind(key, new Date().toISOString())
      .run();
  }

  async has(): Promise<boolean> {
    return (await this.get()) !== null;
  }

  async clear(): Promise<void> {
    await this.schema();
    await this.db.prepare("DELETE FROM ai_settings WHERE id = 1").run();
  }

  async updatedAt(): Promise<string | null> {
    await this.schema();
    const row = await this.db.prepare("SELECT updated_at FROM ai_settings WHERE id = 1").first<{ updated_at?: unknown }>();
    const v = row?.updated_at;
    return typeof v === "string" && v ? v : null;
  }
}
