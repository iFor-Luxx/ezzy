# 16. Registros de decisiones arquitectónicas (ADR)

Estados: **Aceptada** = confirmada por el usuario; **Propuesta** = dirección del diseño aún revisable; **Pendiente** = requiere dato/decisión.

## ADR-001 — Monorepo modular TypeScript

- Estado: Aceptada.
- Decisión: Bun workspaces para la extensión y paquetes TypeScript; separar app, paquetes, servicio sync y documentación.
- Motivo: compartir contratos y mantener límites por dominio sin concentrar el sistema en un único archivo.

## ADR-002 — Ezzy como extensión de navegador

- Estado: Aceptada, reemplaza la decisión anterior de Rust/Tauri.
- Decisión: extensión Chrome MV3 con TypeScript + React + Vite, shadcn/ui, Tailwind y Bun workspaces.
- Motivo: el usuario debe atender distintos WhatsApp desde los equipos donde los utiliza y activar mensajes con teclado.
- Consecuencia: Rust/Tauri, aplicación de escritorio y companion nativo salen del alcance base.

## ADR-003 — Local-first con sync privado

- Estado: Aceptada en principio.
- Decisión: IndexedDB local y Cloudflare exclusivamente para datos estructurados/sync de las instalaciones del propietario.
- Restricción: nunca medios en nube; operación que pueda generar costo debe bloquearse.
- Pendiente: selección de productos Cloudflare, auth, cuotas y cifrado.

## ADR-004 — Interacción con WhatsApp

- Estado: Aceptada.
- Decisión: Chrome MV3 en distintos equipos/perfiles, WhatsApp personal/Business; mensajes activados por comandos, sin lectura continua ni envío automatizado.
- Pendiente: límite de instalaciones/perfiles y compatibilidad real de combinaciones de teclas.

## ADR-005 — Mensajes activados por teclado

- Estado: Aceptada, reemplaza la captura como flujo primario.
- Decisión: comandos de teclado asignados a mensajes aprobados, con selector rápido como alternativa.
- Pendiente: decidir si captura/visión se conserva como función futura compatible con límites MV3.

## ADR-006 — Generación híbrida

- Estado: Aceptada.
- Decisión: priorizar mensajes aprobados y permitir rewrites naturales fundamentados en catálogo verificado.
- Pendiente: OpenCode endpoint/modelo/proveedor exactos.

## ADR-007 — Aprendizaje voluntario

- Estado: Aceptada.
- Decisión: solo texto seleccionado voluntariamente, anonimizado, revisado y aprobado antes de entrar a conocimiento.

## ADR-008 — Control de costo de nube

- Estado: Aceptada como invariante.
- Decisión: Cloudflare S/ 0; solo plan gratuito, sin pagos ni servicios pagados; fallar cerrado al riesgo de costo o cuota.
- Acción obligatoria: verificar límites oficiales vigentes antes de cada despliegue; las cuotas no se consideran garantías.

## ADR-009 — Autenticación y enrolamiento

- Estado: Pendiente.
- Opciones a evaluar: token de propietario generado localmente, OAuth/Access u opción equivalente gratuita, llaves por dispositivo y revocación. Evaluar recuperación y evitar onboarding que requiera servicios pagados.

## ADR-010 — Capturas, auditoría y retención

- Estado: Pendiente.
- Resolver cuánto historial de generación local guardar, cuándo borrar temporales y política de borrado remoto.
