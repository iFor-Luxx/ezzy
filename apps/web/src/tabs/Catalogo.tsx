import React from "react";
import { PackagePlus, Archive, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Badge, Empty } from "../components/ui";
import { newId, nowIso, solesToMinor, validateQty, tierLabel, parseTierLabel, prettyVariant, formatMoney, audit, type WebState } from "../lib/store";
import { pingApi } from "@ezzy/ai-opencode";
import { inferenceBase, storedKey, storedModelId } from "../lib/ai";
import { toast } from "../hooks/use-toast";

interface Tier { qty: string; soles: string; }

const DEFAULT_QTIES = ["1", "2", "3", "4", "6", "12"];
function defaultTiers(): Tier[] {
  return DEFAULT_QTIES.map((qty) => ({ qty, soles: "" }));
}

export default function Catalogo(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;
  const [name, setName] = React.useState("");
  const [fabric, setFabric] = React.useState("");
  const [tiers, setTiers] = React.useState<Tier[]>(defaultTiers());
  const [aiBusy, setAiBusy] = React.useState(false);

  function setTier(i: number, patch: Partial<Tier>): void {
    setTiers((t) => t.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function save(e: React.FormEvent): void {
    e.preventDefault();
    try {
      if (!name.trim()) throw new Error("nombre requerido");
      const filled = tiers.filter((t) => t.soles.trim() !== "");
      if (filled.length === 0) throw new Error("llena al menos un precio");
      const qtySeen = new Set<number>();
      const parsed = filled.map((t) => {
        const qty = validateQty(t.qty);
        if (qtySeen.has(qty)) throw new Error(`cantidad repetida: ${qty}`);
        qtySeen.add(qty);
        return { qty, minor: solesToMinor(t.soles) };
      });
      const currency = "PEN";
      const now = nowIso();
      const pid = newId();
      const product = { id: pid, name: name.trim(), fabric: fabric.trim() || undefined, description: "", status: "active" as const, created_at: now, updated_at: now, revision: 1 };
      const variants = parsed.map(({ qty }) => ({ id: newId(), product_id: pid, label: tierLabel(qty), active: true, revision: 1 }));
      const prices = parsed.map(({ minor }, i) => ({
        id: newId(), product_id: pid, variant_id: variants[i].id,
        amount_minor: minor, currency, source: "panel", verified_at: now, revision: 1,
      }));
      set((p) => audit({
        ...p,
        products: [...p.products, product],
        variants: [...p.variants, ...variants],
        prices: [...p.prices, ...prices],
      }, "producto.crear", `${product.name} · ${parsed.length} precios`));
      setName("");
      setFabric("");
      setTiers(defaultTiers());
      toast({ description: `"${product.name}" guardado con ${parsed.length} precio(s).` });
    } catch (ex) {
      toast({ variant: "destructive", description: ex instanceof Error ? ex.message : "error" });
    }
  }

  async function mejorar(): Promise<void> {
    try {
      const k = storedKey();
      if (!k.startsWith("oc_sk_")) throw new Error("pega tu API key en Configuración");
      const mid = storedModelId();
      if (!mid) throw new Error("elige un modelo en Configuración");
      const base = [name.trim(), fabric.trim() ? `Tela: ${fabric.trim()}` : ""].filter(Boolean).join(" / ");
      if (!base) throw new Error("escribe el nombre o la tela primero");
      setAiBusy(true);
      const out = await pingApi({
        baseURL: inferenceBase(),
        apiKey: k,
        modelId: mid,
        text: `Mejora este texto de prenda para vender por WhatsApp. Responde solo con el texto mejorado, sin comillas ni explicaciones: "${base}"`,
        sessionId: crypto.randomUUID(),
        timeoutMs: 120000,
      });
      setFabric(out.trim());
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message.replace(/oc_sk_\S+/g, "oc_sk_…") : "error" });
    } finally {
      setAiBusy(false);
    }
  }

  function archive(id: string): void {
    set((p) => audit({
      ...p,
      products: p.products.map((x) => (x.id === id ? { ...x, status: x.status === "active" ? ("archived" as const) : ("active" as const), updated_at: nowIso() } : x)),
    }, "producto.archivar", id.slice(0, 8)));
  }

  // --- Edición de prenda existente ---
  interface EditRow { key: string; variantId?: string; priceId?: string; qty: string; soles: string; del: boolean; }
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [eName, setEName] = React.useState("");
  const [eFabric, setEFabric] = React.useState("");
  const [eRows, setERows] = React.useState<EditRow[]>([]);

  function startEdit(pid: string): void {
    const p = s.products.find((x) => x.id === pid);
    if (!p) return;
    const rows: EditRow[] = s.variants
      .filter((v) => v.product_id === pid && v.active)
      .map((v) => {
        const pr = s.prices.find((x) => x.variant_id === v.id);
        const q = parseTierLabel(v.label);
        return {
          key: v.id, variantId: v.id, priceId: pr?.id,
          qty: q === null ? v.label.replace(/^x/, "") : String(q),
          soles: pr ? String(pr.amount_minor / 100) : "",
          del: false,
        };
      });
    for (const pr of s.prices.filter((x) => x.product_id === pid && !x.variant_id)) {
      rows.push({ key: pr.id, priceId: pr.id, qty: "", soles: String(pr.amount_minor / 100), del: false });
    }
    setEName(p.name);
    setEFabric(p.fabric ?? "");
    setERows(rows);
    setEditingId(pid);
  }

  function saveEdit(pid: string): void {
    try {
      if (!eName.trim()) throw new Error("nombre requerido");
      const live = eRows.filter((r) => !r.del);
      if (live.length === 0) throw new Error("deja al menos un precio");
      const seen = new Set<number>();
      const parsed = live.map((r) => {
        const qty = validateQty(r.qty);
        if (seen.has(qty)) throw new Error(`cantidad repetida: ${qty}`);
        seen.add(qty);
        return { ...r, qty, minor: solesToMinor(r.soles) };
      });
      const now = nowIso();
      set((p) => {
        const variants = [...p.variants];
        let prices = [...p.prices];
        // eliminados
        for (const r of eRows.filter((x) => x.del)) {
          if (r.variantId) {
            const vi = variants.findIndex((v) => v.id === r.variantId);
            if (vi >= 0) variants.splice(vi, 1);
          }
          prices = prices.filter((x) => x.id !== r.priceId && x.variant_id !== r.variantId);
        }
        // actualizados y nuevos
        for (const r of parsed) {
          if (r.priceId) {
            prices = prices.map((x) => (x.id === r.priceId ? { ...x, amount_minor: r.minor, verified_at: now, revision: x.revision + 1 } : x));
          } else {
            let vid = r.variantId;
            if (!vid) {
              vid = newId();
              variants.push({ id: vid, product_id: pid, label: tierLabel(r.qty), active: true, revision: 1 });
            }
            prices.push({ id: newId(), product_id: pid, variant_id: vid, amount_minor: r.minor, currency: "PEN", source: "panel", verified_at: now, revision: 1 });
          }
        }
        return audit({
          ...p,
          products: p.products.map((x) => (x.id === pid ? { ...x, name: eName.trim(), fabric: eFabric.trim() || undefined, updated_at: now } : x)),
          variants,
          prices,
        }, "producto.editar", eName.trim());
      });
      setEditingId(null);
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "error" });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card title="Nuevo producto" icon={<PackagePlus size={18} />}>
          <form onSubmit={save} className="grid gap-4">
            <Field label="Nombre" htmlFor="c-name"><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Tela" htmlFor="c-fabric">
              <div className="relative">
                <Input id="c-fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} className="pr-11" />
                <button type="button" aria-label="Mejorar con IA" title="Mejorar con IA" onClick={() => void mejorar()} disabled={aiBusy}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#007aff] transition active:scale-95 hover:bg-black/[0.04] disabled:opacity-50">
                  <Sparkles size={16} />
                </button>
              </div>
            </Field>
            <div>
              <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">Precios por cantidad</p>
              <div className="overflow-hidden rounded-xl border border-[#e8e8ed]">
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-t border-[#f0f0f3] px-4 py-1.5 first:border-t-0">
                    <span className="text-[15px]">Lleva {t.qty || "…"}</span>
                    <span className="flex items-center gap-1 text-[15px]">
                      S/
                      <input id={`c-s${i}`} value={t.soles} onChange={(e) => setTier(i, { soles: e.target.value })}
                        inputMode="decimal" aria-label={`Precio llevando ${t.qty || i + 1}`}
                        className="w-24 border-0 bg-transparent p-1 text-right outline-none placeholder:text-[#c7c7cc]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div><Button type="submit" className="w-full" size="lg">Guardar producto</Button></div>
          </form>
        </Card>
      </div>
      <div className="lg:col-span-3">
        <Card title={`Catálogo (${s.products.length})`} sub="Desde el precio más bajo; abre cada prenda para ver cantidad → precio.">
          {s.products.length === 0 ? <Empty>Sin prendas. Crea una arriba o carga el ejemplo en Respaldo.</Empty> : (
            <div className="grid gap-3">
              {s.products.map((p) => {
                const prices = s.prices.filter((x) => x.product_id === p.id);
                const min = prices.length ? Math.min(...prices.map((x) => x.amount_minor)) : null;
                const cur0 = prices[0]?.currency ?? "PEN";
                return (
                  <details key={p.id} className="rounded-2xl border border-[#e8e8ed] p-4" open={false}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <span className="min-w-0">
                        <strong className="block truncate tracking-tight">{p.name}</strong>
                        {p.fabric ? <span className="block truncate text-[13px] font-normal text-[#6e6e73]">{p.fabric}</span> : null}
                      </span>
                      <span className="flex items-center gap-2">
                        {min !== null ? <Badge tone="ok">desde {formatMoney(min, cur0)}</Badge> : <Badge>sin precios</Badge>}
                        <Pencil size={14} className="cursor-pointer text-[#6e6e73]" aria-label={`Editar ${p.name}`} onClick={(e) => { e.preventDefault(); if (editingId === p.id) setEditingId(null); else startEdit(p.id); }} />
                        <Archive size={14} className="cursor-pointer text-[#6e6e73]" onClick={(e) => { e.preventDefault(); archive(p.id); }} />
                      </span>
                    </summary>
                    {editingId === p.id ? (
                      <div className="mt-3 grid gap-3 border-t border-[#f0f0f3] pt-3">
                        <Field label="Nombre" htmlFor={`e-name-${p.id}`}><Input id={`e-name-${p.id}`} value={eName} onChange={(e) => setEName(e.target.value)} /></Field>
                        <Field label="Tela" htmlFor={`e-fabric-${p.id}`}><Input id={`e-fabric-${p.id}`} value={eFabric} onChange={(e) => setEFabric(e.target.value)} /></Field>
                        <div className="overflow-hidden rounded-xl border border-[#e8e8ed]">
                          {eRows.filter((r) => !r.del).map((r) => (
                            <div key={r.key} className="flex items-center gap-2 border-t border-[#f0f0f3] px-3 py-1.5 first:border-t-0">
                              <span className="w-16 shrink-0 text-[15px]">×<input value={r.qty} onChange={(e) => setERows((rows) => rows.map((x) => (x.key === r.key ? { ...x, qty: e.target.value } : x)))} inputMode="numeric" aria-label="Cantidad" className="w-10 border-0 bg-transparent p-1 outline-none" /></span>
                              <span className="flex flex-1 items-center justify-end gap-1 text-[15px]">
                                S/
                                <input value={r.soles} onChange={(e) => setERows((rows) => rows.map((x) => (x.key === r.key ? { ...x, soles: e.target.value } : x)))} inputMode="decimal" aria-label="Precio" className="w-24 border-0 bg-transparent p-1 text-right outline-none" />
                              </span>
                              <Trash2 size={14} className="shrink-0 cursor-pointer text-[#cf222e]" aria-label="Quitar precio" onClick={() => setERows((rows) => rows.map((x) => (x.key === r.key ? { ...x, del: true } : x)))} />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setERows((rows) => [...rows, { key: `n${Date.now()}`, qty: "", soles: "", del: false }])}>+ Cantidad</Button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(p.id)}>Guardar cambios</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : prices.length === 0 ? (
                      <p className="mt-2 text-[13px] text-[#6e6e73]">Sin precios.</p>
                    ) : (
                      <table className="mt-2 w-full border-collapse text-sm">
                        <tbody>
                          {prices
                            .map((pr) => ({ pr, qty: pr.variant_id ? s.variants.find((v) => v.id === pr.variant_id)?.label ?? "" : "" }))
                            .sort((a, b) => (a.qty && b.qty ? a.qty.localeCompare(b.qty, undefined, { numeric: true }) : 0))
                            .map(({ pr, qty }) => (
                              <tr key={pr.id} className="border-t border-[#f0f0f3]">
                                <td className="py-1.5 text-[#6e6e73]">{qty ? `Lleva ${prettyVariant(qty)}` : "Precio general"}</td>
                                <td className="py-1.5 text-right font-semibold">{formatMoney(pr.amount_minor, pr.currency)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </details>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
