// Asignación comandos → mensajes + fallback a selector (Fase 4).
// ≤4 sugeridos; si hay conflicto/restricción o mensaje no disponible → selector.
export interface FavMap {
  [slot: string]: string; // "1" -> messageId
}

export interface MsgRef {
  id: string;
  status: string;
  title?: string;
}

export function resolveFavorite(
  index: number,
  favs: FavMap,
  msgs: MsgRef[]
): { action: "insert"; message: MsgRef } | { action: "open_selector"; reason: string } {
  const id = favs[String(index)];
  if (!id) return { action: "open_selector", reason: `favorito ${index} sin asignar` };
  const m = msgs.find((x) => x.id === id);
  if (!m) return { action: "open_selector", reason: "mensaje no existe localmente" };
  if (m.status !== "approved") return { action: "open_selector", reason: `mensaje ${m.status}, no aprobado` };
  return { action: "insert", message: m };
}

export interface CmdEntry {
  name: string;
  shortcut: string;
}

export function detectConflicts(cmds: CmdEntry[]): CmdEntry[] {
  return cmds.filter((c) => !c.shortcut);
}

export function setFavorite(favs: FavMap, slot: number, messageId: string): FavMap {
  if (![1, 2, 3].includes(slot)) throw new Error("slot 1-3");
  return { ...favs, [String(slot)]: messageId };
}
