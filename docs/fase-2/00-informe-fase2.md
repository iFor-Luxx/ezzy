# Fase 2 — Asistente controlado: informe

**Estado:** Completado, pendiente tu autorización para Fase 3
**Fecha:** 2026-11-07

## Verificación ejecutada
- `bun install` OK.
- `bun test` → **29 pass, 0 fail** (6 archivos).
- `bunx tsc --noEmit` → **exit 0**.

## Entregado
- `@ezzy/ai-opencode` real (antes stub):
  - `config.ts`: familias, `endpointFor`, `validateConfig`, bloqueo `*-free/big-pickle/iceman/beam/muse-spark-contributor` para ventas, `maskKey`.
  - `keystore.ts`: memoria + `chrome.storage.session`, TTL 30min, `forget`, nunca local/sync/logs. En bun solo memoria.
  - `client.ts`: solo `openai-chat` en Fase 2, system prompt con hechos como datos + contexto no confiable, base mensaje aprobado, timeout 30s Abort, 1 reintento solo 429/5xx, nunca 401/403/timeout. `AiError` tipado sin key en mensaje.
  - `consent.ts`: `buildConsentPreview` (modelo/endpoint/hechos/contexto + 3 advertencias US/EU/retención), `redactPii`, `buildRecord/recordToLogLine` sin prompt/key.
- Extensión:
  - `service-worker`: `canInvoke` — content no puede llamar `ai.*`/`sync.*`.
  - `options/ai.ts`: `factsFromTables` (top 20), `pickBaseMessage` (approved primero), `previewConsentText` con redact.
  - `options.html`: sección IA (key password + olvidar, modelo, contexto editable, previsualizar → confirmar → draft + fuentes + copiar).
  - Garantía: content `whatsapp.ts` sin click/send/Enter (test lo verifica).

## Criterios cubiertos
4. Inspección + confirmación previa; key nunca en logs/UI/DB (tests mask/redact/log-line).
5. Fuentes listadas; `checkFactual` marca invento; resultado queda borrador + decisión (borrador/copiado/descartado).
6. Solo copiar; sin endpoint/comando de envío.

## Límite Fase 2
Sin multimodal (texto-solo), sin lista viva `/v1/models` en UI (config manual), sin IndexedDB real. Nada Fase 3 iniciado.
