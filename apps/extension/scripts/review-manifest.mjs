// Revisión de manifiesto/política Fase 4: permisos mínimos, sin hosts v1, ≤4 comandos.
import * as fs from "node:fs";

const m = JSON.parse(fs.readFileSync(new URL("../manifest/base.json", import.meta.url), "utf8"));
const fails = [];
if (m.manifest_version !== 3) fails.push("manifest_version debe ser 3");
const allowedPerms = ["storage", "scripting", "activeTab", "clipboardWrite", "offscreen"];
for (const p of m.permissions ?? []) if (!allowedPerms.includes(p)) fails.push(`permiso no permitido: ${p}`);
for (const bad of ["history", "webRequest", "<all_urls>", "tabs", "clipboardRead"]) {
  if ((m.permissions ?? []).includes(bad)) fails.push(`prohibido: ${bad}`);
}
if (m.host_permissions?.length) fails.push("sin host_permissions en v1 (usar activeTab)");
const cmds = Object.entries(m.commands ?? {});
if (cmds.length > 4) fails.push(`comandos con sugerencia >4: ${cmds.length}`);
for (const [name, c] of cmds) {
  const k = c.suggested_key?.default ?? "";
  if (/Ctrl\+Alt/i.test(k)) fails.push(`${name}: prohibido Ctrl+Alt`);
  if (k && !/^(Ctrl|Alt|Command|MacCtrl)/.test(k)) fails.push(`${name}: debe incluir Ctrl/Alt/Command`);
}
if (!m.action?.default_popup) fails.push("falta action.default_popup");
if (!m.options_page) fails.push("falta options_page");
if (m.background?.type !== "module") fails.push("background debe ser module");
if (fails.length) {
  console.error("MANIFEST REVIEW FAIL:\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(`manifest OK: ${cmds.length} comandos, permisos [${(m.permissions ?? []).join(",")}]`);
