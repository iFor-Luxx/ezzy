// Options Fase 1 — CRUD offline catálogo/mensajes + backup/restore local. Sin medios a nube.
async function getAll(table: string): Promise<Record<string, unknown>[]> {
  // @ts-ignore
  const s = globalThis.chrome?.storage?.local;
  if (!s) return [];
  const r = await s.get(table);
  return (r[table] as Record<string, unknown>[]) ?? [];
}
async function setAll(table: string, rows: Record<string, unknown>[]): Promise<void> {
  // @ts-ignore
  await globalThis.chrome?.storage?.local?.set({ [table]: rows });
}

export function toProduct(name: string, amountMinor: number, currency: string): { product: Record<string, unknown>; price: Record<string, unknown> } {
  if (!name.trim()) throw new Error("nombre requerido");
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new Error("precio minor entero >=0");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("moneda ISO-4217");
  const pid = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    product: { id: pid, name, description: "", status: "active", created_at: now, updated_at: now, revision: 1 },
    price: { id: crypto.randomUUID(), product_id: pid, amount_minor: amountMinor, currency, source: "manual", verified_at: now, revision: 1 },
  };
}

export function toMessage(title: string, body: string): Record<string, unknown> {
  if (!title.trim() || !body.trim()) throw new Error("título/body requeridos");
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title, body, intent: "general", channel: "whatsapp", tags: [], status: "approved", verified_at: now, revision: 1 };
}

document.getElementById("p-add")?.addEventListener("click", async () => {
  const name = (document.getElementById("p-name") as HTMLInputElement).value;
  const minor = Number((document.getElementById("p-price") as HTMLInputElement).value);
  const cur = (document.getElementById("p-cur") as HTMLInputElement).value || "PEN";
  const { product, price } = toProduct(name, minor, cur);
  await setAll("products", [...(await getAll("products")), product]);
  await setAll("prices", [...(await getAll("prices")), price]);
  await refresh();
});
document.getElementById("m-add")?.addEventListener("click", async () => {
  const title = (document.getElementById("m-title") as HTMLInputElement).value;
  const body = (document.getElementById("m-body") as HTMLTextAreaElement).value;
  await setAll("approved_messages", [...(await getAll("approved_messages")), toMessage(title, body)]);
  await refresh();
});
document.getElementById("b-imp")?.addEventListener("click", async () => {
  const input = document.getElementById("b-file") as HTMLInputElement | null;
  const f = input?.files?.[0];
  const st = document.getElementById("st");
  if (!f) {
    if (st) st.textContent = "Elige un archivo JSON (del panel web o un respaldo).";
    return;
  }
  try {
    const json = JSON.parse(await f.text());
    const tables = (json.tables ?? {}) as Record<string, unknown>;
    let n = 0;
    for (const t of ["products", "variants", "prices", "approved_messages"]) {
      const rows = tables[t];
      if (Array.isArray(rows)) {
        const valid = rows.filter((r) => typeof r === "object" && r !== null && typeof (r as Record<string, unknown>)["id"] === "string");
        const existing = await getAll(t);
        const ids = new Set(existing.map((r) => String(r["id"])));
        await setAll(t, [...existing, ...valid.filter((r) => !ids.has(String((r as Record<string, unknown>)["id"])))]);
        n += valid.length;
      }
    }
    if (st) st.textContent = `Importado: ${n} registros (sin duplicar).`;
    input.value = "";
    await refresh();
  } catch {
    if (st) st.textContent = "Archivo inválido.";
  }
});
document.getElementById("b-exp")?.addEventListener("click", async () => {
  const data: Record<string, unknown> = {};
  for (const t of ["products", "variants", "prices", "approved_messages"]) data[t] = await getAll(t);
  const blob = new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), tables: data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ezzy-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
});
async function refresh(): Promise<void> {
  const ul = document.getElementById("list")!;
  const [ps, ms] = [await getAll("products"), await getAll("approved_messages")];
  ul.innerHTML = "";
  for (const r of [...ps, ...ms]) {
    const li = document.createElement("li");
    li.textContent = String(r["name"] ?? r["title"] ?? r["id"]);
    ul.appendChild(li);
  }
}
refresh();

// Secciones IA / contexto / sync: operaciones 100% locales para verlas sin red ni Cloudflare.
// La generación real con OpenCode y el sync remoto llegan con tu key y despliegue.
document.getElementById("ai-gen")?.addEventListener("click", () => {
  const model = (document.getElementById("ai-model") as HTMLInputElement)?.value || "glm-5.3-flash";
  const ctx = (document.getElementById("ai-ctx") as HTMLTextAreaElement)?.value || "";
  const clean = ctx.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email oculto]").replace(/\+?\d[\d\s-]{7,}\d/g, "[teléfono oculto]");
  const prev = document.getElementById("ai-consent");
  if (prev) prev.textContent = `Modelo: ${model}\nEndpoint: https://opencode.ai/inference/openai/v1/messages\nContexto: ${clean || "(vacío)"}\n! Se envía a US/EU. Revisa y confirma. (Vista previa local, sin red)`;
});
document.getElementById("ai-copy")?.addEventListener("click", async () => {
  const text = document.getElementById("ai-draft")?.textContent || "";
  if (text) await navigator.clipboard.writeText(text);
});
document.getElementById("ai-forget")?.addEventListener("click", () => {
  const k = document.getElementById("ai-key") as HTMLInputElement | null;
  if (k) k.value = "";
});
document.getElementById("cx-redact")?.addEventListener("click", () => {
  const raw = (document.getElementById("cx-raw") as HTMLTextAreaElement)?.value || "";
  const clean = raw.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email oculto]").replace(/\+?\d[\d\s-]{7,}\d/g, "[teléfono oculto]").replace(/\b\d{8}\b/g, "[documento oculto]");
  const prev = document.getElementById("cx-prev");
  if (prev) prev.textContent = clean || "(vacío)";
});
document.getElementById("cx-cancel")?.addEventListener("click", () => {
  const r = document.getElementById("cx-raw") as HTMLTextAreaElement | null;
  const p = document.getElementById("cx-prev");
  if (r) r.value = "";
  if (p) p.textContent = "";
  const c = document.getElementById("cx-consent") as HTMLInputElement | null;
  if (c) c.checked = false;
});
document.getElementById("cx-img")?.addEventListener("change", () => {
  const msg = document.getElementById("cx-msg");
  if (msg) msg.textContent = "Imagen no soportada en esta versión: pega el texto manualmente.";
  (document.getElementById("cx-img") as HTMLInputElement).value = "";
});
document.getElementById("s-now")?.addEventListener("click", () => {
  const st = document.getElementById("s-status");
  if (st) st.textContent = "Piloto local: sin servidor configurado. Cola conservada localmente. (Sync remoto requiere tu despliegue Cloudflare)";
});
