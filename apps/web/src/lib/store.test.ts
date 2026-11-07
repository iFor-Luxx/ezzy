import { describe, expect, test } from "bun:test";
import { buildBridge, parseBridge, validateMinor, validateCurrency, solesToMinor, formatMoney, tierLabel, parseTierLabel, validateQty, prettyVariant, emptyState } from "./store";

describe("puente web ↔ extensión", () => {
  test("exporta formato que la extensión acepta e importa roundtrip", () => {
    const s = { ...emptyState(), products: [{ id: "p1", name: "Polo", description: "", status: "active" as const, created_at: "t", updated_at: "t", revision: 1 }] };
    const b = buildBridge(s) as { tables: Record<string, unknown[]> };
    expect(b.tables["products"]).toHaveLength(1);
    expect(b.tables["approved_messages"]).toHaveLength(0);
    const back = parseBridge(b);
    expect(back.products[0].id).toBe("p1");
  });
  test("variantes: varios precios por prenda", () => {
    const pid = "p1";
    const s = {
      ...emptyState(),
      products: [{ id: pid, name: "Polo", description: "", status: "active" as const, created_at: "t", updated_at: "t", revision: 1 }],
      variants: [
        { id: "vS", product_id: pid, label: "Talla S", active: true, revision: 1 },
        { id: "vM", product_id: pid, label: "Talla M", active: true, revision: 1 },
      ],
      prices: [
        { id: "g", product_id: pid, amount_minor: 4990, currency: "PEN", source: "t", verified_at: "t", revision: 1 },
        { id: "s", product_id: pid, variant_id: "vS", amount_minor: 4990, currency: "PEN", source: "t", verified_at: "t", revision: 1 },
        { id: "m", product_id: pid, variant_id: "vM", amount_minor: 5490, currency: "PEN", source: "t", verified_at: "t", revision: 1 },
      ],
    };
    const b = buildBridge(s) as { tables: Record<string, unknown[]> };
    expect(b.tables["variants"]).toHaveLength(2);
    expect(b.tables["prices"]).toHaveLength(3);
    const back = parseBridge(b);
    expect(back.variants.map((v) => v.label)).toEqual(["Talla S", "Talla M"]);
    expect(back.prices.filter((p) => p.variant_id).map((p) => p.amount_minor)).toEqual([4990, 5490]);
    expect(formatMoney(5490, "PEN")).toContain("54.90");
  });
  test("cantidades x1..x12: etiquetas y validación", () => {
    expect(tierLabel(6)).toBe("x6");
    expect(parseTierLabel("x12")).toBe(12);
    expect(parseTierLabel("Talla M")).toBeNull();
    expect(prettyVariant("x6")).toBe("×6");
    expect(validateQty("12")).toBe(12);
    expect(() => validateQty("0")).toThrow();
    expect(() => validateQty("1.5")).toThrow();
  });
  test("soles → minor y formato", () => {
    expect(solesToMinor("49.90")).toBe(4990);
    expect(solesToMinor("49,90")).toBe(4990);
    expect(solesToMinor("50")).toBe(5000);
    expect(() => solesToMinor("49.999")).toThrow();
    expect(() => solesToMinor("abc")).toThrow();
    expect(formatMoney(4990, "PEN")).toContain("49.90");
  });
  test("rechaza puente inválido y valida dinero", () => {
    expect(() => parseBridge({})).toThrow();
    expect(() => parseBridge({ tables: { products: "x" } })).toThrow();
    expect(validateMinor("4990")).toBe(4990);
    expect(() => validateMinor(19.99)).toThrow();
    expect(validateCurrency("pen")).toBe("PEN");
    expect(() => validateCurrency("S/")).toThrow();
  });
});
