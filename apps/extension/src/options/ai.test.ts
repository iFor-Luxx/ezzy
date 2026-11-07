import { describe, expect, test } from "bun:test";
import { factsFromTables, pickBaseMessage, previewConsentText } from "./ai";
import { canInvoke } from "../background/service-worker";

const CFG = { baseURL: "https://opencode.ai/inference", apiFamily: "openai-chat" as const, modelId: "glm-5.3-flash", updatedAt: new Date().toISOString() };

describe("options IA Fase 2", () => {
  test("facts resumen acotado y base aprobada", () => {
    const f = factsFromTables([{ id: "p1", name: "Polo" }], [{ product_id: "p1", amount_minor: 4990, currency: "PEN" }]);
    expect(f[0].value).toContain("4990");
    expect(pickBaseMessage([{ status: "draft" }, { status: "approved", title: "A" }])).toMatchObject({ title: "A" });
  });
  test("preview muestra modelo/endpoint/advertencias y redacta", () => {
    const t = previewConsentText(CFG, [{ label: "Precio Polo", value: "4990 PEN" }], "a juan@x.com");
    expect(t).toContain("glm-5.3-flash");
    expect(t).toContain("/openai/v1/chat/completions");
    expect(t).toContain("[email oculto]");
    expect(t).toContain("US/EU");
  });
  test("content no puede invocar ai/sync", () => {
    expect(canInvoke("content", "ai.reply.generate")).toBe(false);
    expect(canInvoke("content", "sync.run")).toBe(false);
    expect(canInvoke("options", "ai.reply.generate")).toBe(true);
    expect(canInvoke("popup", "message.search")).toBe(true);
  });
  test("sin endpoint de envío", async () => {
    const src = await (await import("node:fs/promises")).readFile(new URL("../content/whatsapp.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/click|send|Enter/);
  });
});
