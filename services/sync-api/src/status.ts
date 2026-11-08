import { FREE_CAPS, evalQuota } from "./quota_guard";

export interface CloudStatus {
  schemaVersion: 1;
  ts: string;
  /** Plan declarado al desplegar (se confirma manual una vez, con fecha). */
  plan: "free";
  planVerifiedAt: string | null;
  used: { req: number; reads: number; writes: number };
  /** Día UTC al que pertenecen los contadores (duran en D1, no se reinician). */
  day: string;
  /** Almacenado real en D1: filas por tabla. */
  storage: { records: number; installations: number; keys: number };
  caps: typeof FREE_CAPS;
  quota: { warnRatio: number; blocked: boolean; code?: "QUOTA_BLOCKED" | "COST_GUARD_BLOCKED" };
  entities: number;
  installations: number;
}

export function warnRatio(used: { req: number; reads: number; writes: number }): number {
  return Math.max(
    used.req / FREE_CAPS.workersReqDay,
    used.reads / FREE_CAPS.d1ReadsDay,
    used.writes / FREE_CAPS.d1WritesDay
  );
}
