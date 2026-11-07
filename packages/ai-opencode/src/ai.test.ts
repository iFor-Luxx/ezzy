import { describe, expect, test } from "bun:test";
import { generateDraft, AiError } from "./client";
import { isBlockedForSales, validateConfig, maskKey } from "./config";
import { redactPii, buildConsentPreview, buildRecord, recordToLogLine } from "./consent";
import { setApiKey, getApiKey, forgetApiKey, isKeyExpiredForTest } from "./keystore";

const CFG = { baseURL: "https://opencode.ai/inference", apiFamily: "openai-chat" as const, modelId: "glm-5.3-flash", updatedAt: new Date().toISOString() };

function okFetch(text: string) {
  return (async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: text } }], usage: { cost: 0.001 } }), json: async () => ({ choices: [{ message: { content: text } }], usage: { cost: 0.001 } }) })) as unknown as typeof fetch;
}

describe("ai-opencode Fase 2", () => {
  test("bloquea modelos free/training", () => {
    expect(isBlockedForSales("beam-free")).toBe(true);
    expect(isBlockedForSales("muse-spark-1.3-contributor")).toBe(true);
    expect(() => validateConfig({ ...CFG, modelId: "beam-free" })).toThrow();
  });
  test("maskKey no expone", () => {
    const m = maskKey("oc_sk_xabcd7890");
    expect(m).not.toContain("xabcd");
    expect(m).toContain("7890");
  });
  test("keystore memoria + forget + ttl", async () => {
    await setApiKey("oc_sk_test12345678");
    expect(await getApiKey()).toBe("oc_sk_test12345678");
    await forgetApiKey();
    expect(await getApiKey()).toBeNull();
    expect(isKeyExpiredForTest(0, 31 * 60 * 1000)).toBe(true);
  });
  test("generate OK con mock", async () => {
    const r = await generateDraft({ cfg: CFG, apiKey: "oc_sk_x", facts: [{ label: "Precio", value: "S/ 49.90" }], fetchFn: okFetch("Hola, tenemos stock.") });
    expect(r.draft).toMatch(/stock/);
    expect(r.endpoint).toContain("/openai/v1/chat/completions");
  });
  test("no reintenta 401/403 ni expone key en error", async () => {
    let calls = 0;
    const f = (async () => { calls += 1; return { ok: false, status: 401, json: async () => ({}) }; }) as unknown as typeof fetch;
    try {
      await generateDraft({ cfg: CFG, apiKey: "oc_sk_x", facts: [], fetchFn: f });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(AiError);
      expect((e as AiError).code).toBe("UNAUTHORIZED");
      expect(String(e)).not.toContain("oc_sk_x");
    }
    expect(calls).toBe(1);
  });
  test("reintenta 1 vez en 500", async () => {
    let calls = 0;
    const f = (async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 500, text: async () => "{}", json: async () => ({}) };
      return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: "ok" } }] }), json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
    }) as unknown as typeof fetch;
    const r = await generateDraft({ cfg: CFG, apiKey: "oc_sk_x", facts: [], fetchFn: f });
    expect(r.draft).toBe("ok");
    expect(calls).toBe(2);
  });
  test("consent preview + redact + record sin prompt", () => {
    const p = buildConsentPreview(CFG, ["price:1"], "hola juan@x.com llámame 999 888 777");
    expect(p.warnings.length).toBe(3);
    expect(redactPii(p.contextIncluded)).not.toContain("juan@x.com");
    const rec = buildRecord({ provider: "opencode", modelId: CFG.modelId, sources: ["price:1"], validation: { ok: true, issues: [] }, decision: "borrador" });
    const line = recordToLogLine(rec);
    expect(line).not.toContain("oc_sk_");
    expect(line).toContain("borrador");
  });
});
