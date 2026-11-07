# 02 — Límites OpenCode y adaptador ai-opencode

Fuentes: opencode.ai/docs/console/api/inference, /models, /legal/privacy-policy.

## Endpoints

- Prepago: `https://opencode.ai/inference` · Go: `https://opencode.ai/inference/go`
- `POST /inference/openai/v1/chat/completions` (texto, recomendado inicial)
- `POST /inference/openai/v1/responses` (GPT), `POST /inference/anthropic/v1/messages` (Claude/Qwen, requiere max_tokens), `POST /inference/google/v1beta/models/<model>:generateContent` (Gemini)
- Auth: `Authorization: Bearer oc_sk_...` Permiso mínimo `Restricted / Models: Request`. 401 = revocada, 403 = sin permiso.
- Listar: `GET /inference/v1/models` (poblar selector, no adivinar IDs).

## Modelos / costo

- Inicial sugerido (baratos paid): `glm-5.3-flash / kimi-k2.5 / gpt-5-nano`.
- Excluir `*-free`, `big-pickle`, `iceman-free`, `beam-free` para datos ventas: 403 desde externos y/o permiten retención/entrenamiento. `muse-spark-*-contributor` exige consentimiento training — no usar para ventas.
- Respuesta incluye `usage.cost + usage.opencode.*` para mostrar costo si el API lo soporta.
- Multimodal: formato OpenAI `image_url data:...`, Anthropic `image base64`, Gemini `inlineData`, pero solo si modelo declara `modalities input text+image`. Mantener texto-solo por defecto (SDD difiere visión).

## Privacidad

- Región US y EU. Paid: zero-retention salvo OpenAI 30d, Anthropic 30d, Mistral según política. OpenCode declara no almacenar prompts (solo metadatos a Honeycomb/SST).
- Regla: nunca PII en prompts, nunca free-models para contexto ventas, documentar 0d vs 30d según proveedor.

## Adaptador aislado

- `domain/ports/AiPort` + `infra/ai/opencode/{client,models,mapper,validator}` — único que conoce baseURL/formatos/key.
- Config en `chrome.storage.local` (no sync): `{provider, baseURL, apiFamily, modelId, updatedAt}`. Key solo `chrome.storage.session` (ver 04).
- Pre-envío: modal con modelo, endpoint, costo estimado, hechos + contexto (checkbox redactable), aviso US/EU + retención + Confirmar/Cancelar.
- Log local: `{ts, provider, modelId, fuentes, validatorResult, decisión}` — sin prompt/screenshot (hash opcional).
- Timeout 30s AbortController, 1 reintento solo red/5xx/429, nunca 400/401/403. Multimodal no reintenta sin informar.
