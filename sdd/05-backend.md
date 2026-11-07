# 5. Backend de sincronización

## Responsabilidad

El servicio remoto existe solo para sincronizar los datos comerciales del propietario entre sus equipos y mantener cursores/versiones. La aplicación local es el sistema operativo principal. El backend no procesa chats para analítica, no sirve contenido público y no guarda medios.

## Componentes candidatos

- API HTTPS de sincronización sobre Cloudflare Workers en plan gratuito, si la cuota/términos vigentes cubren el uso previsto.
- Almacenamiento estructurado remoto candidato (p. ej., D1 u otro producto Cloudflare gratuito disponible) solo después de verificar cuota, consistencia, límites y costo.
- Autorización de propietario, límite de tamaño/ritmo, validación de esquema, idempotencia y auditoría técnica mínima.

La selección final no se considera aprobada. No se habilitan recursos pagados ni un fallback a servicio de pago.

## Módulos del servicio

- `auth`: verifica credencial de sync y su audiencia/expiración; separación por propietario.
- `sync`: acepta cambios por lotes, detecta duplicados, valida versión y devuelve cambios/cursor.
- `quota_guard`: verifica umbrales y bloquea antes de llegar a consecuencias con costo.
- `schema`: allowlist de campos y tamaño, rechaza contenido binario, URL externa o rutas locales.
- `health`: estado mínimo sin exponer datos personales.

## Límites operativos

- Límite duro de payload, registros por lote y solicitudes por ventana, calibrado con cuotas verificadas.
- Respuesta controlada `QUOTA_BLOCKED` cuando se acerca un umbral preventivo; la operación queda pendiente local.
- No habilitar almacenamiento de objetos para medios; endpoints rechazan multipart/binarios.
- Retención remota mínima necesaria para el estado sincronizado; cambios reemplazados purgados según política acordada.
- Errores no incluyen payload, token ni contenido de producto en logs del proveedor.

## Fallos

Sin conectividad: cola local. Error transitorio: reintento exponencial con jitter y límite. Autorización inválida: pausa y pide reautenticación. Cuota/configuración desconocida o riesgo de pago: bloquear. Conflicto de versión: entregar alternativas al cliente; nunca sobrescribir silenciosamente.

## Aspectos pendientes

Forma de autenticar dispositivos, recuperación de credenciales, cifrado de extremo a extremo frente a cifrado en tránsito/reposo administrado, región, backups gratuitos, eliminación de cuenta y límites actuales de los productos elegidos.
