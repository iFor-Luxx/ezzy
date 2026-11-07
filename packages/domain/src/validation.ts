import type { Price, Product, Promotion, ApprovedMessage } from "./entities";
import { isPriceValidNow, searchHaystack } from "./entities";

// Validador factual determinista (Fase 1): compara borrador contra hechos vigentes.
// Toda afirmación de precio sin fuente vigente → "por confirmar", nunca publicable como hecho.
export interface FactSources {
  prices: Price[];
  promotions: Promotion[];
  products: Product[];
}

export interface FactualCheck {
  ok: boolean;
  issues: string[];
  sources: string[];
}

export function checkFactual(draft: string, facts: FactSources, at = new Date()): FactualCheck {
  const issues: string[] = [];
  const sources: string[] = [];
  const validPrices = facts.prices.filter((p) => isPriceValidNow(p, at));
  for (const p of validPrices) sources.push(`price:${p.id}:${p.amount_minor}:${p.currency}`);

  // Heurística conservadora Fase 1: si el borrador menciona un número con decimales o S/ $ y no hay precio vigente que lo respalde, marcar.
  const moneyRe = /(S\/\s?\d+[\.,]?\d*|\$\s?\d+[\.,]?\d*|\d+[\.,]\d{2})/g;
  const mentions = draft.match(moneyRe);
  if (mentions && mentions.length > 0 && validPrices.length === 0) {
    issues.push(`Menciona precio (${mentions[0]}) sin fuente vigente — marcar "por confirmar".`);
  }
  for (const pr of facts.promotions) {
    if (pr.status === "active" && Date.parse(pr.ends_at) < at.getTime())
      issues.push(`Promoción ${pr.name} vencida pero marcada active.`);
    sources.push(`promotion:${pr.id}:${pr.status}`);
  }
  return { ok: issues.length === 0, issues, sources };
}

export function searchProducts(q: string, products: Product[]): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return products;
  return products.filter((p) => searchHaystack(p.name, p.sku, p.description).includes(needle));
}

export function searchMessages(q: string, msgs: ApprovedMessage[]): ApprovedMessage[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return msgs;
  return msgs.filter((m) => searchHaystack(m.title, m.body, m.intent, m.tags).includes(needle));
}
