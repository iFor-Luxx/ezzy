# 10. Extensión Chrome y WhatsApp Web

## Alcance

Ezzy es una extensión Chrome Manifest V3 de uso principal, preparada para que el usuario trabaje en distintos equipos y perfiles con WhatsApp Web personal y Business Web. Su función principal es activar mensajes aprobados mediante comandos de teclado, selector rápido o popup. No envía mensajes.

## Restricciones de seguridad operativa

- Sin lectura automática, polling del DOM, content scraping continuo, historial masivo, extracción de contactos ni escaneo en segundo plano.
- Sin envío, pulsación de botón enviar, simulación de teclado para enviar, scheduling o automatización de respuestas.
- Los comandos se configuran mediante `chrome.commands` cuando sea posible; si Chrome bloquea una combinación, se ofrece selector rápido en popup/overlay.
- Cuando se use selección/copiar texto, el usuario elige y confirma el fragmento; la extensión no recoge chats adyacentes.
- No guardar cookies, local storage, tokens de WhatsApp ni credenciales. No alterar el comportamiento del sitio.
- Ezzy puede copiar o insertar la plantilla en el compositor tras una acción explícita y verificable. El usuario revisa y pulsa Enviar manualmente.

## MV3 propuesta

- `service_worker`: comandos, coordinación y estado persistido; tolera suspensión MV3.
- `content_script`: UI/inserción bajo demanda; sin escaneo ni lectura continua de chats.
- `popup`: búsqueda y activación rápida de respuestas.
- `options`: editar catálogo, mensajes, comandos, IA y sincronización.

Permisos mínimos: `storage`, `commands` y permisos de host solo si se justifican para WhatsApp Web. Evitar `history`, `webRequest` y acceso global. Verificar si se requiere permiso `activeTab`/`scripting` para inserción explícita. Revisar el manifiesto contra políticas Chrome Web Store vigentes.

## Perfiles

Los datos de extensión no se comparten automáticamente entre perfiles o equipos. El usuario debe iniciar sesión/enrolar cada instalación al mecanismo de sync privado; no sincronizar cookies ni credenciales de WhatsApp. El número máximo de equipos/perfiles queda por definir. La operación simultánea no se presupone.

## Manejo del riesgo

No prometer protección contra bloqueos: el sistema reduce automatización al limitarse a acciones explícitas, pero WhatsApp puede modificar políticas o detección. Si cambia la interfaz o deja de reconocerse el contexto, fallar cerrado y pedir selección/entrada manual.
