# 7. Contratos de mensajes y API

Los contratos se versionan por `schemaVersion`; JSON UTF-8, timestamps UTC y errores tipados. Aplican al paso de mensajes entre popup, options, service worker y content script, así como a la API remota.

## Mensajería interna de extensión

| Tipo | Entrada | Resultado |
|---|---|---|
| `message.search` | query, filtros, cursor | mensajes aprobados y aliases |
| `message.activate` | messageId, source=`command\|popup\|overlay` | preview y variables requeridas |
| `message.copy` | activationId, renderedText | estado portapapeles/copia |
| `message.insert` | activationId, tabId? | resultado visible de inserción o capacidad no disponible |
| `catalog.search` | query, filtros | productos/variantes con fuente y revisión |
| `ai.reply.generate` | contextText?, sourceIds, consentId | borradores, fuentes, validaciones |
| `knowledge.propose` | selección de texto, modo anonimización | propuesta local no incluida |
| `knowledge.approve` | proposalId, confirmación explícita | entrada aprobada |
| `sync.run` | cursor? | estado, conteos, conflictos, bloqueos |

Todo mensaje comprueba sender/contexto, versión, tamaño y campos permitidos. Un content script no puede invocar sync o IA con payload arbitrario.

## API remota candidata

- `POST /v1/sync/push`: lote allowlisted con `idempotencyKey` y revisión base.
- `GET /v1/sync/pull?cursor=...`: cambios posteriores al cursor.
- `POST /v1/sync/ack`: confirmación de revisiones/tombstones.
- `GET /v1/status`: versión de esquema y estado de cuota no sensible.

## Error envelope

```json
{"schemaVersion":1,"error":{"code":"QUOTA_BLOCKED","message":"Sync pausado por límite preventivo.","retryable":false,"correlationId":"uuid"}}
```

Códigos: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `QUOTA_BLOCKED`, `COST_GUARD_BLOCKED`, `TOO_LARGE`, `UNSUPPORTED_SCHEMA`, `TEMPORARY_FAILURE`.

## Límites y validación

Validar tamaño máximo de lote, cantidad, allowlist de propiedades, replay, propietario, rate limit preventivo y esquema compatible. Rechazar medios, multipart, campos desconocidos y URLs que deleguen cargas. Los límites concretos quedan pendientes de verificar con cuotas vigentes.

## Compatibilidad

Un cliente con esquema no soportado no escribe. Cambios incompatibles requieren nueva versión negociada. Nunca omitir silenciosamente reglas de privacidad para mantener compatibilidad.
