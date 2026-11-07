# 14. Despliegue y control de costo Cloudflare

## Política de costo no negociable

El costo Cloudflare permitido es **S/ 0**. Solo se permite configuración de plan gratuito confirmada al momento del despliegue. No activar facturación, método de pago, plan pago, overage, instancia o feature pagada. Si no se puede demostrar que la operación permanece dentro del plan gratuito y límites vigentes, **fallar cerrado**: no desplegar, no enviar, no reintentar en servicio alternativo; conservar cambios localmente.

## Cuotas y límites

Las cuotas, límites, regiones, políticas y condiciones de free tier cambian. En esta etapa son elementos **por verificar**, no garantías. Antes de seleccionar Worker, base de datos u otro componente, registrar en ADR una captura/fecha de documentación oficial y calcular uso previsto con margen preventivo. Configurar límites por debajo de cuota y alertas/bloqueos locales. Si Cloudflare no ofrece una forma confiable de impedir cobros, el recurso no se usa.

## Entornos

- `local`: almacenamiento del navegador y mocks; no requiere recursos Cloudflare.
- `development`: datos sintéticos, aislamiento de cuenta/proyecto, límites mínimos.
- `production`: proyecto privado de propietario, secrets externos al repo, despliegue versionado y rollback documentado.

No usar datos reales de conversaciones en desarrollo. Separar credenciales por entorno y eliminar despliegues de prueba al concluir.

## Controles de despliegue

- Revisión manual de plan/facturación y productos habilitados antes del release.
- Comprobar cuota actual, tamaño/ritmo previsto, costos inducidos y política de excedentes.
- Guardas técnicas: límites duros, presupuesto conservador, kill switch, `COST_GUARD_BLOCKED` y cola offline.
- No crear buckets de objetos para medios. No subir datos de screenshot en pruebas.
- Verificación posterior de uso; al desconocer saldo/cuota, apagar sync remoto.
- Exportación/backups locales permiten continuar sin servicio remoto.

## Distribución cliente

La extensión requiere definir distribución, actualización y revisión de permisos conforme a Chrome. Costos externos de publicación/cuentas son decisiones separadas y no se presumen cubiertos por el requisito Cloudflare S/ 0.
