# 1. Visión general

## Propósito

Ezzy es una extensión de navegador privada para que una sola persona organice su actividad de ventas, consulte un catálogo verificado y active mensajes aprobados mediante comandos de teclado mientras utiliza sus distintos WhatsApp Web en los equipos disponibles. Ezzy no opera la cuenta ni envía mensajes por el usuario.

## Usuarios y contexto

- Un propietario/usuario personal, sin cuentas de clientes, organizaciones ni multi-tenancy en el alcance inicial.
- Distintos equipos y perfiles independientes; el número y enrolamiento se definirán. Debe funcionar con WhatsApp personal y WhatsApp Business Web.
- Cada PC conserva sus archivos e imágenes localmente. La sincronización en la nube incluye información estructurada y metadatos, nunca archivos de imagen o video.
- La generación utiliza una clave API de OpenCode proporcionada por el usuario. Modelo, proveedor, endpoints y condiciones de retención aún deben confirmarse.

## Capacidades principales

1. Mantener productos, variantes, precios, atributos de tela, colores, tallas y promociones.
2. Organizar mensajes aprobados, borradores y archivados, además de estrategias comerciales.
3. Activar mensajes aprobados mediante comandos de teclado configurables o selector rápido; revisar y copiar/insertar manualmente.
4. Generar texto híbrido: priorizar respuestas aprobadas y permitir reescrituras naturales sustentadas en datos verificados del catálogo.
5. Guardar opcionalmente fragmentos de conversación anonimizados únicamente después de selección voluntaria, anonimización, aprobación explícita e inclusión confirmada por el usuario.
6. Trabajar sin conexión con almacenamiento local del navegador y sincronizar posteriormente datos permitidos.

## Principios de diseño

- El propietario inicia cada activación de mensaje, uso de contexto y acción de aprendizaje.
- La persona revisa y decide qué usar; el sistema jamás envía automáticamente mensajes.
- Los hechos comerciales salen de registros verificados; la IA no inventa precios, disponibilidad ni atributos.
- Privacidad por minimización: contexto temporal, sin extracción masiva y sin carga de medios.
- Separación modular por dominio y capas; ningún módulo central monolítico.
- Tolerancia a desconexión y sincronización explícita, observable y recuperable.
- Costo Cloudflare máximo aceptable: S/ 0. Ante duda de costo o cuota, denegar operación y conservarla localmente.

## Supuestos explícitos

- La aplicación es para uso comercial propio del usuario, no un CRM multiusuario.
- El usuario ya dispone de una cuenta OpenCode/API key válida; el SDD no elige un proveedor de modelo.
- El producto base es 100% una extensión de navegador; Rust/Tauri y una app de escritorio quedan fuera del alcance actual.
- Las imágenes de catálogo permanecen locales y no forman parte de la sincronización.
- Cloudflare ofrece únicamente una opción candidata para sincronización de datos, sujeta a verificación de límites, términos, seguridad y costo al implementar.

## No objetivos

- Envío o programación automática de mensajes, bots, scraping, lectura continua del DOM o monitoreo en segundo plano de chats.
- Extracción masiva de conversaciones/contactos o análisis de fotografías de clientes.
- Almacenamiento remoto de imagen, video, audio o adjuntos; respaldo genérico de carpetas locales.
- Multiusuario, roles, permisos empresariales, SaaS público, pagos o facturación.
- Garantizar que el uso de WhatsApp Web elimine el riesgo de restricciones de cuenta.
- Entrenar modelos fundacionales o crear aprendizaje implícito a partir de chats no aprobados.
