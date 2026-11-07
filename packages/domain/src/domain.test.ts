import { describe, expect, test } from "bun:test";
import {
  isPriceValidNow,
  newId,
  nowIso,
  renderMessage,
  searchMessages,
  validatePrice,
  validatePromotion,
  checkFactual,
  type Price,
} from "./index";

describe("precios decimales como minor (NFR-05)", () => {
  test("rechaza float", () => {
    const p: Price = {
      id: newId(), product_id: newId(), amount_minor: 19.99 as unknown as number,
      currency: "PEN", source: "t", verified_at: nowIso(), revision: 1,
    };
    expect(() => validatePrice(p)).toThrow();
  });
  test("vigencia correcta", () => {
    const base: Price = {
      id: newId(), product_id: newId(), amount_minor: 1999, currency: "PEN",
      source: "t", verified_at: nowIso(), revision: 1,
      valid_from: new Date(Date.now() - 1000).toISOString(),
      valid_to: new Date(Date.now() + 1000).toISOString(),
    };
    expect(isPriceValidNow(base)).toBe(true);
    expect(isPriceValidNow({ ...base, valid_to: new Date(Date.now() - 5000).toISOString() })).toBe(false);
  });
});

describe("promociones", () => {
  test("detecta vencida activa", () => {
    const r = validatePromotion({
      id: newId(), name: "x", rules: {}, status: "active",
      starts_at: new Date(Date.now() - 20000).toISOString(),
      ends_at: new Date(Date.now() - 10000).toISOString(),
      verified_at: nowIso(), revision: 1,
    });
    expect(r.ok).toBe(false);
  });
});

describe("mensajes", () => {
  test("render deja variable faltante visible", () => {
    expect(renderMessage("Hola {{nombre}}", {})).toBe("Hola {{nombre}}");
    expect(renderMessage("Hola {{nombre}}", { nombre: "Ana" })).toBe("Hola Ana");
  });
  test("búsqueda offline", () => {
    const msgs = [
      { id: newId(), title: "Saludo", body: "Hola", intent: "saludo", channel: "wa", tags: [], status: "approved" as const, verified_at: nowIso(), revision: 1 },
    ];
    expect(searchMessages("saludo", msgs)).toHaveLength(1);
    expect(searchMessages("despedida", msgs)).toHaveLength(0);
  });
});

describe("validador factual", () => {
  test("bloquea precio sin fuente", () => {
    const r = checkFactual("Cuesta S/ 49.90", { prices: [], promotions: [], products: [] });
    expect(r.ok).toBe(false);
    expect(r.issues[0]).toMatch(/por confirmar/);
  });
});
