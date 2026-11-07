# 01 — Estrategia comandos Chrome MV3

Fuentes: developer.chrome.com/docs/extensions/reference/api/commands, activeTab, scripting, storage, offscreen, permissions-list.

## Límites verificados

- Máx 4 comandos con `suggested_key`. Más comandos permitidos pero sin atajo por defecto (asignación manual en `chrome://extensions/shortcuts`).
- Sintaxis: debe incluir `Ctrl` o `Alt` (macOS: `Command`/`MacCtrl`/`Option`). Prohibido `Ctrl+Alt`. Teclas: A-Z 0-9 + Comma/Period/Home/End/PageUp/PageDown/Space/Insert/Delete/arrows + media.
- Prioridad SO/Chrome: atajo en conflicto no dispara. `_execute_action` reservado (abre popup, no dispara onCommand).
- Global: solo `Ctrl+Shift+[0..9]`, ChromeOS sin globales.
- Conflicto entre extensiones: no registra en silencio. Detectar con `commands.getAll()` (`shortcut==''` = conflicto).

## Permisos v1 (mínimos)

- `permissions: ["storage","scripting","activeTab","clipboardWrite"]` (+ `offscreen` solo si se copia desde SW — preferible evitar).
- `commands` NO va en `permissions`, es clave top-level del manifest.
- Sin `host_permissions` en v1. `activeTab` da host temporal tras gesto válido (incluye atajo commands) para `scripting.executeScript()` en `web.whatsapp.com`. Sin warning.
- `host_permissions: ["https://web.whatsapp.com/*"]` solo si overlay persistente lo exige. Costo: warning "Leer y cambiar tus datos..." + fricción Web Store. Evaluar `optional_host_permissions` después.
- No declarar `clipboardRead`, `history`, `webRequest`, `<all_urls>`.

## Clipboard / inserción

- SW no tiene `navigator.clipboard`. Copiar desde SW exige offscreen `CLIPBOARD`.
- Vía recomendada: inyectar en pestaña (activeTab ya concedido) y `writeText` o inserción directa en `contenteditable` del composer + disparar `input` para que React lo registre. Mundo `ISOLATED` por defecto.
- Lectura (`clipboardRead`) no se declara — coherente con prohibición de leer chats.

## Storage

- `local`: 10MB por máquina, no se comparte. `sync`: ~100KB/8KB por ítem/512 ítems/120-min, solo si Chrome Sync activo — no sirve para catálogo. `session`: 10MB RAM, se vacía al cerrar navegador.
- Implicación: catálogo en `local` + IndexedDB (imágenes solo local). Sync multi-equipo requiere backend propio, nunca `chrome.storage.sync`.

## Decisión Fase 0

1. ≤4 comandos genéricos: `abrir-selector`, `favorito-1..3` (ej. `Ctrl+Shift+Y/U/I/O`, a validar que no colisionen).
2. Selector popup/overlay con búsqueda = vía principal escalable.
3. Flujo: `onCommand → executeScript(activeTab) → overlay con plantillas de storage.local → inserción explícita tras confirmación → usuario revisa y Envía`.
4. Fail-closed: si DOM cambia o no hay gesto, pedir pegado manual.
5. Service worker: solo coordinador efímero (30s inactividad, fetch >30s muere). Persistir todo, rehidratar por evento. Sync por alarms (mín 30s), sin polling DOM.
