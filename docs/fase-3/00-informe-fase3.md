# Fase 3 — Contexto voluntario: informe

**Estado:** Completado, pendiente tu autorización para Fase 4
**Fecha:** 2026-11-07

## Verificación ejecutada
- `bun install` OK.
- `bun test` → **37 pass, 0 fail** (8 archivos).
- `bunx tsc --noEmit` → **exit 0**.

## Entregado
- `@ezzy/domain/knowledge.ts`: `KnowledgeExample` + máquina `draft→anonymized→previewed→approved→included|cancelled`, `anonymizeForKnowledge/hasPii`, `validateKnowledgeExample` (exige approved_at, rechaza PII). Tests FR-11.
- `@ezzy/storage` v4: migración `temp_contexts + consent_audits`, `putTemporal/purgeExpiredTemporals/wipeTemporals`, `auditConsent` solo metadatos, `importLocal` nunca restaura temporales, `NEVER_SYNC_TABLES`.
- `@ezzy/contracts`: tests que `temp_contexts/consent_audits` se rechazan en sync.
- Extensión `options/context.ts`: `startContextSession` (máx 4000) → redact local, `confirmContextTransmission` exige consent explícito, `cancelContextSession` limpia, `rejectImageInput` fail-closed. UI en options (contexto + aprendizaje en 3 pasos + cancelar). Tests incluidos.

## Criterios cubiertos
7. Selección → anonimizado → preview → aprobación → confirmación; cancelar evita inclusión y limpia.
4/5. Contexto revisado/editable antes de IA; validación factual; draft no auto-incluido.
11/12. Temporales con TTL + auditoría sin texto crudo; export nunca incluye temporales.

## Límite Fase 3
Texto manual únicamente; imagen/OCR bloqueados. Sin sync remoto. Nada Fase 4 iniciado.
