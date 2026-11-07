# 07 — Gate para Fase 1 (Núcleo local)

## Criterios entrada Fase 1 (todos deben cumplirse)

- [ ] Apruebas ADR-009 y ADR-010 propuestos (o pides ajustes).
- [ ] Eliges modelo OpenCode inicial (o difieres a Fase 2, igual se puede iniciar Fase 1 sin IA).
- [ ] Confirmas límite 5 instalaciones y resguardo mnemónico en papel.
- [ ] Confirmas S/0 + prohibición R2 + fail-closed.
- [ ] Autorizas explícitamente iniciar Fase 1.

## Alcance Fase 1 (no iniciado)

- Workspace Bun/TS, extensión MV3 mínima (manifest, SW, popup, options), UI modular.
- Storage local: IndexedDB + chrome.storage.local, migraciones versionadas.
- Catálogo, variantes, precios decimales, promociones, mensajes/estrategias, búsqueda offline.
- Backup/export local + restore. Sin sync remoto, sin IA (solo stubs de puertos).
- Tests: dominio, allowlist serializador (negativos), IndexedDB/migraciones, E2E selector con fixtures sintéticas.

## Verificación Fase 0 (ejecutada)

- Archivos `docs/fase-0/00-07` creados y listados por script.
- Trazabilidad a `sdd/` y a fuentes oficiales (Chrome, Cloudflare, OpenCode) incluida en cada doc.
- Sin código Fase 1 iniciado, sin cambios a `sdd/`.
