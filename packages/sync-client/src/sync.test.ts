import { describe, expect, test } from "bun:test";
import { detectSyncConflict, requiresManual, encodeCursor, decodeCursor, errorEnvelope } from "./protocol";
import { Outbox, shouldBlockSync } from "./outbox";

describe("sync-client Fase 5", () => {
  test("idempotencia: reintento no duplica", () => {
    const o = new Outbox();
    const op = { idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert" as const, revision: 2, base_revision: 1, payload: {} };
    o.enqueue(op);
    o.enqueue(op);
    expect(o.pending()).toBe(1);
    o.ack(["k1"]);
    expect(o.pending()).toBe(0);
  });
  test("conflicto explícito cuando ambas avanzan", () => {
    expect(detectSyncConflict(1, 2, 3)).toBe(true);
    expect(detectSyncConflict(1, 1, 3)).toBe(false);
    expect(requiresManual("price", ["a"], ["b"])).toBe(true);
    expect(requiresManual("product", ["name"], ["desc"])).toBe(false);
    expect(requiresManual("product", ["name"], ["name"])).toBe(true);
  });
  test("cursor opaco roundtrip", () => {
    expect(decodeCursor(encodeCursor(7))).toBe(7);
    expect(decodeCursor("!!!")).toBe(0);
  });
  test("fail-closed ante cuota desconocida o pago", () => {
    expect(shouldBlockSync({ planKnown: false, isFree: true, usageUnknown: false, warnRatio: 0 }).block).toBe(true);
    expect(shouldBlockSync({ planKnown: true, isFree: false, usageUnknown: false, warnRatio: 0 }).code).toBe("COST_GUARD_BLOCKED");
    expect(shouldBlockSync({ planKnown: true, isFree: true, usageUnknown: false, warnRatio: 0.8 }).code).toBe("QUOTA_BLOCKED");
    expect(shouldBlockSync({ planKnown: true, isFree: true, usageUnknown: false, warnRatio: 0.1 }).block).toBe(false);
  });
  test("envelope tipado sin PII", () => {
    const e = JSON.stringify(errorEnvelope("QUOTA_BLOCKED", "pausado", false));
    expect(e).toContain("QUOTA_BLOCKED");
    expect(e).not.toContain("oc_sk_");
  });
});
