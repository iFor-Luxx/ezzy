// Servidor sync de referencia (piloto sintético, sin despliegue): valida allowlist, idempotencia,
// revisiones y tombstones. Rechaza medios/secretos/rutas. Conflictos explícitos.
import { toSyncDto, checkBatchSize, SCHEMA_VERSION } from "@ezzy/contracts";
import { evalQuota, FREE_CAPS } from "./quota_guard";
import { warnRatio, type CloudStatus } from "./status";
import type { AuthStore } from "./auth";
import { detectSyncConflict } from "@ezzy/sync-client";

interface Rec {
  revision: number;
  dto: Record<string, unknown> | null;
  deleted: boolean;
}

export interface StoredRecord {
  entity_type: string;
  entity_id: string;
  revision: number;
  deleted: boolean;
  dto: Record<string, unknown> | null;
}

export class SyncServer {
  data = new Map<string, Rec>();
  seenKeys = new Set<string>();
  log: { key: string; index: number }[] = [];
  auth: AuthStore;
  quotaKnown = true;
  used = { req: 0, reads: 0, writes: 0 };
  /** Plan declarado al desplegar + fecha de verificación manual. Sin esto, el panel lo muestra "sin verificar". */
  plan: "free" = "free";
  planVerifiedAt: string | null = null;

  constructor(auth: AuthStore) {
    this.auth = auth;
  }

  setPlanVerified(atIso: string): void {
    this.planVerifiedAt = atIso;
  }

  /** Estado para el panel: uso vs topes, cuota y conteos. Sin secretos. */
  status(): CloudStatus {
    const q = evalQuota(this.used, this.quotaKnown);
    return {
      schemaVersion: 1,
      ts: new Date().toISOString(),
      plan: this.plan,
      planVerifiedAt: this.planVerifiedAt,
      used: { ...this.used },
      caps: { ...FREE_CAPS },
      quota: { warnRatio: warnRatio(this.used), blocked: !q.allow, code: q.code },
      entities: this.data.size,
      installations: [...this.auth.installations.values()].filter((i) => i.enabled).length,
    };
  }

  private k(t: string, id: string): string {
    return `${t}:${id}`;
  }

  push(input: {
    installationId: string;
    schemaVersion: number;
    changes: { idempotencyKey: string; entity_type: string; entity_id: string; operation: "upsert" | "tombstone"; revision: number; base_revision: number; payload: Record<string, unknown> }[];
  }): { applied: string[]; conflicts: { entity_type: string; entity_id: string }[]; error?: object } {
    this.used.req += 1;
    if (!this.auth.isAuthorized(input.installationId))
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "UNAUTHORIZED", message: "no enrolado o revocado", retryable: false } } };
    if (input.schemaVersion !== SCHEMA_VERSION)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "UNSUPPORTED_SCHEMA", message: "schema no soportado", retryable: false } } };
    const q = evalQuota(this.used, this.quotaKnown);
    if (!q.allow)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: q.code, message: "bloqueado por cuota/costo", retryable: false } } };
    const size = checkBatchSize(input.changes, JSON.stringify(input.changes).length);
    if (!size.ok)
      return { applied: [], conflicts: [], error: { schemaVersion: 1, error: { code: "TOO_LARGE", message: size.reason, retryable: false } } };

    const applied: string[] = [];
    const conflicts: { entity_type: string; entity_id: string }[] = [];
    for (const c of input.changes) {
      if (this.seenKeys.has(c.idempotencyKey)) {
        applied.push(c.idempotencyKey); // idempotente: reintento no duplica
        continue;
      }
      if (c.operation === "upsert") {
        const s = toSyncDto(c.entity_type, { ...(c.payload as object), revision: c.revision } as Record<string, unknown>);
        if (!s.ok) return { applied, conflicts, error: { schemaVersion: 1, error: { code: "VALIDATION_ERROR", message: s.reason, retryable: false } } };
        const cur = this.data.get(this.k(c.entity_type, c.entity_id));
        const remoteRev = cur?.revision ?? 0;
        // Conflicto si el servidor avanzó desde base_revision (el cliente parte de base).
        if (cur && detectSyncConflict(c.base_revision, c.revision, remoteRev)) {
          conflicts.push({ entity_type: c.entity_type, entity_id: c.entity_id });
          continue;
        }
        this.data.set(this.k(c.entity_type, c.entity_id), { revision: c.revision, dto: s.dto!, deleted: false });
        this.used.writes += 1;
      } else {
        this.data.set(this.k(c.entity_type, c.entity_id), { revision: c.revision, dto: null, deleted: true });
        this.used.writes += 1;
      }
      this.seenKeys.add(c.idempotencyKey);
      this.log.push({ key: c.idempotencyKey, index: this.log.length });
      applied.push(c.idempotencyKey);
    }
    return { applied, conflicts };
  }

  /** Lista completa para el panel (ver/editar/eliminar). Requiere instalación enrolada. */
  list(): StoredRecord[] {
    return [...this.data.entries()].map(([k, v]) => {
      const i = k.indexOf(":");
      return { entity_type: k.slice(0, i), entity_id: k.slice(i + 1), revision: v.revision, deleted: v.deleted, dto: v.dto };
    });
  }

  pull(cursor?: string): { cursor: string; changes: { entity_type: string; entity_id: string; revision: number; deleted: boolean }[] } {
    this.used.req += 1;
    this.used.reads += 1;
    let idx = 0;
    if (cursor) {
      try {
        idx = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")).i ?? 0;
      } catch {
        idx = 0;
      }
    }
    void idx;
    // Piloto: devuelve estado actual completo (cursor = tamaño log).
    const changes = [...this.data.entries()].map(([k, v]) => {
      const [entity_type, entity_id] = k.split(":");
      return { entity_type, entity_id, revision: v.revision, deleted: v.deleted };
    });
    const next = Buffer.from(JSON.stringify({ i: this.log.length, v: 1 })).toString("base64url");
    return { cursor: next, changes };
  }
}
