# 13. Pruebas y criterios de aceptación

## Pirámide

- Unitarias TypeScript: dominio, precios, promociones, consentimiento, allowlist de sync, validación factual.
- Unitarias TypeScript: formularios, estados, presentación de fuentes, flujos de aprobación.
- Contratos: mensajes entre contextos y serialización cliente/servidor, rechazo de campos desconocidos, compatibilidad schema.
- Integración: IndexedDB/migraciones, sync simulado, idempotencia, conflictos y límites preventivos.
- UI E2E con datos sintéticos: comando de teclado, activar mensaje, completar variables, copiar/insertar, consentimiento y cancelación.
- Extensión: manifiesto, permisos, service worker suspendido/reanudado, conflictos de atajos y fallos del sitio.
- Seguridad: escaneo de secretos, prueba de logs, payloads oversized, replay, prompt injection, rechazo binario.

No usar cuentas reales ni conversaciones identificables en fixtures. Las pruebas de WhatsApp se realizan en entorno controlado y no automatizan envíos.

## Criterios de aceptación

1. Crear y editar producto/promoción offline; reiniciar y comprobar persistencia.
2. Mostrar precio, moneda y vigencia correcta; bloquear respuesta factual cuando el dato está ausente/vencido.
3. Un comando configurado activa el mensaje asignado; conflicto o restricción del navegador presenta el selector alternativo.
4. Antes de enviar a OpenCode, usuario inspecciona contexto y confirma; API key nunca aparece en logs, UI de extensión o DB clara.
5. Generación lista fuentes; validadores detectan precio o atributo inventado; el resultado queda como borrador.
6. Acción final disponible es copiar; no existe comando/endpoint de envío a WhatsApp.
7. Aprendizaje exige selección, anonimización, previsualización, aprobación y confirmación; cualquier cancelación evita inclusión.
8. Los mensajes se mantienen separados por instalación local y se sincronizan únicamente tras enrolamiento autorizado del equipo.
9. Sync replica solo DTO permitidos; test intenta subir imagen, screenshot, ruta o secreto y recibe rechazo.
10. Sync desconectado conserva cola; reintento idempotente no duplica datos; conflicto muestra opciones.
11. Simular cuota desconocida, límite preventivo o riesgo de pago bloquea red y mantiene datos locales.
12. Usuario puede exportar y restaurar datos; se documenta qué referencias de medios son solo locales.

## Puertas de salida

Antes de piloto: revisar amenazas, cuotas Cloudflare, términos proveedor IA, manifiesto/permisos, backup/restore y borrado. Antes de versión estable: firma/actualización, compatibilidad OS, prueba recuperación, pruebas de migración y procedimiento de incidente.
