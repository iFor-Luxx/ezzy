# 06 — Revisión SDD y ADRs pendientes

## SDD revisado

- `01-overview` a `17-glossary` v0.1.0 coherentes: browser-only, local-first, sin auto-envío, sin medios a nube, S/0.
- Sin cambios a `sdd/` en Fase 0. Este paquete propone cierres; tu aprobación los convierte en Aceptada.

## ADR estado propuesto

- ADR-001 Monorepo modular TS: Aceptada (sin cambio).
- ADR-002 Extensión navegador: Aceptada (sin cambio, Rust fuera).
- ADR-003 Local-first + sync privado: Aceptada en principio → cerrar en Fase 5 con productos CF verificados + captura/fecha. Pendiente: auth, cuotas, cifrado (resueltos en 04/05, falta tu aprobación).
- ADR-004 WhatsApp: Aceptada → pendiente acotado: límite 5 instalaciones/perfiles, compatibilidad teclas verificada en 01.
- ADR-005 Mensajes teclado: Aceptada → captura/visión queda futura opt-in, no flujo primario.
- ADR-006 Híbrida: Aceptada → pendiente acotado: endpoint/modelo inicial en 02, falta tu elección modelo.
- ADR-007 Aprendizaje voluntario: Aceptada (sin cambio).
- ADR-008 Costo S/0: Invariante (sin cambio, estrategia en 05).
- ADR-009 Auth/enrolamiento: Pendiente → Propuesta en `04-autenticacion-recuperacion.md` (A+C, Access rechazado Fase 1-2). Requiere tu aprobación.
- ADR-010 Capturas/auditoría/retención: Pendiente → Propuesta en `03-politica-datos.md` (30d generaciones, 180d auditoría, 90d tombstones). Requiere tu aprobación + decisión borrado remoto.

## Decisiones que requieren tu input

1. Aprobar ADR-009 (A+C, límite 5) y ADR-010 (retención/borrado).
2. Elegir modelo OpenCode inicial entre `glm-5.3-flash / kimi-k2.5 / gpt-5-nano` o indicar otro paid.
3. Confirmar resguardo mnemónico en papel aceptable y borrado manual vía dashboard como último recurso.
4. Confirmar prohibición R2 y fail-closed S/0 sin excepciones.
