# Web-dashboard (panel privado): informe

**Fecha:** 2026-11-07 · **v2:** shadcn real (cva + Tailwind + lucide, estética Apple) y precios en soles.
**Decisión:** web separada `apps/web`, extensión mínima. Puente JSON v1; sync automático con tu despliegue Cloudflare.

## V2 — lo que pediste
- Precios en soles: escribes `49.90` (o `49,90`) y se guarda `4990 minor` + `PEN/USD` seleccionable; historial por producto con formato `S/ 49.90`, archivar/reactivar, validación con mensajes claros.
- shadcn de verdad: `button/card/badge/input/textarea/select/dialog` con `cva` + `cn` (clsx + tailwind-merge), iconos lucide, segmentos estilo Apple, topbar con blur, stats, foco visible.

## Verificación
- `bun test` 58/58, `tsc` 0, `vite build` OK, `review-manifest` OK, `security-audit` OK, `a11y` OK, piloto 9/9.

## La web (`bun run dev:web` → http://localhost:5173)
- Catálogo (producto+precio minor/ISO), Mensajes (aprobar, buscar, Fav 1-3), Asistente IA (key solo sessionStorage, preview → confirmar → draft validado → copiar), Contexto (anonimizar local, imagen bloqueada), Sincronización (exportar/importar puente), Respaldo (exportar todo, ejemplo, borrar) y Auditoría (metadatos, 180d).
- Datos en `localStorage` de tu navegador. Nada sale sin tu confirmación.

## La extensión (igual que antes, más importación)
- Opciones → Restaurar ahora acepta el JSON del panel (sin duplicar). Flujo: panel Exportar puente → extensión Restaurar.
- Recarga `dist/`: `node apps/extension/scripts/build.mjs` (ya reconstruido) y en `chrome://extensions` pulsa recargar.

## Límites
Kit UI propio compatible con shadcn (se reemplaza 1:1 por el CLI cuando quieras). Sin hosting: la web corre en tu PC (`dev` o `preview`). Publicarla exige ADR (dominio + cuotas).
