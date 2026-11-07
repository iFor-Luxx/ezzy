import { describe, expect, test } from "bun:test";
import { parseStatus, pct, barTone } from "./cloud";

const good = {
  schemaVersion: 1,
  ts: "2026-01-01T00:00:00.000Z",
  plan: "free",
  planVerifiedAt: "2026-01-01T00:00:00.000Z",
  used: { req: 288, reads: 100, writes: 20 },
  caps: { workersReqDay: 100000, d1ReadsDay: 5000000, d1WritesDay: 100000 },
  quota: { warnRatio: 0.01, blocked: false },
  entities: 12,
  installations: 2,
};

describe("estado de la nube", () => {
  test("acepta status válido y rechaza basura", () => {
    const s = parseStatus(good);
    expect(s.plan).toBe("free");
    expect(s.used.req).toBe(288);
    expect(() => parseStatus({})).toThrow();
    expect(() => parseStatus({ ...good, schemaVersion: 2 })).toThrow();
    expect(() => parseStatus({ ...good, used: { req: -1, reads: 0, writes: 0 } })).toThrow();
  });
  test("porcentajes y colores", () => {
    expect(pct(50, 100)).toBe(50);
    expect(pct(200, 100)).toBe(100);
    expect(barTone(10)).toBe("ok");
    expect(barTone(60)).toBe("warn");
    expect(barTone(80)).toBe("bad");
  });
});
