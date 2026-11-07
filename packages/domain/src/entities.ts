// @ezzy/domain — entidades puras, sin chrome.* ni fetch. Dinero en minor (entero), fechas UTC ISO-8601.
export type EntityStatus = "active" | "archived";
export type MessageStatus = "draft" | "approved" | "archived";

export interface Product {
  id: string;
  sku?: string;
  name: string;
  category_id?: string;
  description: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  revision: number;
}

export interface Variant {
  id: string;
  product_id: string;
  label: string;
  size?: string;
  color?: string;
  attributes: Record<string, string>;
  active: boolean;
  revision: number;
}

export interface Price {
  id: string;
  product_id?: string;
  variant_id?: string;
  amount_minor: number; // entero >= 0, nunca float
  currency: string; // ISO 4217, ej PEN USD
  valid_from?: string;
  valid_to?: string;
  source: string;
  verified_at: string;
  revision: number;
}

export interface Promotion {
  id: string;
  name: string;
  rules: { product_ids?: string[]; percent_off?: number; note?: string };
  starts_at: string;
  ends_at: string;
  status: EntityStatus;
  verified_at: string;
  revision: number;
}

export interface ApprovedMessage {
  id: string;
  title: string;
  body: string;
  intent: string;
  channel: string;
  tags: string[];
  status: MessageStatus;
  verified_at: string;
  revision: number;
  command_alias?: string;
}

export interface Strategy {
  id: string;
  title: string;
  body: string;
  category: string;
  status: MessageStatus;
  revision: number;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function newId(): string {
  return crypto.randomUUID();
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function validateProduct(p: Product): void {
  assert(isUuid(p.id), "product.id debe ser UUID");
  assert(p.name.trim().length > 0, "product.name requerido");
  assert(Number.isInteger(p.revision) && p.revision >= 1, "product.revision >=1");
}

export function validatePrice(p: Price): void {
  assert(isUuid(p.id), "price.id UUID");
  assert(!!p.product_id || !!p.variant_id, "price requiere product_id o variant_id");
  assert(Number.isInteger(p.amount_minor) && p.amount_minor >= 0, "price.amount_minor entero >=0 (nunca float)");
  assert(/^[A-Z]{3}$/.test(p.currency), "price.currency ISO-4217 (PEN/USD)");
  assert(!Number.isNaN(Date.parse(p.verified_at)), "price.verified_at UTC");
  if (p.valid_from) assert(!Number.isNaN(Date.parse(p.valid_from)), "price.valid_from UTC");
  if (p.valid_to) assert(!Number.isNaN(Date.parse(p.valid_to)), "price.valid_to UTC");
}

export function isPriceValidNow(p: Price, at = new Date()): boolean {
  const t = at.getTime();
  if (p.valid_from && Date.parse(p.valid_from) > t) return false;
  if (p.valid_to && Date.parse(p.valid_to) < t) return false;
  return true;
}

export function validatePromotion(p: Promotion): { ok: boolean; reason?: string } {
  if (!isUuid(p.id)) return { ok: false, reason: "id no UUID" };
  if (Date.parse(p.starts_at) >= Date.parse(p.ends_at)) return { ok: false, reason: "starts_at debe ser < ends_at" };
  if (p.status === "active" && Date.parse(p.ends_at) < Date.now())
    return { ok: false, reason: "vencida pero status active" };
  return { ok: true };
}

export function validateMessage(m: ApprovedMessage): void {
  assert(isUuid(m.id), "message.id UUID");
  assert(m.title.trim().length > 0 && m.body.trim().length > 0, "message title/body requeridos");
  assert(["draft", "approved", "archived"].includes(m.status), "message.status inválido");
}

export function renderMessage(body: string, vars: Record<string, string>): string {
  // Variables {{nombre}} — se reemplazan y lo faltante queda visible para revisión (fail-closed UX).
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k: string) =>
    vars[k] !== undefined ? vars[k] : m
  );
}

export function searchHaystack(...parts: Array<string | string[] | undefined>): string {
  return parts
    .flatMap((p) => (Array.isArray(p) ? p : [p ?? ""]))
    .join(" ")
    .toLowerCase();
}
