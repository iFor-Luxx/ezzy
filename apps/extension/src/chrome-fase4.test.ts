import { describe, expect, test } from "bun:test";
import { resolveFavorite, detectConflicts, setFavorite } from "./background/commands";
import { loadState, saveState } from "./background/state";
import { newInstallation, validateInstallation } from "./background/installation";
import { isSupportedUrl, composerLookupCode } from "./content/targets";
import { listVars, renderWithVars } from "./popup/activate";

describe("Fase 4 extensión Chrome", () => {
  test("favorito resuelve o cae a selector", () => {
    const msgs = [{ id: "m1", status: "approved" }, { id: "m2", status: "draft" }];
    expect(resolveFavorite(1, { "1": "m1" }, msgs)).toMatchObject({ action: "insert" });
    expect(resolveFavorite(1, {}, msgs).action).toBe("open_selector");
    expect(resolveFavorite(2, { "2": "m2" }, msgs)).toMatchObject({ action: "open_selector" });
    expect(() => setFavorite({}, 4, "m1")).toThrow();
  });
  test("detecta atajos en conflicto", () => {
    expect(detectConflicts([{ name: "a", shortcut: "" }])).toHaveLength(1);
    expect(detectConflicts([{ name: "a", shortcut: "Ctrl+Shift+Y" }])).toHaveLength(0);
  });
  test("estado SW rehidrata (tolera suspensión)", async () => {
    const mem: Record<string, unknown> = {};
    const kv = { get: async (k: string) => ({ [k]: mem[k] }), set: async (o: Record<string, unknown>) => { Object.assign(mem, o); } };
    await saveState(kv, { favorites: { "1": "m1" } });
    expect((await loadState(kv)).favorites["1"]).toBe("m1");
  });
  test("instalación aislada por perfil", () => {
    const i = newInstallation("PC casa");
    expect(() => validateInstallation(i)).not.toThrow();
    expect(() => newInstallation("")).toThrow();
  });
  test("targets WhatsApp personal/Business + fail-closed", () => {
    expect(isSupportedUrl("https://web.whatsapp.com/")).toBe(true);
    expect(isSupportedUrl("https://chrome.google.com/")).toBe(false);
    expect(composerLookupCode()).toContain("no-composer");
  });
  test("variables se completan y lo faltante queda visible", () => {
    expect(listVars("Hola {{nombre}} {{nombre}}")).toEqual(["nombre"]);
    const r = renderWithVars("Hola {{nombre}}", {});
    expect(r.missing).toEqual(["nombre"]);
    expect(r.text).toContain("{{nombre}}");
    expect(renderWithVars("Hola {{nombre}}", { nombre: "Ana" }).missing).toHaveLength(0);
  });
});
