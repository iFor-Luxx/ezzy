// Protocolo sync Fase 5: UUID + revision monotónica, outbox + idempotency, cursor opaco, tombstones.
// Conflicto explícito, nunca last-write-wins silencioso en price/promotion/knowledge.
export interface SyncChange {
  idempotencyKey: string;
  entity_type: string;
  entity_id: string;
  operation: "upsert" | "tombstone";
  revision: number;
  base_revision: number;
  payload: Record<string, unknown>;
}

export interface Conflict {
  entity_type: string;
  entity_id: string;
  base_revision: number;
  local_revision: number;
  remote_revision: number;
}

export function detectSyncConflict(base: number, localRev: number, remoteRev: number): boolean {
  return localRev > base && remoteRev > base && localRev !== remoteRev;
}

// Tipos que exigen resolución manual (precios/promos/knowledge), resto auto-merge solo si campos disjuntos.
const MANUAL = new Set(["price", "promotion", "knowledge_example", "approved_message"]);

export function requiresManual(entityType: string, localFields: string[], remoteFields: string[]): boolean {
  if (MANUAL.has(entityType)) return true;
  return localFields.some((f) => remoteFields.includes(f));
}

export function encodeCursor(index: number): string {
  return Buffer.from(JSON.stringify({ i: index, v: 1 })).toString("base64url");
}

export function decodeCursor(c?: string): number {
  if (!c) return 0;
  try {
    const o = JSON.parse(Buffer.from(c, "base64url").toString("utf8"));
    return typeof o.i === "number" ? o.i : 0;
  } catch {
    return 0;
  }
}

export type SyncErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT"
  | "QUOTA_BLOCKED" | "COST_GUARD_BLOCKED" | "TOO_LARGE"
  | "UNSUPPORTED_SCHEMA" | "TEMPORARY_FAILURE";

export function errorEnvelope(code: SyncErrorCode, message: string, retryable: boolean): object {
  return { schemaVersion: 1, error: { code, message, retryable, correlationId: crypto.randomUUID() } };
}
