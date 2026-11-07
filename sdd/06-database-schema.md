# 6. Esquema de datos

IndexedDB es la fuente de verdad local de la extensión; `chrome.storage` se reserva para preferencias pequeñas. La base remota replica solo entidades marcadas sincronizables. UUIDs generados localmente, fechas UTC ISO-8601, dinero como entero de unidad menor + código ISO de moneda o decimal fijo validado, y borrados como tombstones versionados hasta confirmar sync.

## Entidades

| Entidad | Campos principales | Nube |
|---|---|---|
| `product` | id, sku?, name, category_id?, description, status, created_at, updated_at, revision | Sí |
| `variant` | id, product_id, label, size?, color?, attributes_json, active | Sí |
| `price` | id, variant_id/product_id, amount_minor, currency, valid_from/to, source, verified_at | Sí |
| `promotion` | id, name, rules_json, starts_at, ends_at, status, verified_at | Sí |
| `product_media_ref` | id, product_id, local_relative_ref, caption, sort_order | **No**; referencia local únicamente |
| `approved_message` | id, title, body, intent, channel, tags, status, verified_at, revision | Sí |
| `strategy` | id, title, body, category, status, revision | Sí |
| `faq` | id, question, answer, source_refs, status, revision | Sí |
| `knowledge_example` | id, anonymized_text, category, approved_at, provenance, revision | Sí solo luego de aprobación |
| `extension_installation` | id, user_label, browser_family, enrolled_at, enabled | Sí: alias y metadatos mínimos; nunca cookies |
| `generation_record` | id, created_at, context_hash?, sources_json, validation_json, decision | Local por defecto; sync opt-in pendiente |
| `sync_change` | id, entity_type, entity_id, operation, revision, payload, created_at, state | Cola local, payload allowlisted |
| `audit_event` | id, action, entity_ref, timestamp, outcome, safe_metadata | Local; no texto sensible |
| `app_setting` | key, value, sensitivity, updated_at | Selectiva; secretos nunca |

## Restricciones

- Relaciones verificadas en repositorios. Índices en nombre/SKU/status, vigencia de promociones, etiquetas y sync revision.
- JSON validado por esquema y tamaño; sin blobs de screenshot/audio/video.
- Unicidad opcional SKU dentro de catálogo; cantidades/moneda y períodos validados por dominio.
- `local_relative_ref` no revela ruta absoluta y no se interpreta como instrucción remota.
- La capa de sync construye DTO allowlist desde entidades; nunca serializa registros completos del almacenamiento local.
- `knowledge_example` exige estado y `approved_at`; no se crea directamente desde texto crudo.
- Auditoría registra decisión y fuente, no duplica conversación completa.

## Migraciones y borrado

Migraciones versionadas de IndexedDB, respaldo/export local previo a migración mayor y prueba con datos sintéticos de versión anterior. Borrar una entidad sincronizada genera tombstone; al recibir confirmación, el servidor aplica borrado. Debe definirse procedimiento de borrado total remoto y expiración de tombstones antes de producción.
