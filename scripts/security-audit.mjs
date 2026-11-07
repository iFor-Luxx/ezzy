// Auditoría seguridad Fase 6: secretos, PII real, binarios, permisos, custodia key.
// Falla (exit 1) si encuentra violación. Sintéticos `oc_sk_x` en tests permitidos solo si cortos.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const notes = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name.startsWith("bun.lock")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(ROOT).filter((f) => /\.(ts|js|mjs|json|html|md)$/.test(f) && !f.includes("node_modules"));
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const src = fs.readFileSync(f, "utf8");
  // 1. API keys reales: oc_sk_ + >12 chars (tests usan oc_sk_x cortos)
  for (const m of src.matchAll(/oc_sk_[A-Za-z0-9_-]{8,}/g)) {
    if (rel.includes("fase-6") || rel.includes("sdd") || rel.includes("docs/fase-0")) continue; // docs mencionan formato
    if (m[0].length > 12 && !/oc_sk_(x|test)/.test(m[0])) fails.push(`${rel}: posible API key real (${m[0].slice(0, 12)}…)`);
    else notes.push(`${rel}: key sintética OK`);
  }
  // 2. Custodia: key nunca en storage.local/sync ni logs
  if (/storage\.(local|sync)\.(set|get).*key/i.test(src) && !/session/.test(src) && f.endsWith(".ts"))
    fails.push(`${rel}: key fuera de session`);
  // 3. PII real en fixtures: emails comunes
  if (rel.includes("test-fixtures") && /@(gmail|hotmail|outlook|yahoo)/i.test(src))
    fails.push(`${rel}: PII real en fixtures`);
}
// 4. Binarios comprometidos
const media = walk(ROOT).filter((f) => /\.(png|jpe?g|mp4|webm|mov|wav|mp3)$/i.test(f) && !f.includes("node_modules"));
if (media.length) fails.push(`medios en repo: ${media.map((m) => path.relative(ROOT, m)).join(", ")}`);
// 5. Manifiesto mínimo (reusa review)
const m = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/extension/manifest/base.json"), "utf8"));
for (const bad of ["history", "webRequest", "<all_urls>", "tabs", "clipboardRead"]) {
  if ((m.permissions ?? []).includes(bad)) fails.push(`permiso prohibido: ${bad}`);
}
if ((m.permissions ?? []).some((p) => /storage\.sync/.test(p))) fails.push("no usar storage.sync para secretos");

if (fails.length) {
  console.error("SECURITY AUDIT FAIL:\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(`security audit OK (${files.length} archivos, ${notes.length} keys sintéticas)`);
