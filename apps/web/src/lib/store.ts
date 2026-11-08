import React from "react";

// Estado del panel: persiste en localStorage del navegador (solo esta web).
// Puente con la extensión: exportar JSON aquí → importar en Opciones de la extensión.
export interface ProductRow {
  id: string;
  name: string;
  fabric?: string;
  brand?: string;
  description: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  revision: number;
}

export interface VariantRow {
  id: string;
  product_id: string;
  label: string;
  size?: string;
  active: boolean;
  revision: number;
}

export interface PriceRow {
  id: string;
  product_id: string;
  variant_id?: string;
  amount_minor: number;
  currency: string;
  source: string;
  verified_at: string;
  revision: number;
}

export interface MessageRow {
  id: string;
  title: string;
  body: string;
  intent: string;
  channel: string;
  tags: string[];
  status: "draft" | "approved" | "archived";
  verified_at: string;
  revision: number;
  command_alias?: string;
}

export interface AuditRow {
  id: string;
  ts: string;
  action: string;
  detail: string;
}

export interface WebState {
  products: ProductRow[];
  variants: VariantRow[];
  prices: PriceRow[];
  messages: MessageRow[];
  audits: AuditRow[];
}

const KEY = "ezzy.web.v1";

export function emptyState(): WebState {
  return { products: [], variants: [], prices: [], messages: [], audits: [] };
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function validateMinor(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (!Number.isInteger(n) || n < 0) throw new Error("precio minor entero >= 0");
  return n;
}

// UX: el usuario escribe soles (49.90) y se convierte a minor (4990). Acepta coma decimal.
export function solesToMinor(input: string): number {
  const norm = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(norm)) throw new Error("precio inválido (ej 49.90)");
  const minor = Math.round(Number(norm) * 100);
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error("precio inválido");
  return minor;
}

export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

// Precios por cantidad: la variante "x6" significa "llevando 6".
export function tierLabel(qty: number): string {
  return `x${qty}`;
}

export function parseTierLabel(label: string): number | null {
  const m = /^x(\d+)$/.exec(label.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : null;
}

export function validateQty(input: string): number {
  const n = Number(input.trim());
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new Error("cantidad entera ≥ 1");
  return n;
}

export function prettyVariant(label: string): string {
  const q = parseTierLabel(label);
  return q === null ? label : `×${q}`;
}

export function validateCurrency(c: string): string {
  const v = c.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(v)) throw new Error("moneda ISO-4217 (ej PEN)");
  return v;
}

// Formato puente: el mismo que Opciones → Restaurar de la extensión acepta.
export function buildBridge(s: WebState): object {
  return {
    version: 1,
    exported_at: nowIso(),
    tables: { products: s.products, variants: s.variants, prices: s.prices, approved_messages: s.messages },
  };
}

export function parseBridge(json: unknown): Pick<WebState, "products" | "variants" | "prices" | "messages"> {
  if (typeof json !== "object" || json === null) throw new Error("JSON inválido");
  const tables = (json as Record<string, unknown>)["tables"] as Record<string, unknown> | undefined;
  if (!tables) throw new Error("falta tables (exporta desde el panel o la extensión)");
  for (const t of ["products", "variants", "prices", "approved_messages"]) {
    if (tables[t] !== undefined && !Array.isArray(tables[t])) throw new Error(`tabla ${t} inválida`);
  }
  const clean = (rows: unknown): Record<string, unknown>[] =>
    (Array.isArray(rows) ? rows : []).filter((r) => typeof r === "object" && r !== null && typeof (r as Record<string, unknown>)["id"] === "string") as Record<string, unknown>[];
  return {
    products: clean(tables["products"]) as unknown as ProductRow[],
    variants: clean(tables["variants"]) as unknown as VariantRow[],
    prices: clean(tables["prices"]) as unknown as PriceRow[],
    messages: clean(tables["approved_messages"]) as unknown as MessageRow[],
  };
}

export function useWebState(): [WebState, React.Dispatch<React.SetStateAction<WebState>>] {
  const [s, setS] = React.useState<WebState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      const p = JSON.parse(raw) as Partial<WebState>;
      return { products: p.products ?? [], variants: (p as Partial<WebState>).variants ?? [], prices: p.prices ?? [], messages: p.messages ?? [], audits: p.audits ?? [] };
    } catch {
      return emptyState();
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // almacenamiento lleno o bloqueado: se sigue en memoria
    }
  }, [s]);
  return [s, setS];
}

export function audit(s: WebState, action: string, detail: string): WebState {
  return { ...s, audits: [{ id: newId(), ts: nowIso(), action, detail }, ...s.audits].slice(0, 200) };
}

export function seedExample(): WebState {
  const pid = newId();
  const now = nowIso();
  const vid = newId();
  return {
    products: [{ id: pid, name: "Polo piqué (ejemplo)", fabric: "Algodón", description: "Algodón, verificado", status: "active", created_at: now, updated_at: now, revision: 1 }],
    variants: [{ id: vid, product_id: pid, label: "Talla M", size: "M", active: true, revision: 1 }],
    prices: [
      { id: newId(), product_id: pid, amount_minor: 4990, currency: "PEN", source: "ejemplo", verified_at: now, revision: 1 },
      { id: newId(), product_id: pid, variant_id: vid, amount_minor: 5490, currency: "PEN", source: "ejemplo", verified_at: now, revision: 1 },
    ],
    messages: [{ id: newId(), title: "Saludo inicial", body: "Hola {{nombre}}, tenemos {{producto}} a S/ 49.90.", intent: "saludo", channel: "whatsapp", tags: ["saludo"], status: "approved", verified_at: now, revision: 1, command_alias: "saludo" }],
    audits: [{ id: newId(), ts: now, action: "seed", detail: "ejemplo sintético" }],
  };
}
