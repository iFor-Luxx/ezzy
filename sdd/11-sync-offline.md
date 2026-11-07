# 11. Sincronización, offline y datos locales

## Modelo

Local-first. IndexedDB persiste catálogo, mensajes, estrategias, configuración no secreta y cola; `chrome.storage` se reserva para preferencias pequeñas. La nube es una réplica privada para las instalaciones del propietario y metadatos de sincronización. La extensión mantiene consulta/edición sin conexión, salvo IA remota y sync.

## Datos sincronizables

Productos, variantes, precios, atributos, promociones, mensajes aprobados/borradores/archivados, estrategias, FAQs y ejemplos anonimizados aprobados. Preferencias seleccionadas. Sync de auditoría/generaciones está apagado por defecto y sujeto a decisión explícita.

## Exclusiones obligatorias

Imágenes, videos, audio, screenshots, blobs, archivos adjuntos, cookies, claves, rutas absolutas, texto crudo de conversaciones no aprobado, OCR no revisado y datos identificables del cliente. La capa de serialización rechaza estos campos.

## Protocolo

- UUID local y `revision` monotónica por entidad; timestamps informativos, no base única de orden.
- Outbox transaccional local e idempotency key por operación.
- Pull por cursor opaco; ACK de revisiones aplicadas.
- Borrados con tombstones hasta confirmación.
- Conflicto explícito cuando ambas réplicas cambiaron desde la revisión base; vista de comparación y elección usuario.
- Nunca hacer last-write-wins silencioso en precios/promociones o knowledge base.

## Seguridad y UX

TLS, tokens de sync rotables, autorización de propietario y revocación por instalación. Señalar cola pendiente, última sincronización y error. “Sincronizar ahora” permite operación manual; automático solo con consentimiento/configuración futura y límites preventivos. La extensión no debe asumir que IndexedDB está cifrado en reposo.

## Limpieza y recuperación

Exportación local cifrada, backup local con ruta elegida, verificación/restauración y borrado remoto. La ruta de medios se conserva solo local; en otro equipo la referencia queda “no disponible” hasta asociación local. Deben definirse retención, eliminación de dispositivo perdido y recuperación si se pierde credencial.
