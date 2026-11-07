# 03 — Política de datos, retención y conflictos

## Allowlist sincronizable (único serializable)

- `product{id,sku?,name,category_id?,description,status,created_at,updated_at,revision}`
- `variant{id,product_id,label,size?,color?,attributes_json,active,revision}`
- `price{id,product_id|variant_id,amount_minor int,currency ISO,valid_from/to UTC,source,verified_at,revision}` — nunca float
- `promotion{id,name,rules_json,starts_at,ends_at,status,verified_at,revision}`
- `approved_message{id,title,body,intent,channel,tags[],status,verified_at,revision}`
- `strategy{id,title,body,category,status,revision}`
- `faq{id,question,answer,source_refs[],status,revision}`
- `knowledge_example{id,anonymized_text,category,approved_at,provenance,revision}` solo si approved_at != null
- `extension_installation{id,user_label,browser_family,enrolled_at,enabled}` solo alias/metadatos
- `app_setting{key,value,updated_at}` solo si sensitivity != secret

## Exclusiones (serializador lanza, test fail-closed)

Blobs, imágenes/video/audio/screenshots/adjuntos, `product_media_ref.local_relative_ref`, cookies/tokens WhatsApp, owner_secret/API keys/privkeys/JWTs, rutas absolutas `C:\…` `/home/…`, texto crudo no aprobado, OCR no revisado, PII cliente, `generation_record` completo, `sync_change`, `audit_event` completo.

## Retención

- Catálogo/messages aprobados: sin TTL local (fuente verdad) + backup/export previo a migración. Remoto réplica mientras vigente.
- `generation_record` + temporales: 30d local (config 7-90d), botón Borrar temporales. No sync por defecto (opt-in solo hash+fuentes+decisión).
- `audit_event`: 180d local, solo action+entity_ref+timestamp+outcome+safe_metadata. No sync.
- Tombstones: hasta ACK local; 90d remoto tras confirmación. Purga anticipada solo con ACK de todas enabled o doble confirmación.
- Revocaciones: hasta rotación +30d. Borrado total: `DELETE /owner/purge` doble confirmación + mnemónico.

## Conflictos (sin last-write-wins silencioso)

- Claves: `entity_id + base_revision + revision monotónica + idempotency_key`. Pull cursor opaco + ACK.
- `base igual + uno avanzó` = fast-forward. `ambos avanzaron` = conflict visible, no auto-sobrescritura.
- Matriz: price/promotion → siempre manual lado a lado. knowledge/approved_message.body → manual por campo o versión + re-verified_at. Resto solo auto-merge si campos disjuntos.
- UX: badge cola, diff, elección explícita, registro actor+fecha+origen. Timestamps nunca desempatan precios.
