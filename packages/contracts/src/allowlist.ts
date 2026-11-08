// @ezzy/contracts — schemaVersion + allowlist DTO. Rechaza en serialización (no solo UI).
export const SCHEMA_VERSION = 1;

export const SYNCABLE_TYPES = [
  "product",
  "variant",
  "price",
  "promotion",
  "approved_message",
  "strategy",
  "faq",
  "knowledge_example",
  "extension_installation",
  "app_setting",
] as const;
export type SyncableType = (typeof SYNCABLE_TYPES)[number];

const ALLOWLIST: Record<SyncableType, string[]> = {
  product: ["id", "sku", "name", "category_id", "description", "fabric", "brand", "status", "created_at", "updated_at", "revision"],
  variant: ["id", "product_id", "label", "size", "color", "attributes", "attributes_json", "active", "revision"],
  price: ["id", "product_id", "variant_id", "amount_minor", "currency", "valid_from", "valid_to", "source", "verified_at", "revision"],
  promotion: ["id", "name", "rules", "rules_json", "starts_at", "ends_at", "status", "verified_at", "revision"],
  approved_message: ["id", "title", "body", "intent", "channel", "tags", "status", "verified_at", "revision", "command_alias"],
  strategy: ["id", "title", "body", "category", "status", "revision"],
  faq: ["id", "question", "answer", "source_refs", "status", "revision"],
  knowledge_example: ["id", "anonymized_text", "category", "approved_at", "provenance", "revision"],
  extension_installation: ["id", "user_label", "browser_family", "enrolled_at", "enabled"],
  app_setting: ["key", "value", "updated_at"],
};

// Patrones prohibidos: binarios, rutas absolutas, secretos, URLs que delegan carga.
const FORBIDDEN_KEY_RE = /(blob|image|video|audio|screenshot|secret|api_key|apikey|token|password|cookie|localstorage|path|route|file)/i;
const ABS_PATH_RE = /(^[A-Za-z]:\\|\/home\/|\/Users\/|file:\/\/|C:\\\\|\\\\\\\\)/;
const URL_RE = /^https?:\/\//i;

export interface SanitizeResult {
  ok: boolean;
  reason?: string;
  dto?: Record<string, unknown>;
}

function hasForbiddenValue(v: unknown): boolean {
  if (typeof v === "string") {
    if (ABS_PATH_RE.test(v)) return true;
    // URLs solo se permiten en source_refs explícitos; en el resto se rechazan.
    return false;
  }
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) return true;
  return false;
}

export function toSyncDto(entityType: string, entity: Record<string, unknown>): SanitizeResult {
  if (!SYNCABLE_TYPES.includes(entityType as SyncableType))
    return { ok: false, reason: `tipo no sincronizable: ${entityType}` };
  const allowed = ALLOWLIST[entityType as SyncableType];
  for (const k of Object.keys(entity)) {
    if (!allowed.includes(k)) return { ok: false, reason: `campo no permitido: ${k}` };
    if (FORBIDDEN_KEY_RE.test(k)) return { ok: false, reason: `clave sensible: ${k}` };
  }
  const dto: Record<string, unknown> = {};
  for (const k of allowed) {
    const v = entity[k];
    if (v === undefined) continue;
    if (typeof v === "string" && hasForbiddenValue(v)) {
      // Excepción: source_refs puede contener URLs declaradas.
      if (!(entityType === "faq" && k === "source_refs")) return { ok: false, reason: `valor prohibido en ${k}` };
    }
    if (v instanceof Uint8Array || v instanceof ArrayBuffer)
      return { ok: false, reason: `binario prohibido en ${k}` };
    if (typeof v === "string" && URL_RE.test(v) && k !== "source" && k !== "provenance" && k !== "source_refs")
      return { ok: false, reason: `URL externa prohibida en ${k}` };
    if (v !== undefined) dto[k] = v;
  }
  // knowledge_example exige approved_at
  if (entityType === "knowledge_example" && !dto["approved_at"])
    return { ok: false, reason: "knowledge_example sin approved_at" };
  // app_setting nunca secretos
  if (entityType === "app_setting" && typeof dto["key"] === "string" && FORBIDDEN_KEY_RE.test(dto["key"] as string))
    return { ok: false, reason: "app_setting sensible" };
  return { ok: true, dto };
}

export const MAX_BATCH = 50;
export const MAX_PAYLOAD_BYTES = 64 * 1024;

export function checkBatchSize(items: unknown[], payloadBytes: number): SanitizeResult {
  if (items.length > MAX_BATCH) return { ok: false, reason: `lote >${MAX_BATCH}` };
  if (payloadBytes > MAX_PAYLOAD_BYTES) return { ok: false, reason: "payload >64KB" };
  return { ok: true };
}
