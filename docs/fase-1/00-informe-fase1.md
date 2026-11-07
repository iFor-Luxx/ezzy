# Fase 1 — Núcleo local: informe

**Estado:** Completado, pendiente tu autorización para Fase 2
**Fecha:** 2026-11-07

## Verificación ejecutada
- `bun install` OK (typescript + bun-types).
- `bun test ./packages/domain ./contracts ./storage ./apps/extension` → **18 pass, 0 fail**.
- `bunx tsc --noEmit -p tsconfig.json` → **exit 0**.

## Entregado (trazable a sdd/04, 06, 07, 13)
- Workspace Bun/TS: `package.json` workspaces, `bunfig.toml`, `tsconfig.json`, `.gitignore` (sin secretos, sin medios).
- `@ezzy/domain`: entidades puras, dinero minor int, `validatePrice/Promotion/Message`, `isPriceValidNow`, `renderMessage` (variable faltante queda visible), `checkFactual` (precio sin fuente → por confirmar), `searchProducts/Messages` offline.
- `@ezzy/contracts`: `SCHEMA_VERSION=1`, allowlist 10 tipos, rechazo binario/ruta/secreto/URL, `knowledge_example` exige `approved_at`, `MAX_BATCH=50` / 64KB.
- `@ezzy/storage`: `STORAGE_VERSION=3`, migraciones 1-3, `MemoryStore` (IndexedDB en navegador vía misma forma), export/import roundtrip, rechazo backup futuro.
- `@ezzy/test-fixtures`: solo sintéticos. `@ezzy/ai-opencode` y `@ezzy/sync-client`: stubs fail-closed (lanzan / encolan local). `@ezzy/ui`: `cx` mínimo.
- Extensión MV3: `manifest/base.json` (4 comandos, permisos storage/scripting/activeTab/clipboardWrite, sin host v1), `service-worker` (resolveCommand + validateExtMessage), `content/whatsapp` (insertText + input, sin click/enviar), `popup` búsqueda offline + copiar, `options` CRUD producto/precio/mensaje + export/restore JSON.

## Criterios aceptación cubiertos
1. Crear/editar producto/promo offline + persistencia → `store.test` + options CRUD.
2. Precio/moneda/vigencia + bloqueo sin dato → `domain.test` + `checkFactual`.
9. Sync solo DTOs, rechazo imagen/ruta/secreto → `allowlist.test`.
10. Cola local reintentable (stub Outbox idempotente, sin last-write silencioso).
12. Export/restore, medios solo locales → options + `exportLocal/importLocal`.

## No hecho (límite Fase 1)
- Sin sync remoto ni IA real (stubs). Sin React/Vite/Tailwind/shadcn (popup/options vanilla funcionales; bundle Vite = 1.1). Sin IndexedDB real en navegador (misma API, falta cablear `idb` en options/popup — usa chrome.storage.local).
- Sin cambios a `sdd/`.

## Siguiente (Fase 2, requiere tu OK)
Asistente controlado: `ai-opencode` real, modal consentimiento, validación factual en UI, copiar manual. Nada de Fase 2 iniciado.
