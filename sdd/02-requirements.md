# 2. Requisitos

## Funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| FR-01 | Crear, editar, buscar, archivar y versionar productos y variantes con precio, moneda, tela, colores, tallas, beneficios y notas verificadas. | Must |
| FR-02 | Gestionar promociones con vigencia, reglas, productos aplicables y texto explicativo; detectar datos incompletos o fechas vencidas. | Must |
| FR-03 | Administrar mensajes aprobados, borradores y archivados, con etiquetas, intención, canal y fecha de revisión. | Must |
| FR-04 | Registrar estrategias comerciales y preguntas frecuentes como conocimiento curado por el usuario. | Should |
| FR-05 | Usar Ezzy en distintos equipos/perfiles para WhatsApp personal y Business; no guardar cookies ni credenciales de WhatsApp. | Must |
| FR-06 | Asignar comandos de teclado a mensajes aprobados y ofrecer selector rápido si Chrome impide un atajo. | Must |
| FR-07 | Extraer contexto textual mediante OCR local o análisis manual aprobado; mostrar y permitir corregir texto antes de enviar a IA. | Must |
| FR-08 | Generar propuestas de respuesta basadas en mensajes aprobados y hechos actuales del catálogo; diferenciar hechos y sugerencias. | Must |
| FR-09 | Permitir reescritura natural de una propuesta sin alterar hechos verificados; marcar contradicciones o afirmaciones sin fuente. | Must |
| FR-10 | Copiar una respuesta al portapapeles para que el usuario la pegue y envíe manualmente. No automatizar el envío. | Must |
| FR-11 | Permitir seleccionar voluntariamente fragmentos de texto para aprendizaje; anonimizar, previsualizar, aprobar y confirmar inclusión. | Must |
| FR-12 | Mantener auditoría local de generaciones, validaciones, aprobaciones y sincronizaciones con retención configurable. | Should |
| FR-13 | Sincronizar solo entidades estructuradas permitidas entre dispositivos propios; soportar modo offline, reintentos y resolución visible de conflictos. | Must |
| FR-14 | Exportar e importar datos estructurados y respaldar/restaurar la base local, sin incluir medios salvo consentimiento local explícito futuro. | Should |
| FR-15 | Mostrar estado de conexión, último sync, cuota conocida y bloqueos por riesgo de costo. | Must |

## No funcionales

- **NFR-01 Seguridad:** no persistir la API key en almacenamiento de extensión sin una estrategia revisada; nunca incluir secretos en logs, payloads sync o content scripts.
- **NFR-02 Privacidad:** ningún acceso continuo a conversaciones; todo contexto visual o textual se origina por acción explícita.
- **NFR-03 Datos:** sincronización remota excluye medios y rutas absolutas locales; puede incluir referencias lógicas inocuas.
- **NFR-04 Offline:** CRUD del catálogo y consulta de mensajes funcionan sin red; IA/sync indican claramente cuando no disponibles.
- **NFR-05 Integridad:** precios y promociones se almacenan decimalmente (no float); operaciones de sync idempotentes y versionadas.
- **NFR-06 Mantenibilidad:** módulos por dominio, contratos versionados, migraciones incrementales y límites de dependencia documentados.
- **NFR-07 Costo:** ninguna solicitud se envía a un recurso Cloudflare de pago ni excede una cuota cuya consecuencia pueda generar cobro.
- **NFR-08 UX:** el usuario ve contexto transmitido a OpenCode, confirma el uso y puede cancelar; pantalla de error no pierde borradores.
- **NFR-09 Auditoría:** cambios y aprobaciones significativos tienen actor (propietario), fecha y referencia de origen, sin conservar texto sensible innecesario.
- **NFR-10 Compatibilidad:** soporte de Chrome MV3; verificar límites de comandos y permisos y el comportamiento en perfiles/equipos aislados.

## Reglas de negocio e invariantes

1. Ningún mensaje se envía desde el software a WhatsApp.
2. Un hecho comercial sugerido debe apuntar a fuente vigente o aparecer como no verificado y excluirse del texto final hasta confirmación.
3. Un ejemplo de conversación no entra en la base de conocimiento sin todas las aprobaciones descritas en FR-11.
4. Los medios nunca se sincronizan; el proceso de serialización los rechaza, no solo la interfaz.
5. Un fallo de conexión, cuota o presupuesto deja el cambio en cola local y no inicia una alternativa potencialmente pagada.
6. Cuenta y sincronización pertenecen a un único propietario; el servidor no crea espacios públicos ni enlaces compartidos.

## Casos de uso críticos

- Editar producto offline y sincronizar más tarde.
- Capturar manualmente una porción de pantalla, revisar texto extraído, generar respuesta, validar hechos y copiarla.
- Activar un mensaje aprobado mediante comando, revisar su vista previa y copiarlo para envío manual.
- Seleccionar un texto, anonimizar y aprobarlo; cancelar en cualquier etapa sin conservar original en nube.
- Detectar límite agotado y bloquear sync antes de una operación facturable.
