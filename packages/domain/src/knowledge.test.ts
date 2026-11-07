import { describe, expect, test } from "bun:test";
import {
  anonymizeForKnowledge, proposeKnowledge, previewProposal, approveProposal,
  confirmInclusion, cancelProposal, validateKnowledgeExample, hasPii,
} from "./knowledge";

describe("conocimiento voluntario (FR-11)", () => {
  test("anonimiza PII", () => {
    expect(anonymizeForKnowledge("soy juan@x.com 999 888 777")).not.toContain("juan@x.com");
    expect(hasPii("a@b.com")).toBe(true);
    expect(hasPii("texto limpio ventas")).toBe(false);
  });
  test("flujo completo exige orden y bloquea PII", () => {
    const p0 = proposeKnowledge("cliente pregunta por polo", "faq");
    const p1 = previewProposal(p0);
    expect(() => approveProposal(p1, "llámame a 999 888 777")).toThrow();
    const p2 = approveProposal(p1, "cliente pregunta por polo talla M");
    const { example } = confirmInclusion(p2);
    expect(() => validateKnowledgeExample(example)).not.toThrow();
    expect(example.provenance).toContain("voluntario");
  });
  test("cancelar limpia preview y no incluye", () => {
    const p = cancelProposal(previewProposal(proposeKnowledge("hola", "c")));
    expect(p.step).toBe("cancelled");
    expect(p.anonymized_preview).toBe("");
    expect(() => confirmInclusion(p)).toThrow();
  });
  test("rechaza inclusión directa sin approved_at", () => {
    expect(() => validateKnowledgeExample({ id: "x", anonymized_text: "t", category: "c", approved_at: "", provenance: "x", revision: 1 })).toThrow();
  });
});
