// Popup Fase 1 — búsqueda offline en chrome.storage.local. Sin red, sin secretos en UI.
async function all(table: string): Promise<Record<string, unknown>[]> {
  // @ts-ignore chrome disponible solo en extensión
  const store = globalThis.chrome?.storage?.local;
  if (!store) return [];
  const all = await store.get(table);
  return (all[table] as Record<string, unknown>[]) ?? [];
}

function haystack(o: Record<string, unknown>): string {
  return Object.values(o).join(" ").toLowerCase();
}

export function filterLocal(q: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const n = q.trim().toLowerCase();
  if (!n) return rows.slice(0, 20);
  return rows.filter((r) => haystack(r).includes(n)).slice(0, 20);
}

async function render(q: string): Promise<void> {
  const msgs = await all("approved_messages");
  const prods = await all("products");
  const rows = filterLocal(q, [...msgs, ...prods]);
  const div = document.getElementById("r")!;
  div.innerHTML = "";
  for (const r of rows) {
    const b = document.createElement("button");
    b.textContent = String(r["title"] ?? r["name"] ?? r["id"]);
    b.onclick = () => preview(String(r["body"] ?? r["description"] ?? ""));
    div.appendChild(b);
  }
}

function preview(body: string): void {
  // Preview + variables antes de copiar; lo faltante queda visible (fail-closed).
  const varsDiv = document.getElementById("vars")!;
  varsDiv.innerHTML = "";
  const found = [...new Set([...body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]))];
  const getVars = (): Record<string, string> => {
    const o: Record<string, string> = {};
    for (const k of found) o[k] = (document.getElementById(`v-${k}`) as HTMLInputElement)?.value ?? "";
    return o;
  };
  const draw = () => {
    const v = getVars();
    const text = body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k: string) => (v[k] ? v[k] : m));
    document.getElementById("pv")!.textContent = text;
  };
  for (const k of found) {
    const inp = document.createElement("input");
    inp.id = `v-${k}`;
    inp.placeholder = k;
    inp.oninput = draw;
    varsDiv.appendChild(inp);
  }
  draw();
  document.getElementById("copy")!.onclick = async () => {
    const text = document.getElementById("pv")!.textContent ?? "";
    if (text) await navigator.clipboard.writeText(text);
  };
}

document.getElementById("q")?.addEventListener("input", (e) => render((e.target as HTMLInputElement).value));
render("");
