// Estado de la nube para el panel: lee GET /v1/status del Worker desplegado.
// Sin tokens ni secretos: el Worker solo expone uso, topes y estado de cuota.
export interface CloudStatusView {
  ts: string;
  plan: string;
  planVerifiedAt: string | null;
  used: { req: number; reads: number; writes: number };
  caps: { workersReqDay: number; d1ReadsDay: number; d1WritesDay: number };
  blocked: boolean;
  code?: string;
  entities: number;
  installations: number;
}

export const WORKER_KEY = "ezzy.web.worker";
export const STATUS_KEY = "ezzy.web.cloudStatus";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : NaN;
}

export function parseStatus(json: unknown): CloudStatusView {
  if (typeof json !== "object" || json === null) throw new Error("respuesta inválida");
  const o = json as Record<string, unknown>;
  if (o["schemaVersion"] !== 1) throw new Error("schema no soportado");
  const used = o["used"] as Record<string, unknown> | undefined;
  const caps = o["caps"] as Record<string, unknown> | undefined;
  const quota = o["quota"] as Record<string, unknown> | undefined;
  const req = num(used?.["req"]);
  const reads = num(used?.["reads"]);
  const writes = num(used?.["writes"]);
  const capReq = num(caps?.["workersReqDay"]);
  const capReads = num(caps?.["d1ReadsDay"]);
  const capWrites = num(caps?.["d1WritesDay"]);
  if ([req, reads, writes, capReq, capReads, capWrites].some((n) => Number.isNaN(n))) {
    throw new Error("uso o topes inválidos");
  }
  const entities = num(o["entities"]);
  const installations = num(o["installations"]);
  if (Number.isNaN(entities) || Number.isNaN(installations)) throw new Error("conteos inválidos");
  return {
    ts: typeof o["ts"] === "string" ? o["ts"] : new Date().toISOString(),
    plan: typeof o["plan"] === "string" ? o["plan"] : "desconocido",
    planVerifiedAt: typeof o["planVerifiedAt"] === "string" ? o["planVerifiedAt"] : null,
    used: { req, reads, writes },
    caps: { workersReqDay: capReq, d1ReadsDay: capReads, d1WritesDay: capWrites },
    blocked: (quota?.["blocked"] as boolean) === true,
    code: typeof quota?.["code"] === "string" ? (quota["code"] as string) : undefined,
    entities,
    installations,
  };
}

export function pct(used: number, cap: number): number {
  if (!(cap > 0)) return 0;
  return Math.min(100, Math.max(0, (used / cap) * 100));
}

export function barTone(p: number): "ok" | "warn" | "bad" {
  if (p >= 70) return "bad";
  if (p >= 50) return "warn";
  return "ok";
}
