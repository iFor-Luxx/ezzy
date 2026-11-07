import type { AiConfig } from "./config";
import { endpointFor } from "./config";

// Consentimiento granular previo a transmitir (NFR-08). Todo visible, editable, cancelable.
export interface ConsentPreview {
  modelId: string;
  endpoint: string;
  factsIncluded: string[];
  contextIncluded: string;
  warnings: string[];
}

export function buildConsentPreview(cfg: AiConfig, facts: string[], contextText?: string): ConsentPreview {
  return {
    modelId: cfg.modelId,
    endpoint: endpointFor(cfg),
    factsIncluded: facts,
    contextIncluded: contextText ?? "",
    warnings: [
      "Se envía a US/EU (OpenCode). Paid: zero-retention salvo OpenAI 30d / Anthropic 30d / Mistral según política.",
      "Nunca incluir PII. Puedes editar u ocultar datos antes de confirmar.",
      "Cancelar revoca la sesión efímera; nada se guarda en nube sin tu confirmación.",
    ],
  };
}

export function redactPii(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email oculto]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[teléfono oculto]")
    .replace(/\b\d{8}\b/g, "[documento oculto]");
}

export interface GenerationRecord {
  id: string;
  created_at: string;
  provider: "opencode";
  modelId: string;
  sources: string[];
  validation: { ok: boolean; issues: string[] };
  decision: "borrador" | "copiado" | "descartado";
}

// Sin prompt ni screenshot por defecto (SDD 08). Solo metadatos seguros para auditoría local.
export function buildRecord(r: Omit<GenerationRecord, "id" | "created_at">): GenerationRecord {
  return { ...r, id: crypto.randomUUID(), created_at: new Date().toISOString() };
}

export function recordToLogLine(r: GenerationRecord): string {
  // Allowlist: nunca key, prompt ni contexto.
  return JSON.stringify({ id: r.id, ts: r.created_at, provider: r.provider, model: r.modelId, sources: r.sources, ok: r.validation.ok, issues: r.validation.issues.length, decision: r.decision });
}
