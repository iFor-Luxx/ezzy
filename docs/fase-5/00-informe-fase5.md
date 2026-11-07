# Fase 5 — Sync costo-cero: informe (piloto sintético, sin despliegue)

**Estado:** Completado, pendiente tu autorización para Fase 6
**Fecha:** 2026-11-07

## Verificación ejecutada
- `bun test` → **53 pass, 0 fail** (12 archivos).
- `bunx tsc --noEmit` → **exit 0** (apps+packages+services).
- `review-manifest` → **OK**.

## Entregado
- `@ezzy/sync-client` real: `protocol.ts` (UUID+revision monotónica, cursor opaco base64url, `detectSyncConflict`, `requiresManual` — price/promotion/knowledge/approved siempre manual, envelope tipado), `outbox.ts` (idempotente por idempotencyKey, `ack`, `shouldBlockSync` fail-closed).
- `@ezzy/sync-api` referencia local: `quota_guard.ts` (WARN 50%/HARD 70% sobre Workers 100k/d, D1 5M reads/100k writes), `auth.ts` (bootstrap hash SHA-256 + allowlist instalaciones + revoke), `server.ts` (push valida schema/allowlist/lote/auth/cuota, idempotencia, conflictos explícitos, tombstones; pull cursor).
- Extensión `options/sync.ts` + sección Sync: manual, estado visible (cola/último/bloqueo), conflictos lado a lado con elección, sin auto-sobrescritura.

## Criterios cubiertos
8. Aisladas por instalación; solo tras enrolamiento (`UNAUTHORIZED` si no).
9. Solo DTOs allowlist; imagen/secreto/ruta → `VALIDATION_ERROR` (tests).
10. Offline en cola; reintento idempotente no duplica; conflicto muestra opciones.
11. Cuota desconocida/HARD/pago → `QUOTA/COST_GUARD_BLOCKED`, datos locales intactos; revocación inmediata.

## Límite Fase 5
Piloto sintético en memoria, sin Worker/D1 real ni despliegue (requiere tu verificación de cuotas + ADR con captura/fecha). Opt-in privado pendiente. Nada Fase 6 iniciado.
