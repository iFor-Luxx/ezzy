// Diagnóstico temporal: renderiza App en jsdom para capturar el error que deja la web en blanco.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><head></head><body><div id='root'></div></body></html>", {
  url: "http://localhost:5173/",
  pretendToBeVisual: true,
});

const w = dom.window as unknown as Record<string, unknown>;
(globalThis as unknown as Record<string, unknown>).window = w;
for (const k of Object.getOwnPropertyNames(w)) {
  if (k in globalThis) continue;
  try {
    (globalThis as unknown as Record<string, unknown>)[k] = w[k];
  } catch {
    // solo lectura: se omite
  }
}
if (!w["matchMedia"]) {
  w["matchMedia"] = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } });
}
if (!(globalThis as unknown as Record<string, unknown>)["requestAnimationFrame"]) {
  (globalThis as unknown as Record<string, unknown>)["requestAnimationFrame"] = (cb: () => void) => setTimeout(cb, 0);
}

const errors: string[] = [];
(w as unknown as { addEventListener: (t: string, f: (e: unknown) => void) => void }).addEventListener("error", (e) => {
  errors.push(`window.onerror: ${(e as { message?: string })?.message ?? String(e)}`);
});

process.on("uncaughtException", (e) => {
  console.log("UNCAUGHT:", e?.stack ?? String(e));
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  console.log("UNHANDLED REJECTION:", e instanceof Error ? (e.stack ?? e.message) : String(e));
});

try {
  const { createRoot } = await import("react-dom/client");
  const App = (await import("./src/App")).default;
  const React = (await import("react")).default;
  const doc = w["document"] as unknown as Document;
  const root = createRoot(doc.getElementById("root") as unknown as Element);
  root.render(React.createElement(App));
  await new Promise((r) => setTimeout(r, 1500));
  const html = (doc.getElementById("root") as HTMLElement).innerHTML;
  console.log("ROOT_LEN:", html.length);
  console.log("ROOT_HEAD:", html.slice(0, 300));
  if (errors.length) console.log("ERRORS:", errors.join(" | "));
} catch (e) {
  console.log("RENDER_THROW:", e instanceof Error ? (e.stack ?? e.message) : String(e));
}
process.exit(0);
