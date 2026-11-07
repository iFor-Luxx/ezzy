export type ApiFamily = "openai-chat" | "anthropic-messages" | "gemini-generate";

export interface AiConfig {
  baseURL: string;
  apiFamily: ApiFamily;
  modelId: string;
  updatedAt: string;
}

export const OPENCODE_DEFAULTS = {
  baseURL: "https://opencode.ai/inference",
  chatPath: "/openai/v1/chat/completions",
  modelsPath: "/v1/models",
  timeoutMs: 30000,
};

export const SUGGESTED_PAID_MODELS = ["glm-5.3-flash", "kimi-k2.5", "gpt-5-nano"];

// Modelos excluidos para datos de ventas: permiten retención/entrenamiento o exigen consentimiento training.
const BLOCKED_RE = /(-free$|big-pickle|iceman-free|beam-free|muse-spark-.*-contributor)/i;

export function isBlockedForSales(modelId: string): boolean {
  return BLOCKED_RE.test(modelId);
}

export function endpointFor(cfg: AiConfig): string {
  if (cfg.apiFamily === "openai-chat") return `${cfg.baseURL}/openai/v1/chat/completions`;
  if (cfg.apiFamily === "anthropic-messages") return `${cfg.baseURL}/anthropic/v1/messages`;
  return `${cfg.baseURL}/google/v1beta/models/${encodeURIComponent(cfg.modelId)}:generateContent`;
}

export function validateConfig(cfg: AiConfig): void {
  if (!cfg.baseURL.startsWith("https://")) throw new Error("baseURL debe ser https");
  if (!cfg.modelId.trim()) throw new Error("modelId requerido");
  if (isBlockedForSales(cfg.modelId)) throw new Error(`modelo ${cfg.modelId} excluido para ventas (retención/entrenamiento)`);
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "oc_sk_…••••";
  return `oc_sk_…${key.slice(-4)}`;
}
