# Fase 4 — Extensión Chrome: informe

**Estado:** Completado, pendiente tu autorización para Fase 5
**Fecha:** 2026-11-07

## Verificación ejecutada
- `bun test` → **43 pass, 0 fail** (9 archivos).
- `bunx tsc --noEmit` → **exit 0**.
- `node scripts/review-manifest.mjs` → **manifest OK** (4 comandos, permisos storage/scripting/activeTab/clipboardWrite).

## Entregado
- `background/commands.ts`: favoritos 1-3 → messageId, `resolveFavorite` con fallback a selector (sin asignar / no existe / no aprobado), `detectConflicts` (shortcut vacío), `setFavorite` slots 1-3.
- `background/state.ts`: `loadState/saveState` por evento (tolera suspensión SW, sin globals).
- `background/installation.ts`: `newInstallation` (label ≤40, chrome, UUID) aislada por perfil hasta enrolamiento Fase 5.
- `content/targets.ts`: `isSupportedUrl` solo `web.whatsapp.com/*` (personal y Business mismo origen), `COMPOSER_SELECTORS` + `composerLookupCode` con `no-composer` → pegado manual.
- `popup/activate.ts` + popup.html/ts: preview + inputs por variable `{{x}}`, lo faltante queda visible, botón copiar; sin envío.
- `scripts/review-manifest.mjs`: falla si permiso fuera de allowlist, hosts en v1, >4 comandos, `Ctrl+Alt`, o falta popup/options/SW module.

## Criterios cubiertos
3. Comando activa asignado; conflicto/restricción/mensaje no aprobado → selector alternativo.
13 (extensión): manifiesto/permisos, SW suspendido/reanudado, conflictos atajos, fallo sitio con `no-composer`, E2E sintético comando→activar→variables→copiar/insertar.

## Límite Fase 4
Sin `host_permissions` (activeTab tras gesto). Sin sync (instalaciones aisladas). Nada Fase 5 iniciado.
