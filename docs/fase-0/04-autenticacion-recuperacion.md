# 04 — Autenticación, enrolamiento y secretos (ADR-009 propuesto)

## Decisión: híbrido A+C

- A: `owner_secret` 128-bit → mnemónico 12 palabras offline (`crypto.getRandomValues`). Servidor guarda solo hash. `owner_id = HMAC-SHA256`.
- C: keypair ECDSA P-256 por instalación (`extractable:false`), `installation_id = uuidv7`. Auth por challenge→firma→JWT 15min atado a installation_id.
- B Cloudflare Access rechazado como auth primaria Fase 1-2 (dependencia externa, necesita token long-lived igual, riesgo plan). Re-evaluar Fase 3 solo como capa extra.

## Flujos

- Bootstrap instalación 1: generar secret, mostrar mnemónico 1 vez + confirmación resguardo, auto-enrolar, registrar `extension_installation`.
- Enrolar N: nuevo genera keypair + QR (`owner_id+installation_id+pubkey+nonce`), enrolado aprueba con secret o código 6 dígitos un solo uso. Límite 5 instalaciones, fail-closed si excede.
- Runtime: `GET /sync/challenge → POST /sync/token → JWT 15min`. TLS siempre, rate-limit preventivo.
- Pérdida: desde sano `revoke(installation_id)` (<15min expira). Si pierde mnemónico + ≥1 sano: rotar secret y reemitir. Si pierde todo: borrado manual dashboard CF + re-bootstrap (pérdida local esperada).
- Robo: revocar, rotar OpenCode key si estaba en sesión, limpiar temporales.

## API key OpenCode en MV3 pura

- Sin keyring OS viable sin nativo (ADR-002). No obfuscar.
- O2 recomendada Fase 1-2: `chrome.storage.session` (RAM por perfil, sobrevive suspensión SW, se limpia al cerrar). Input password, olvidar ahora, timeout 30min, limpieza onSuspend.
- O1 modo estricto: solo memoria SW. O3 `local` persistente prohibida por defecto (plaintext en disco, viola NFR-01).
- Reglas: solo background guarda key, nunca content-script/logs/sync/audit/clipboard persistente. Solo a endpoint declarado tras consentimiento. O3 solo Fase 3+ con opt-in + banner + ADR.
