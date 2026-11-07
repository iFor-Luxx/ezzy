// @ezzy/storage — repos locales. IndexedDB en navegador, memoria en tests/bun.
// Migraciones versionadas + backup/export local (sin medios).
export const STORAGE_VERSION = 4;

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export interface Migration {
  version: number;
  name: string;
  migrate: (db: Record<string, Record<string, unknown>>) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "init catalogo + mensajes",
    migrate: (db) => {
      db["products"] ??= {};
      db["variants"] ??= {};
      db["prices"] ??= {};
      db["promotions"] ??= {};
      db["approved_messages"] ??= {};
    },
  },
  {
    version: 2,
    name: "estrategias + faqs + knowledge",
    migrate: (db) => {
      db["strategies"] ??= {};
      db["faqs"] ??= {};
      db["knowledge_examples"] ??= {};
    },
  },
  {
    version: 3,
    name: "outbox + auditoria + settings",
    migrate: (db) => {
      db["sync_outbox"] ??= {};
      db["audit_events"] ??= {};
      db["app_settings"] ??= {};
    },
  },
  {
    version: 4,
    name: "temporales contexto + auditoria consentimiento (Fase 3)",
    migrate: (db) => {
      db["temp_contexts"] ??= {};
      db["consent_audits"] ??= {};
    },
  },
];

export function migrateDb(db: Record<string, Record<string, unknown>>, fromVersion: number): number {
  let v = fromVersion;
  for (const m of MIGRATIONS.sort((a, b) => a.version - b.version)) {
    if (m.version > v) {
      m.migrate(db);
      v = m.version;
    }
  }
  return v;
}

export class MemoryStore {
  tables: Record<string, Map<string, Record<string, unknown>>> = {};
  version = 0;

  constructor() {
    const db: Record<string, Record<string, unknown>> = {};
    this.version = migrateDb(db, 0);
    for (const [k, v] of Object.entries(db)) this.tables[k] = new Map<string, Record<string, unknown>>(Object.entries(v) as [string, Record<string, unknown>][]);
  }

  table(name: string): Map<string, Record<string, unknown>> {
    if (!this.tables[name]) this.tables[name] = new Map<string, Record<string, unknown>>();
    return this.tables[name]!;
  }

  put(table: string, id: string, row: Record<string, unknown>): void {
    this.table(table).set(id, { ...row, id, updated_at: new Date().toISOString() });
  }

  get(table: string, id: string): Record<string, unknown> | undefined {
    return this.table(table).get(id);
  }

  list(table: string): Record<string, unknown>[] {
    return [...this.table(table).values()];
  }

  remove(table: string, id: string): void {
    this.table(table).delete(id);
  }

  exportLocal(): { version: number; exported_at: string; tables: Tables } {
    const tables: Tables = {};
    for (const [name, map] of Object.entries(this.tables)) {
      // Exclusión obligatoria: nunca exportar outbox crudo sensible ni medios (Fase 1: marca).
      tables[name] = [...map.values()];
    }
    return { version: this.version, exported_at: new Date().toISOString(), tables };
  }

  importLocal(backup: { version: number; tables: Tables }): void {
    if (backup.version > STORAGE_VERSION) throw new Error("backup de versión futura no soportado");
    for (const [name, rows] of Object.entries(backup.tables)) {
      // Temporales nunca se restauran: son efímeros por sesión.
      if (name === "temp_contexts") continue;
      const t = this.table(name);
      for (const r of rows) {
        const id = r["id"] as string;
        if (typeof id === "string") t.set(id, r);
      }
    }
  }

  // Temporales Fase 3: contexto efímero con TTL + borrado explícito al cancelar.
  putTemporal(id: string, kind: "context" | "consent-preview", ttlMs = 15 * 60 * 1000, now = Date.now()): void {
    this.table("temp_contexts").set(id, { id, kind, created_at: new Date(now).toISOString(), expires_at: new Date(now + ttlMs).toISOString() });
  }

  purgeExpiredTemporals(now = Date.now()): number {
    let n = 0;
    for (const [id, row] of this.table("temp_contexts")) {
      if (Date.parse(String(row["expires_at"] ?? 0)) <= now) {
        this.table("temp_contexts").delete(id);
        n += 1;
      }
    }
    return n;
  }

  wipeTemporals(): number {
    const n = this.table("temp_contexts").size;
    this.table("temp_contexts").clear();
    return n;
  }

  // Auditoría consentimiento: solo metadatos seguros, nunca texto crudo.
  auditConsent(action: string, entityRef: string, outcome: string): void {
    this.table("consent_audits").set(crypto.randomUUID(), {
      id: crypto.randomUUID(), action, entity_ref: entityRef, timestamp: new Date().toISOString(), outcome,
    });
  }
}

// Tablas que jamás se sincronizan (efímeras/sensibles).
export const NEVER_SYNC_TABLES = ["temp_contexts", "sync_outbox", "audit_events", "consent_audits"];

export function buildBackupFilename(at = new Date()): string {
  return `ezzy-backup-${at.toISOString().slice(0, 10)}.json`;
}
