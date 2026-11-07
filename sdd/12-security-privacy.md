# 12. Seguridad y privacidad

## Modelo de amenazas resumido

Activos: API keys, catálogo/precios, estrategias, texto de clientes, captura y base local. Amenazas: malware/usuario local, robo de dispositivo, filtración accidental por logs/sync, prompt injection en mensaje, extensión comprometida, credencial remota robada, cuota manipulada o cambio de plan que habilite cargos.

## Controles

- Guardar secretos en almacén de credenciales del SO; rotación/revocación documentada.
- Cifrado HTTPS, autorización de propietario, token de sync limitado y rate limiting preventivo.
- IndexedDB y exportaciones se consideran accesibles a quien controle el perfil del navegador; no almacenar secretos allí. Definir estrategia para proteger datos locales sensibles.
- Screenshots no son parte del flujo inicial; cualquier futura captura requerirá acción explícita, retención local mínima y borrado temporal.
- Consentimiento granular antes de transmitir texto/imagen a IA o nube. Mostrar destinatario, contenido y propósito.
- Redacción/anónimo local antes de guardar ejemplos; previsualización y aprobación final obligatorias.
- Separar texto no confiable de instrucciones IA; limitar herramientas y llamadas del modelo.
- Validación de hechos y confirmación manual previas a copiar respuesta.
- Logs allowlisted y sin PII/prompts. Telemetría apagada por defecto.
- Permisos MV3 mínimos; revisión de dependencias, licencias y actualización.

## Política de contexto

Captura, OCR y uso para IA son acciones distintas con confirmaciones visibles. Cancelar revoca la sesión efímera. El usuario puede editar/ocultar datos antes de cualquier envío. Si proveedor, destino, almacenamiento o condiciones de retención no son conocidos, no transmitir y ofrecer entrada manual.

## Retención y derechos

Pendiente definir retención local/remota de auditoría, generaciones y ejemplos; borrado de cuenta/dispositivo; exportación; backups; tratamiento legal de datos de clientes en jurisdicción del usuario. Default: mínimo local necesario, sin retención remota de contexto crudo.

## Respuesta a incidentes

Revocar key, pausar sync, desconectar dispositivo, limpiar temporales, exportar logs redactados y evaluar borrado remoto. No existe telemetría automática que envíe el incidente. Procedimiento y canales de recuperación quedan pendientes.
