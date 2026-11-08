import { describe, expect, test } from "bun:test";
import { SyncServer, D1RecordStore, D1UsageStore } from "./server";
import { D1AuthStore, type D1Database } from "./auth";

// Mock D1 mínimo: Misma semántica que SQLite para nuestras queries.
function mockDb(): D1Database {
  const records = new Map<string, { revision: number; deleted: number; dto_json: string | null }>();
  const keys = new Set<string>();
  const usage = new Map<string, { req: number; reads: number; writes: number }>();
  let owner: string | null = null;
  const inst = new Map<string, number>();
  const stmt = (q: string, params: unknown[] = []) => ({
    bind(...v: unknown[]) {
      return stmt(q, v);
    },
    async first<T>() {
      if (q.includes("FROM records WHERE")) {
        const r = records.get(`${params[0]}:${params[1]}`);
        return (r ? { revision: r.revision, deleted: r.deleted, dto_json: r.dto_json } : null) as T;
      }
      if (q.includes("FROM idempotency WHERE")) {
        return (keys.has(params[0] as string) ? { ok: 1 } : null) as T;
      }
      if (q.includes("FROM owner WHERE")) return (owner ? { hash: owner } : null) as T;
      if (q.includes("FROM installations WHERE id")) {
        const e = inst.get(params[0] as string);
        return (e === undefined ? null : { enabled: e }) as T;
      }
      if (q.includes("COUNT(*) AS n FROM records")) return { n: records.size } as T;
      if (q.includes("COUNT(*) AS n FROM idempotency")) return { n: keys.size } as T;
      if (q.includes("FROM usage_daily WHERE day")) {
        const u = usage.get(params[0] as string);
        return (u ? { req: u.req, reads: u.reads, writes: u.writes } : null) as T;
      }
      if (q.includes("FROM installations WHERE enabled")) {
        let n = 0;
        for (const v of inst.values()) if (v === 1) n++;
        return { n } as T;
      }
      return null as T;
    },
    async all() {
      if (q.includes("FROM records")) {
        return {
          results: [...records.entries()].map(([k, r]) => {
            const i = k.indexOf(":");
            return { entity_type: k.slice(0, i), entity_id: k.slice(i + 1), revision: r.revision, deleted: r.deleted, dto_json: r.dto_json };
          }),
        };
      }
      return { results: [] };
    },
    async run() {
      if (q.startsWith("INSERT OR REPLACE INTO records")) {
        records.set(`${params[0]}:${params[1]}`, { revision: params[2] as number, deleted: params[3] as number, dto_json: (params[4] as string | null) ?? null });
      } else if (q.startsWith("INSERT OR IGNORE INTO idempotency")) {
        keys.add(params[0] as string);
      } else if (q.startsWith("INSERT INTO usage_daily")) {
        const day = params[0] as string;
        const u = usage.get(day) ?? { req: 0, reads: 0, writes: 0 };
        u.req += params[1] as number;
        u.reads += params[2] as number;
        u.writes += params[3] as number;
        usage.set(day, u);
      } else if (q.startsWith("INSERT OR IGNORE INTO owner")) {
        if (!owner) owner = params[0] as string;
      } else if (q.startsWith("INSERT OR REPLACE INTO installations")) {
        inst.set(params[0] as string, 1);
      } else if (q.startsWith("UPDATE installations")) {
        inst.set(params[0] as string, 0);
      }
      return {};
    },
  });
  return {
    prepare(q: string) {
      return stmt(q) as unknown as ReturnType<D1Database["prepare"]>;
    },
    async batch(statements: { run(): Promise<unknown> }[]) {
      for (const s of statements) await s.run();
      return [];
    },
  } as unknown as D1Database;
}

describe("D1 persistente (costo cero)", () => {
  test("dos isolates comparten datos: PC-A escribe, PC-B lee", async () => {
    const db = mockDb();
    const a = new SyncServer(new D1AuthStore(db), new D1RecordStore(db), new D1UsageStore(db));
    await a.auth.bootstrap("pin-1234", "pc-a");
    const push = await a.push({
      installationId: "pc-a", schemaVersion: 1,
      changes: [
        { idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p1", name: "Polo", brand: "EZZETA" } },
        { idempotencyKey: "k2", entity_type: "price", entity_id: "pr1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "pr1", product_id: "p1", amount_minor: 4990, currency: "PEN" } },
      ],
    });
    expect(push.error).toBeUndefined();
    expect(push.applied).toHaveLength(2);

    // Segundo isolate (otra PC / reinicio de Cloudflare) con el mismo binding D1.
    const b = new SyncServer(new D1AuthStore(db), new D1RecordStore(db), new D1UsageStore(db));
    await b.auth.enroll("pc-b", "pin-1234");
    const data = await b.list();
    expect(data).toHaveLength(2);
    const st = await b.status();
    expect(st.entities).toBe(2);
    expect(st.installations).toBe(2);
    // Uso durable: el otro isolate ve lo que PC-A consumió (1 push + lecturas).
    expect(st.used.req).toBeGreaterThanOrEqual(1);
    expect(st.used.writes).toBe(2);
    expect(st.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(st.storage.records).toBe(2);
  });
});
