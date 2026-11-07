import { describe, expect, test } from "bun:test";
import { MemoryStore, migrateDb, STORAGE_VERSION } from "./index";

describe("storage local + migraciones", () => {
  test("migra desde 0 a versión actual", () => {
    expect(migrateDb({}, 0)).toBe(STORAGE_VERSION);
  });
  test("CRUD persiste en memoria y export/import roundtrip", () => {
    const a = new MemoryStore();
    a.put("products", "p1", { name: "Polo" });
    a.put("approved_messages", "m1", { title: "Saludo", body: "Hola {{nombre}}" });
    expect(a.list("products")).toHaveLength(1);
    const backup = a.exportLocal();
    const b = new MemoryStore();
    b.importLocal(backup);
    expect(b.get("products", "p1")).toMatchObject({ name: "Polo" });
    expect(b.get("approved_messages", "m1")).toMatchObject({ title: "Saludo" });
  });
  test("rechaza backup futuro", () => {
    const a = new MemoryStore();
    expect(() => a.importLocal({ version: 999, tables: {} })).toThrow();
  });
  test("migración v1→v4 conserva datos sintéticos", () => {
    const db: Record<string, Record<string, unknown>> = { products: { p1: { id: "p1", name: "Viejo" } }, approved_messages: {}, variants: {}, prices: {}, promotions: {} };
    expect(migrateDb(db, 1)).toBe(STORAGE_VERSION);
    expect(db["temp_contexts"]).toBeDefined();
    expect(db["consent_audits"]).toBeDefined();
    expect((db["products"] as Record<string, unknown>)["p1"]).toBeDefined();
  });
  test("temporales: TTL + wipe + no-restore + auditoría sin texto crudo", () => {
    const a = new MemoryStore();
    a.putTemporal("t1", "context", 1000, 0);
    a.putTemporal("t2", "context", 1000, 0);
    expect(a.purgeExpiredTemporals(500)).toBe(0);
    expect(a.purgeExpiredTemporals(2000)).toBe(2);
    a.putTemporal("t3", "context", 60000, 0);
    expect(a.wipeTemporals()).toBe(1);
    a.auditConsent("knowledge.approve", "prop:1", "approved");
    const audits = a.list("consent_audits");
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits[0])).not.toContain("juan@");
    // backup no restaura temporales
    const b = new MemoryStore();
    b.putTemporal("tx", "context", 60000, Date.now());
    const snap = b.exportLocal();
    const c = new MemoryStore();
    c.importLocal(snap);
    expect(c.list("temp_contexts")).toHaveLength(0);
  });
});
