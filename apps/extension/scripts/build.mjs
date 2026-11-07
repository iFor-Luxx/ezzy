// Build dist cargable como descomprimida (sin Cloudflare, sin red).
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const src = path.join(root, "src");
const out = path.join(root, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.copyFileSync(path.join(root, "manifest/base.json"), path.join(out, "manifest.json"));
fs.copyFileSync(path.join(src, "popup/popup.html"), path.join(out, "popup.html"));
fs.copyFileSync(path.join(src, "options/options.html"), path.join(out, "options.html"));

const bun = process.execPath.includes("bun") ? `"${process.execPath}"` : "bun";
execSync(`${bun} build ${path.join(src, "background/service-worker.ts")} --outdir ${out} --entry-naming "[name].js" --target browser --format esm`, { stdio: "inherit" });
execSync(`${bun} build ${path.join(src, "popup/popup.ts")} --outdir ${out} --entry-naming "[name].js" --target browser --format esm`, { stdio: "inherit" });
execSync(`${bun} build ${path.join(src, "options/options.ts")} --outdir ${out} --entry-naming "[name].js" --target browser --format esm`, { stdio: "inherit" });
execSync(`${bun} build ${path.join(src, "content/whatsapp.ts")} --outdir ${out} --entry-naming "[name].js" --target browser --format esm`, { stdio: "inherit" });

fs.writeFileSync(path.join(out, "BUILD.txt"), `Ezzy local — ${new Date().toISOString()}\nSin Cloudflare. Cargar descomprimida.\n`);
// Nombres que esperan manifest/html: background.js, popup.js, options.js, content.js
const ren = { "service-worker.js": "background.js", "whatsapp.js": "content.js" };
for (const [from, to] of Object.entries(ren)) {
  if (fs.existsSync(path.join(out, from))) fs.renameSync(path.join(out, from), path.join(out, to));
}
console.log("dist OK: manifest + popup/options/background/content");
