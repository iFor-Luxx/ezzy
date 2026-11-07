// UI sync Fase 5: manual, observable, recuperable. Solo tras enrolamiento; instalaciones aisladas.
export interface SyncView {
  online: boolean;
  pending: number;
  lastSync?: string;
  blocked?: string;
}

export function syncStatusText(v: SyncView): string {
  if (v.blocked) return `Sync bloqueado (${v.blocked}). Cola local: ${v.pending}.`;
  if (!v.online) return `Sin conexión. Cola local: ${v.pending}.`;
  return `Listo. Cola: ${v.pending}.${v.lastSync ? ` Último: ${v.lastSync}.` : ""}`;
}

export interface UiConflict {
  entity_type: string;
  entity_id: string;
  local: string;
  remote: string;
}

export function conflictRow(c: UiConflict): string {
  return `${c.entity_type}:${c.entity_id}\n local=${c.local}\n remoto=${c.remote}\n→ elige una versión (nunca auto-sobrescribir precios/promos).`;
}
