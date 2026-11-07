import { describe, expect, test } from "bun:test";
import { startContextSession, confirmContextTransmission, cancelContextSession, rejectImageInput } from "./context";

describe("contexto voluntario Fase 3", () => {
  test("redacta + exige consentimiento + cancela limpiando", () => {
    const s0 = startContextSession("hola soy ana@x.com");
    expect(s0.redacted_preview).not.toContain("ana@x.com");
    expect(() => confirmContextTransmission(s0, s0.redacted_preview, false)).toThrow();
    const s1 = confirmContextTransmission(s0, "hola cliente", true);
    expect(s1.step).toBe("confirmed");
    const s2 = cancelContextSession(s1);
    expect(s2.step).toBe("cancelled");
    expect(s2.redacted_preview).toBe("");
  });
  test("imagen bloqueada fail-closed", () => {
    expect(rejectImageInput("foto.png", "image/png").ok).toBe(false);
  });
  test("vacío o gigante rechazado", () => {
    expect(() => startContextSession("   ")).toThrow();
    expect(() => startContextSession("x".repeat(5000))).toThrow();
  });
});
