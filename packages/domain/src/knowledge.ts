// Conocimiento voluntario: solo texto seleccionado, anonimizado, previsualizado, aprobado y confirmado.
// Cancelar en cualquier etapa no conserva el original. Sin imagen en Fase 3 (fail-closed).
export interface KnowledgeExample {
  id: string;
  anonymized_text: string;
  category: string;
  approved_at: string;
  provenance: string;
  revision: number;
}

export type ProposalStep = "draft" | "anonymized" | "previewed" | "approved" | "included" | "cancelled";

export interface KnowledgeProposal {
  id: string;
  step: ProposalStep;
  anonymized_preview: string;
  category: string;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE_RE = /\+?\d[\d\s-]{7,}\d/g;
const DOC_RE = /\b\d{8}\b/g;

export function hasPii(text: string): boolean {
  return EMAIL_RE.test(text) || PHONE_RE.test(text) || DOC_RE.test(text);
}

export function anonymizeForKnowledge(raw: string): string {
  return raw
    .replace(EMAIL_RE, "[email oculto]")
    .replace(PHONE_RE, "[teléfono oculto]")
    .replace(DOC_RE, "[documento oculto]")
    .trim();
}

export function proposeKnowledge(raw: string, category: string): KnowledgeProposal {
  if (!raw.trim()) throw new Error("selección vacía");
  if (raw.length > 2000) throw new Error("selección >2000 caracteres");
  return { id: crypto.randomUUID(), step: "anonymized", anonymized_preview: anonymizeForKnowledge(raw), category };
}

export function previewProposal(p: KnowledgeProposal): KnowledgeProposal {
  if (p.step !== "anonymized") throw new Error("orden: anonimizar antes de previsualizar");
  return { ...p, step: "previewed" };
}

export function approveProposal(p: KnowledgeProposal, edited: string): KnowledgeProposal {
  if (p.step !== "previewed") throw new Error("orden: previsualizar antes de aprobar");
  const clean = edited.trim();
  if (!clean) throw new Error("texto aprobado vacío");
  if (hasPii(clean)) throw new Error("PII restante: edita u oculta antes de aprobar");
  return { ...p, step: "approved", anonymized_preview: clean };
}

export function confirmInclusion(p: KnowledgeProposal): { example: KnowledgeExample; proposal: KnowledgeProposal } {
  if (p.step !== "approved") throw new Error("orden: aprobar antes de confirmar inclusión");
  const now = new Date().toISOString();
  return {
    example: { id: p.id, anonymized_text: p.anonymized_preview, category: p.category, approved_at: now, provenance: "voluntario:selección+anonimizado+aprobado+confirmado", revision: 1 },
    proposal: { ...p, step: "included" },
  };
}

export function cancelProposal(p: KnowledgeProposal): KnowledgeProposal {
  return { ...p, step: "cancelled", anonymized_preview: "" };
}

export function validateKnowledgeExample(e: KnowledgeExample): void {
  if (!e.approved_at || Number.isNaN(Date.parse(e.approved_at))) throw new Error("knowledge_example exige approved_at");
  if (!e.anonymized_text.trim()) throw new Error("texto anonimizado requerido");
  if (hasPii(e.anonymized_text)) throw new Error("PII en ejemplo: rechazar inclusión");
}
