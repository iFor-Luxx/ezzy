# 3. Arquitectura

## Vista lógica

```text
Chrome MV3 extension (Ezzy)
├── Popup / Options / selector de mensajes (React + TypeScript)
├── Service worker (commands, sync coordinator, OpenCode adapter)
├── Content scripts mínimos (WhatsApp Web, acciones bajo demanda)
├── IndexedDB / chrome.storage local
└── Cloudflare sync API (free tier only) ── almacenamiento estructurado privado
```

Ezzy es una extensión browser-only. Rust/Tauri, aplicación de escritorio y native messaging quedan retirados del alcance inicial. El usuario activa, revisa y copia/insertar mensajes; el envío a WhatsApp siempre es manual.

## Capas

1. **Presentación:** React, TypeScript, Vite, shadcn/ui y Tailwind; popup/options/selector.
2. **Aplicación:** casos de uso modulares: administrar catálogo, activar mensaje, generar respuesta, sincronizar y aprobar conocimiento.
3. **Dominio:** productos, precios, promociones, mensajes, validación factual, consentimiento y conflictos.
4. **Adaptadores del navegador:** `chrome.commands`, `chrome.storage`, IndexedDB, runtime messaging y content scripts.
5. **Adaptadores remotos:** cliente OpenCode configurable y API sync Cloudflare, separados del dominio.

## Límites de confianza

- Los content scripts operan en un DOM de terceros potencialmente cambiante y no confiable.
- El service worker valida origen, tipo, tamaño y esquema de cada mensaje entre contextos.
- Secretos nunca se inyectan en DOM ni se envían a content scripts.
- El backend remoto acepta solamente DTOs allowlisted; rechaza medios, rutas locales, cookies y secretos.
- Texto extraído del chat se trata como entrada no confiable e instrucciones hostiles para la IA.

## Flujos clave

### Activar mensaje

Atajo de Chrome o selector de extensión → resolver comando/alias → mostrar vista previa de mensaje aprobado → completar variables → confirmar copiar/insertar según capacidad segura del navegador → usuario revisa y envía manualmente.

### Sugerencia IA

Acción explícita → recuperar mensaje aprobado y hechos vigentes → usuario proporciona/selecciona contexto → confirmar qué datos se transmiten a OpenCode → generar → validar hechos → mostrar borrador → usuario copia y envía.

### Sync

Cambios locales versionados → DTO allowlist → guardia de cuota/costo → API privada Cloudflare → aplicar cambios/cursor → resolver conflictos visiblemente. Ante incertidumbre, conservar cola local.

## Reglas de diseño

- No monitorizar ni analizar conversaciones en segundo plano.
- No automatizar acciones de envío ni simular escritura para enviar.
- No depender de APIs fuera del navegador sin ADR y cambio de alcance explícito.
- Tolerar service worker suspendido, cierre de Chrome, desconexión y perfiles aislados.
- Costo Cloudflare S/ 0; fallar cerrado ante cuota/costo incierto.
