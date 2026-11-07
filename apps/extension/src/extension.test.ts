import { describe, expect, test } from "bun:test";
import { resolveCommand, validateExtMessage } from "./background/service-worker";
import { buildInsertScript, validateInsertText } from "./content/whatsapp";

describe("service worker commands", () => {
  test("resuelve 4 comandos", () => {
    expect(resolveCommand("open-selector")).toMatchObject({ action: "open_selector" });
    expect(resolveCommand("favorite-2")).toMatchObject({ action: "insert_favorite", index: 2 });
    expect(() => resolveCommand("otro")).toThrow();
  });
  test("mensajería valida schema/tamaño/secretos", () => {
    expect(validateExtMessage({ schemaVersion: 1, type: "message.search" }).ok).toBe(true);
    expect(validateExtMessage({ schemaVersion: 2, type: "x" }).ok).toBe(false);
    expect(validateExtMessage({ schemaVersion: 1, type: "x", payload: { api_key: "a" } }).ok).toBe(false);
  });
});

describe("content whatsapp", () => {
  test("script inserta y dispara input, sin enviar", () => {
    const s = buildInsertScript("Hola");
    expect(s).toMatch(/insertText/);
    expect(s).not.toMatch(/click|send|Enter/);
  });
  test("valida texto", () => {
    expect(validateInsertText("").ok).toBe(false);
    expect(validateInsertText("Hola").ok).toBe(true);
  });
});
