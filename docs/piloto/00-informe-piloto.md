# Piloto sintético: informe

**Fecha:** 2026-11-07
**Comando:** `bun ./scripts/pilot-sintetico.ts` → **exit 0, 9/9 grupos OK**
**Datos:** 100% sintéticos, sin red, sin despliegue.

## Resultados
- 1-crear-editar-offline OK (CRUD + persistencia).
- 2-precio-vigencia-bloqueo OK (minor int, vigencia, por confirmar sin fuente).
- 3-comando-activar-vars OK (preview, faltantes visibles, sin envío).
- 4-ia-consentida OK (mock OpenAI-chat, draft con fuente).
- 5-aprendizaje-voluntario OK (5 pasos + approved_at + provenance).
- 9-allowlist OK (imagen/secreto/lote rechazados).
- 10-sync-idempotente OK (reintento no duplica).
- 8-aislamiento-enrolamiento OK (intruso → UNAUTHORIZED).
- 12-export-restore OK (temporales excluidos, datos conservados).

## Suite completa
- `bun test` 56/56, `tsc` 0, `review-manifest` OK, `security-audit` OK, `a11y` OK (ver informe Fase 6).

## Decisión requerida
Piloto sintético superado. Activación privada con datos reales (opt-in) requiere: tu verificación de cuotas CF con captura/fecha, cuenta Web Store si distribuyes, y confirmación explícita de uso real.
