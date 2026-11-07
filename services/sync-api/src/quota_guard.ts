// quota_guard servidor: umbrales preventivos sobre Free (Workers 100k/d, D1 5M reads/100k writes).
// WARN 50% avisa, HARD 70% bloquea hasta 00:00 UTC. Desconocido → COST_GUARD_BLOCKED.
export const FREE_CAPS = { workersReqDay: 100000, d1ReadsDay: 5000000, d1WritesDay: 100000 };

export function evalQuota(used: { req: number; reads: number; writes: number }, known: boolean): {
  allow: boolean; code?: "QUOTA_BLOCKED" | "COST_GUARD_BLOCKED"; reset?: string;
} {
  if (!known) return { allow: false, code: "COST_GUARD_BLOCKED" };
  const r = [used.req / FREE_CAPS.workersReqDay, used.reads / FREE_CAPS.d1ReadsDay, used.writes / FREE_CAPS.d1WritesDay];
  const max = Math.max(...r);
  if (max >= 0.7) return { allow: false, code: "QUOTA_BLOCKED", reset: "00:00Z" };
  return { allow: true };
}
