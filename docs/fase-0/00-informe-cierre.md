# Fase 0 — Cierre de diseño Ezzy

**Estado:** Completado pendiente de autorización para Fase 1
**Fecha:** 2026-11-07
**Base:** `sdd/` v0.1.0 2026-11-04

## Qué se resolvió

1. Estrategia comandos Chrome MV3 — ver `01-estrategia-comandos.md`
   - Máx 4 `suggested_key`, sin `Ctrl+Alt`, prioridad SO/Chrome.
   - Manifest mínimo: `storage + scripting + activeTab + clipboardWrite`. Sin `host_permissions` en v1.
   - Comandos genéricos (abrir selector, favorito 1-3) + selector popup/overlay como vía principal.
   - Detección conflictos con `commands.getAll()` en install.

2. Límites OpenCode — ver `02-opencode-limites.md`
   - Gateway `https://opencode.ai/inference/{openai|anthropic|google}/...`, auth `Bearer oc_sk_...`.
   - Modelos desde `GET /inference/v1/models`, filtrar `free==true` fuera para datos ventas.
   - Default inicial: `glm-5.3-flash / kimi-k2.5 / gpt-5-nano` (baratos paid). Texto-solo por defecto.
   - Timeout 30s, 1 reintento solo red/5xx/429. Key en `chrome.storage.session`, modal pre-envío.

3. Política datos — ver `03-politica-datos.md`
   - Allowlist exacta 10 entidades. Exclusiones con rechazo en serializador.
   - Retención: generaciones 30d local / no sync, auditoría 180d local, tombstones 90d remoto.
   - Conflictos: manual obligatorio en price/promotion/knowledge, sin last-write-wins.

4. Autenticación/recuperación — ver `04-autenticacion-recuperacion.md`
   - Híbrido A+C: `owner_secret` mnemónico 12 palabras + keypair ECDSA P-256 por instalación.
   - JWT 15min, límite 5 instalaciones, `revoke` granular. Cloudflare Access rechazado como auth primaria Fase 1-2.
   - API key OpenCode: `session` por defecto, prohibido `local` persistente en Fase 1-2.

5. Estrategia cuota S/0 — ver `05-estrategia-cuota.md`
   - Workers Free 100k req/día, CPU 10ms. D1 Free 5M reads / 100k writes / 5GB. R2 prohibido (exige tarjeta).
   - Umbrales WARN 50% HARD 70% + `QUOTA_BLOCKED`/`COST_GUARD_BLOCKED`. Límites duros: payload 64KB, lote 50, 60/min por dispositivo.
   - Checklist pre-despliegue con captura+fecha en ADR.

6. Revisión SDD/ADRs — ver `06-revision-sdd-adrs.md`
   - ADR-009 y ADR-010 propuestos para tu aprobación. ADR-003/004/005/006 con pendientes acotados.
   - Ningún cambio a `sdd/` original en Fase 0; propuestas en `docs/fase-0/`.

7. Gate Fase 1 — ver `07-gate-fase1.md`

## Gate

No pasar a Fase 1 sin tu autorización explícita + aprobación ADR-009/010 + confirmación de mnemónico/bootstrap y modelo OpenCode inicial.

## Siguiente

Esperando tu autorización para Fase 1 — Núcleo local (workspace Bun/TS, MV3, IndexedDB, catálogo/mensajes, backup/export).
