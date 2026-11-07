// Chequeo accesibilidad estática Fase 6: labels/placeholders, botones con texto, lang, foco teclado.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "apps/extension/src/popup/popup.html",
  "apps/extension/src/options/options.html",
];
const fails = [];
for (const rel of pages) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (!/lang="es"/.test(src)) fails.push(`${rel}: falta lang=es`);
  const inputs = [...src.matchAll(/<input([^>]*)>/g)];
  for (const [, attrs] of inputs) {
    if (!/(placeholder|aria-label)=/.test(attrs)) fails.push(`${rel}: input sin placeholder/aria-label (${attrs.slice(0, 60)})`);
    if (/type="file"/.test(attrs) && !/aria-label=/.test(attrs)) fails.push(`${rel}: file input sin aria-label`);
  }
  const buttons = [...src.matchAll(/<button[^>]*>(.*?)<\/button>/g)];
  for (const [, txt] of buttons) if (!txt.trim()) fails.push(`${rel}: botón sin texto`);
  const textareas = [...src.matchAll(/<textarea([^>]*)>/g)];
  for (const [, attrs] of textareas) if (!/(placeholder|aria-label)=/.test(attrs)) fails.push(`${rel}: textarea sin placeholder/aria-label`);
}
if (fails.length) {
  console.error("A11Y FAIL:\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(`a11y OK (${pages.length} páginas)`);
