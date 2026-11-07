# Distribución (Fase 6)

## Modos
- Dev: `Load unpacked` sobre `apps/extension/dist` (manifest + popup/options). Sin bundle Vite aún.
- Piloto: mismo artefacto, datos sintéticos, sync solo contra servidor referencia local. Sin Web Store.
- Estable: Chrome Web Store tras checklist (revisión permisos, política, firma y updates automáticas de la tienda).

## Permisos justificados
`storage` (prefs/catálogo), `scripting+activeTab` (inserción tras gesto), `clipboardWrite` (copiar). Sin hosts v1, sin `history/webRequest/tabs/clipboardRead`. `review-manifest.mjs` lo impone.

## Costos externos
- Cloudflare: S/0 (Free, sin tarjeta). R2 prohibido.
- Chrome Web Store: cuenta de desarrollador con costo propio, fuera del S/0 Cloudflare; decisión separada.
- OpenCode: a tu cuenta (modelos paid sugeridos); `usage.cost` visible si el API lo expone.

## Updates
Extensión: updates vía Store. Datos: migraciones IndexedDB versionadas con backup previo obligatorio.
