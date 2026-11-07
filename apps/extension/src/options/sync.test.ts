import { describe, expect, test } from "bun:test";
import { syncStatusText, conflictRow } from "./sync";

describe("sync UI Fase 5", () => {
  test("estado visible + conflicto con elección", () => {
    expect(syncStatusText({ online: false, pending: 3 })).toContain("Cola local: 3");
    expect(syncStatusText({ online: true, pending: 0, blocked: "QUOTA_BLOCKED" })).toContain("bloqueado");
    expect(conflictRow({ entity_type: "price", entity_id: "p", local: "100", remote: "200" })).toContain("elige");
  });
});
