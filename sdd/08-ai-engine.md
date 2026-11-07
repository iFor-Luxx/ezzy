# 8. Motor de IA

## Alcance

La API key del usuario para OpenCode se configura localmente. Proveedor, identificador de modelo, endpoint, formato multimodal, región, retención y límites están diferidos. El adaptador `ai-opencode` aísla estos detalles para no acoplar dominio ni UI.

## Generación híbrida

1. Recuperar primero mensajes aprobados por intención, canal, producto y vigencia.
2. Recuperar hechos estructurados verificados: precio, variante, atributos, promoción vigente y fuente.
3. Si existe buen mensaje, ofrecerlo como base y permitir reescritura natural; si no, redactar desde los hechos y estrategias aprobadas.
4. Adjuntar contexto de conversación solo si el usuario lo revisó y autorizó para esa solicitud.
5. Mostrar fuentes, fecha de verificación, elementos inciertos y texto generado.
6. Ejecutar validadores deterministas antes de presentar como listo para copiar.

## Protección contra invención

- El prompt delimita los hechos como datos, no como instrucciones; el texto de conversación se considera entrada no confiable.
- Precios, tallas, disponibilidad y condiciones promocionales solo se declaran desde hechos vigentes.
- Una afirmación sin fuente se marca “por confirmar” y no puede publicarse como afirmación factual sin aprobación del usuario.
- El validador compara números, moneda, fechas, nombres de producto y claims del borrador contra las fuentes.
- Ofrecer revisión o abstención si faltan datos; nunca rellenar con conocimiento general del modelo.

## Capturas/visión

La captura de pantalla y OCR dejan de ser parte del flujo principal de la extensión. El camino inicial usa mensajes aprobados y hechos del catálogo; el usuario puede seleccionar/pegar contexto de forma consciente. Cualquier futura función visual requiere comprobar APIs y permisos MV3, mostrar exactamente qué se transmite y pedir confirmación; no almacenar ni sincronizar imágenes. Si destino o política no son conocidos, permitir texto manual y no transmitir imagen.

## Privacidad y secretos

- API key nunca en preferencias sincronizadas, logs, content scripts, prompts o reportes. La persistencia segura de una credencial desde una extensión pura sigue pendiente; no guardar en `chrome.storage` hasta aprobar una estrategia de riesgo aceptable.
- Mostrar qué contexto se envía y permitir eliminar datos personales antes de confirmar.
- No se entrena modelo ni se añade nada a knowledge base automáticamente.
- Registrar localmente proveedor/modelo configurado, timestamp, fuentes, resultado de validación y decisión, sin prompt o screenshot completo por defecto.

## Errores y límites

Timeout y reintentos acotados; no reintentar solicitudes multimodales automáticamente sin informar. Cuotas/costos del proveedor OpenCode son responsabilidad de configuración local y deben mostrarse si el API lo soporta; pendiente confirmar el producto. Desconexión permite búsqueda y plantillas locales.

## Evaluación

Corpus sintético de ventas en español: fidelidad factual, uso de plantilla aprobada, tono editable, abstención ante dato faltante, resistencia a prompt injection y no filtración de secretos. No usar conversaciones reales sin anonimización/consentimiento y proceso de evaluación aprobado.
