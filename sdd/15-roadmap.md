# 15. Roadmap propuesto

Orden por dependencias, sin estimaciones de calendario hasta validar alcance.

## Fase 0 — Cierre de diseño

- Resolver estrategia de comandos, límites de OpenCode, política de datos, autenticación/recuperación y estrategia de cuota.
- Revisar SDD y aprobar ADRs pendientes.

## Fase 1 — Núcleo local

- Workspace Bun/TypeScript, extensión MV3, UI modular y almacenamiento local.
- Catálogo, variantes, precios, promociones, mensajes y estrategias.
- Backup/export local y búsqueda offline.

## Fase 2 — Asistente controlado

- Configuración segura API key y adapter OpenCode.
- Recuperación de mensajes aprobados, generación, fuentes y validación.
- Activar/copiar mensajes manualmente; contexto opcional pegado bajo control del usuario.

## Fase 3 — Contexto voluntario

- Entrada de contexto pegada/seleccionada voluntariamente y confirmación antes de transmitir a IA.
- Aprobación específica antes de enviar texto/imagen a IA.
- Auditoría de consentimiento, cancelación y limpieza temporal.

## Fase 4 — Extensión Chrome

- Comandos de teclado, popup/selector y compatibilidad con WhatsApp personal/Business en distintas instalaciones.
- Interacción explícita mínima y pruebas de permisos/políticas.

## Fase 5 — Sync Cloudflare de costo cero

- Solo tras verificar free tier y autorización; protocolo, auth, cuota guard y conflictos.
- Piloto con datos sintéticos; después activación privada opt-in.

## Fase 6 — Endurecimiento y distribución

- Firma, actualización, recuperación, seguridad, accesibilidad y soporte.
- Revisar costos externos, política de retención y obligaciones legales.

Cada fase pasa sus criterios en `13-testing-acceptance.md`; no se adelanta la nube antes de cerrar el hard stop de costos.
