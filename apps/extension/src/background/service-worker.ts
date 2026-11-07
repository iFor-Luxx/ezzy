// Service worker MV3 — coordinador efímero. Sin estado global; rehidrata de storage por evento.
// No polling DOM, no auto-envío, no secretos en logs.
export const COMMANDS = ["open-selector", "favorite-1", "favorite-2", "favorite-3"] as const;

export interface ExtMessage {
  schemaVersion: 1;
  type: string;
  payload?: Record<string, unknown>;
}

export function validateExtMessage(msg: unknown): { ok: boolean; reason?: string } {
  if (typeof msg !== "object" || msg === null) return { ok: false, reason: "no-objeto" };
  const m = msg as Record<string, unknown>;
  if (m["schemaVersion"] !== 1) return { ok: false, reason: "schema no soportado" };
  if (typeof m["type"] !== "string" || (m["type"] as string).length > 64)
    return { ok: false, reason: "tipo inválido" };
  const raw = JSON.stringify(msg);
  if (raw.length > 64 * 1024) return { ok: false, reason: "mensaje >64KB" };
  const forbidden = ["secret", "api_key", "cookie", "token", "password"];
  if (forbidden.some((k) => raw.toLowerCase().includes(k))) return { ok: false, reason: "secreto en mensaje" };
  return { ok: true };
}

// Un content script no puede invocar sync o IA con payload arbitrario (sdd/07).
export type Sender = "popup" | "options" | "content" | "background";
export function canInvoke(sender: Sender, type: string): boolean {
  if (sender === "content" && (type.startsWith("ai.") || type.startsWith("sync."))) return false;
  return true;
}

// Nota runtime Chrome (no ejecutable en bun): onCommand → scripting.executeScript(activeTab) → overlay.
// Esta función pura decide la acción para testear sin APIs chrome.*.
export function resolveCommand(command: string): { action: "open_selector" | "insert_favorite"; index?: number } {
  if (command === "open-selector") return { action: "open_selector" };
  const m = /^favorite-([1-3])$/.exec(command);
  if (m) return { action: "insert_favorite", index: Number(m[1]) };
  throw new Error(`comando desconocido: ${command}`);
}
