# 05 — Estrategia cuota costo-cero (S/0)

Fuentes: developers.cloudflare.com/workers/platform/limits + pricing, d1/platform/limits + pricing, changelog 2026-09-01, kv/platform/limits, r2/pricing.

## Techos Free

- Workers: 100k req/día (1027 si excede), CPU 10ms/invocación, memoria 128MB, 50 subreq, 6 conex simultáneas, bundle 64MiB, 100 workers/cuenta, cron 5, logs 200k/día 3d retención.
- D1: 5M filas leídas/día, 100k escritas/día, 5GB/cuenta, 10 DBs, 500MB/DB, 50 queries/invocación, fila 2MB, sentencia 100KB, 100 bound params, 30s query. Enforcement duro desde 2026-09-01 hasta 00:00 UTC.
- KV Free: 100k reads/día, 1k writes/día — preferir D1 para writes. R2 Standard Free exige tarjeta → prohibido. Allowlist: solo Workers + D1 (KV opcional). Bloqueado: R2, DO, Queues, Vectorize, Containers, Logpush, Workers AI.

## quota_guard

- Contadores local + servidor (meta.rows_read/rows_written + requests).
- WARN 50% → 429 QUOTA_BLOCKED + cola + jitter. HARD 70% → bloqueo hasta 00:00 UTC. COST 0-tolerancia → COST_GUARD_BLOCKED (plan≠Free, tarjeta detectada, producto no allowlist, cuota desconocida, meta ausente).
- `429 {code, reset:"00:00Z", retry_after_s}` sin PII en logs. Sin reintento auto en QUOTA/COST/1027/D1-limit, solo manual.

## Límites duros Ezzy

- Payload 64KB, lote 50 registros, filas por request ≤200 leídas / ≤100 escritas, fila ≤32KB, query ≤20KB.
- 60/min por dispositivo, 2000/día por dispositivo, 10000/día cuenta (10% de 100k).
- Reintentos 3 backoff+jitter solo 5xx/transitorios. Uso real ~288 req/día (<1% Free).

## Checklist pre-despliegue (cada release, guardar captura+fecha+URL en ADR)

1. Confirmar plan Free, sin tarjeta, productos = allowlist, 0 buckets R2, cron ≤5, bundle <64MiB, CPU p95 <8ms.
2. EXPLAIN/índices en id/updated_at, medir meta 7 días, proyectar x10. Si >50% Free → no desplegar.
3. Verificar fail-closed, kill switch, cola offline, exportación local.
4. Post-24h revisar uso; si desconocido → apagar sync.
