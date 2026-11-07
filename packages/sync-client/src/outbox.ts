import type { SyncChange } from "./protocol";

// Outbox transaccional local: idempotente por idempotencyKey, fail-closed sin red.
export class Outbox {
  ops: SyncChange[] = [];

  enqueue(op: SyncChange): void {
    if (this.ops.some((o) => o.idempotencyKey === op.idempotencyKey)) return;
    this.ops.push(op);
  }

  pending(): number {
    return this.ops.length;
  }

  ack(keys: string[]): void {
    this.ops = this.ops.filter((o) => !keys.includes(o.idempotencyKey));
  }
}

// Guardia cliente: ante cuota desconocida o riesgo de pago → bloquear y conservar local.
export interface QuotaView {
  planKnown: boolean;
  isFree: boolean;
  usageUnknown: boolean;
  warnRatio: number; // 0-1 uso vs cuota
}

export function shouldBlockSync(q: QuotaView): { block: boolean; code?: "QUOTA_BLOCKED" | "COST_GUARD_BLOCKED" } {
  if (!q.planKnown || q.usageUnknown) return { block: true, code: "COST_GUARD_BLOCKED" };
  if (!q.isFree) return { block: true, code: "COST_GUARD_BLOCKED" };
  if (q.warnRatio >= 0.7) return { block: true, code: "QUOTA_BLOCKED" };
  return { block: false };
}
