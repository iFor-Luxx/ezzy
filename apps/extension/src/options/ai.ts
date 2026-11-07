// Lógica IA Fase 2 para options: consentimiento previo, generación, validación, solo copiar.
// Sin auto-envío. Key nunca en DOM visible ni logs.
import { buildConsentPreview, redactPii } from "@ezzy/ai-opencode";
import type { AiConfig } from "@ezzy/ai-opencode";

export interface TableRow extends Record<string, unknown> {}

export function factsFromTables(products: TableRow[], prices: TableRow[]): { label: string; value: string }[] {
  const pmap = new Map(products.map((p) => [String(p["id"]), p]));
  const out: { label: string; value: string }[] = [];
  for (const pr of prices) {
    const prod = pmap.get(String(pr["product_id"] ?? ""));
    const name = prod ? String(prod["name"] ?? "") : String(pr["product_id"] ?? "");
    out.push({ label: `Precio ${name}`, value: `${pr["amount_minor"]} ${pr["currency"]}` });
  }
  return out.slice(0, 20);
}

export function pickBaseMessage(msgs: TableRow[]): TableRow | undefined {
  return msgs.find((m) => m["status"] === "approved") ?? msgs[0];
}

export function previewConsentText(cfg: AiConfig, facts: { label: string; value: string }[], ctx: string): string {
  const p = buildConsentPreview(cfg, facts.map((f) => `${f.label}: ${f.value}`), redactPii(ctx));
  return [
    `Modelo: ${p.modelId}`,
    `Endpoint: ${p.endpoint}`,
    `Hechos (${p.factsIncluded.length}):`,
    ...p.factsIncluded.map((f) => ` - ${f}`),
    `Contexto: ${p.contextIncluded || "(vacío)"}`,
    ...p.warnings.map((w) => `! ${w}`),
  ].join("\n");
}

export function draftHasInjectionRisk(draft: string): boolean {
  // Heurística UI: si el borrador resultante repite una instrucción del contexto, avisar (no bloquear, informar).
  return /ignora|instrucci|system|prompt/i.test(draft);
}
