# Recuperación, retención e incidentes (Fase 6)

## Retención
- Generaciones/temporales: 30d local (7-90d configurable), purga auto + botón Borrar. No sync por defecto.
- Auditoría/consentimiento: 180d local, solo metadatos. Tombstones remotos: 90d tras confirmación.
- Backups: exportación local cifrada (ruta elegida), verificación/restauración probada antes de migrar.

## Recuperación
- Dispositivo perdido: desde sano `revoke(installationId)` (<15min expira), rotar OpenCode key, limpiar temporales, re-enrolar limpio.
- Mnemónico perdido + ≥1 sano: rotar secret y reemitir. Todo perdido: borrado manual vía dashboard Cloudflare + re-bootstrap (pérdida local esperada).
- Migración: backup previo obligatorio; `migrateDb` v1→v4 conserva datos (test).

## Incidentes (sin telemetría automática)
1. Revocar key OpenCode. 2. Pausar sync (`blocked`). 3. Desconectar dispositivo. 4. `wipeTemporals`. 5. Exportar logs redactados (`recordToLogLine`, sin prompt/key). 6. Evaluar borrado remoto (`DELETE /owner/purge` doble confirmación).
