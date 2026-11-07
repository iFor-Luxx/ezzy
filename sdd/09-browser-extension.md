# 9. Producto de extensión de navegador

## Decisión de producto

Ezzy será una extensión de navegador como interfaz y superficie principal. Ya no se plantea una aplicación de escritorio Tauri/Rust como requisito del producto. El uso debe funcionar en los equipos donde el usuario abre sus distintas cuentas/perfiles de WhatsApp Web mientras se desplaza.

## Stack propuesto

- TypeScript + React + Vite para popup, páginas de opciones y páginas internas de la extensión.
- Chrome Manifest V3 como plataforma inicial; evaluar otros navegadores compatibles con MV3 por separado.
- shadcn/ui + Tailwind para popup/options, adaptando componentes al espacio reducido.
- Bun workspaces para organizar la extensión y paquetes TypeScript compartidos.
- Service worker MV3 para comandos, coordinación y llamadas API; content scripts mínimos y limitados a dominios autorizados.

Rust/Tauri queda fuera del alcance base. No se requiere companion nativo, native messaging, instalación auxiliar ni backend local. Si una capacidad no cabe dentro de APIs permitidas de la extensión, se documentará como limitación o decisión futura.

## Experiencia central: mensajes por teclado

- El usuario asigna un comando o alias a cada mensaje aprobado.
- Los atajos de Chrome y las restricciones de páginas pueden interceptar o limitar combinaciones. El diseño permite configurar `chrome.commands`, mostrar conflictos y ofrecer selector de teclado dentro de la extensión como alternativa.
- Al ejecutar un comando, Ezzy muestra el mensaje aprobado; una acción explícita permite copiarlo o insertarlo en el compositor cuando la API del navegador lo permita de forma segura.
- El usuario revisa, adapta y envía manualmente. No hay envío automático ni simulación del botón Enviar.
- Variables de plantilla se completan y revisan antes de copiar/insertar.

## Superficies

- Popup: búsqueda rápida, comandos disponibles y activación de mensajes.
- Opciones: catálogo, variantes, promociones, estrategias, mensajes, comandos, sync y privacidad.
- Overlay contextual opcional en WhatsApp Web para abrir selector; nunca observa chats continuamente.
- Almacenamiento local mediante APIs de extensión e IndexedDB.

## Límites de plataforma y pendientes

- Las extensiones no ofrecen un keyring del sistema equivalente a Tauri. Guardar API key en `chrome.storage` tiene riesgo; decidir si OpenCode requiere ingreso por sesión, cifrado local con limitaciones o si se aplaza.
- El service worker MV3 puede suspenderse; la UI y sync deben recuperar estado de almacenamiento persistente.
- Atajos de teclado, portapapeles e inserción en páginas están sujetos a APIs/permisos del navegador; verificar capacidades antes de comprometer el flujo definitivo.
- Chrome no comparte automáticamente el almacenamiento de una extensión entre PCs/perfiles. Se requiere sync autenticado si el usuario quiere mantener los mismos mensajes en todos sus equipos.
- Imágenes y videos permanecen localmente en cada equipo y no son parte del sync.
