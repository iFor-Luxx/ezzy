import { describe, expect, test } from "bun:test";
import { SyncServer } from "./server";
import { AuthStore } from "./auth";
import { evalQuota } from "./quota_guard";

async function setup() {
  const auth = new AuthStore();
  await auth.bootstrap("secreto-propietario", "inst-1");
  return new SyncServer(auth);
}

describe("sync-api Fase 5 (piloto sintético)", () => {
  test("push/pull/ack con enrolamiento; sin enrolar rechaza", async () => {
    const s = await setup();
    const bad = s.push({ installationId: "intruso", schemaVersion: 1, changes: [] });
    expect(bad.error).toBeDefined();
    const ok = s.push({
      installationId: "inst-1", schemaVersion: 1,
      changes: [{ idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p1", name: "Polo" } }],
    });
    expect(ok.applied).toEqual(["k1"]);
    // reintento idempotente no duplica
    const retry = s.push({
      installationId: "inst-1", schemaVersion: 1,
      changes: [{ idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p1", name: "Polo" } }],
    });
    expect(retry.applied).toEqual(["k1"]);
    expect(s.pull().changes.find((c) => c.entity_id === "p1")?.deleted).toBe(false);
  });
  test("rechaza imagen/secreto/ruta (criterio 9)", async () => {
    const s = await setup();
    const r = s.push({
      installationId: "inst-1", schemaVersion: 1,
      changes: [{ idempotencyKey: "k2", entity_type: "product", entity_id: "p2", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p2", name: "x", image_blob: "bin" } }],
    });
    expect(JSON.stringify(r.error)).toContain("VALIDATION_ERROR");
  });
  test("conflicto explícito + tombstone", async () => {
    const s = await setup();
    s.push({ installationId: "inst-1", schemaVersion: 1, changes: [{ idempotencyKey: "a", entity_type: "price", entity_id: "pr1", operation: "upsert", revision: 2, base_revision: 1, payload: { id: "pr1", amount_minor: 100, currency: "PEN" } }] });
    const c = s.push({ installationId: "inst-1", schemaVersion: 1, changes: [{ idempotencyKey: "b", entity_type: "price", entity_id: "pr1", operation: "upsert", revision: 3, base_revision: 1, payload: { id: "pr1", amount_minor: 200, currency: "PEN" } }] });
    expect(c.conflicts).toHaveLength(1);
    const t = s.push({ installationId: "inst-1", schemaVersion: 1, changes: [{ idempotencyKey: "d", entity_type: "price", entity_id: "pr1", operation: "tombstone", revision: 4, base_revision: 2, payload: {} }] });
    expect(t.applied).toEqual(["d"]);
    expect(s.pull().changes.find((x) => x.entity_id === "pr1")?.deleted).toBe(true);
  });
  test("cuota desconocida o HARD bloquea (criterio 11) + revocación", async () => {
    const s = await setup();
    s.quotaKnown = false;
    expect(s.push({ installationId: "inst-1", schemaVersion: 1, changes: [] }).error).toBeDefined();
    s.quotaKnown = true;
    s.used = { req: 80000, reads: 0, writes: 0 };
    expect(evalQuota(s.used, true).allow).toBe(false);
    s.used = { req: 0, reads: 0, writes: 0 };
    s.auth.revoke("inst-1");
    expect(s.push({ installationId: "inst-1", schemaVersion: 1, changes: [] }).error).toBeDefined();
  });
  test("status expone uso, topes y plan para el panel", async () => {
    const s = await setup();
    s.setPlanVerified("2026-01-01T00:00:00.000Z");
    s.push({
      installationId: "inst-1", schemaVersion: 1,
      changes: [{ idempotencyKey: "s1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p1", name: "Polo" } }],
    });
    const st = s.status();
    expect(st.schemaVersion).toBe(1);
    expect(st.plan).toBe("free");
    expect(st.planVerifiedAt).toContain("2026-01-01");
    expect(st.caps.workersReqDay).toBe(100000);
    expect(st.entities).toBe(1);
    expect(st.quota.blocked).toBe(false);
  });
});
