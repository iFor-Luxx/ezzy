// Contexto voluntario Fase 3: texto pegado/seleccionado por ti, con confirmación antes de transmitir.
// Imagen bloqueada (fail-closed): usar texto manual. Cancelar limpia temporales.
import { anonymizeForKnowledge } from "@ezzy/domain";

export type ContextStep = "empty" | "redacted" | "confirmed" | "cancelled";

export interface ContextSession {
  id: string;
  step: ContextStep;
  redacted_preview: string;
}

export function startContextSession(raw: string): ContextSession {
  if (!raw.trim()) throw new Error("pega o selecciona texto primero");
  if (raw.length > 4000) throw new Error("contexto >4000 caracteres");
  return { id: crypto.randomUUID(), step: "redacted", redacted_preview: anonymizeForKnowledge(raw) };
}

export function confirmContextTransmission(s: ContextSession, edited: string, consent: boolean): ContextSession {
  if (s.step !== "redacted") throw new Error("orden: redactar antes de confirmar");
  if (!consent) throw new Error("sin consentimiento explícito no se transmite");
  if (!edited.trim()) throw new Error("contexto vacío");
  return { ...s, step: "confirmed", redacted_preview: edited };
}

export function cancelContextSession(s: ContextSession): ContextSession {
  return { ...s, step: "cancelled", redacted_preview: "" };
}

export function rejectImageInput(fileName: string, mime: string): { ok: false; reason: string } {
  void fileName;
  void mime;
  return { ok: false, reason: "imagen no soportada en Fase 3: pega el texto manualmente (fail-closed)" };
}
