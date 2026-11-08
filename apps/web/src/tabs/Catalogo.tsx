import React from "react";
import { PackagePlus, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button, Card, Dialog, Field, Input, Badge, Empty, Select, SelectTrigger, SelectContent, SelectItem } from "../components/ui";
import { newId, nowIso, solesToMinor, validateQty, tierLabel, parseTierLabel, prettyVariant, formatMoney, audit, type WebState } from "../lib/store";
import { productChanges, pushChanges, deleteProductChanges } from "../lib/sync";
import { buildUpsert, buildTombstone } from "../lib/cloud";
import { pingApi } from "@ezzy/ai-opencode";
import { inferenceBase, storedKey, storedModelId } from "../lib/ai";
import { toast } from "../components/ui/toast";

interface Tier { qty: string; soles: string; }

const DEFAULT_QTIES = ["1", "2", "3", "4", "6", "12"];
function defaultTiers(): Tier[] {
  return DEFAULT_QTIES.map((qty) => ({ qty, soles: "" }));
}

const BRANDS = ["UOMO CATTIVO", "EZZETA", "MAXETA", "CREPANTE"];

export default function Catalogo(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;
  const [name, setName] = React.useState("");
  const [fabric, setFabric] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [tiers, setTiers] = React.useState<Tier[]>(defaultTiers());
  const [aiBusy, setAiBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function setTier(i: number, patch: Partial<Tier>): void {
    setTiers((t) => t.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (saving) return;
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
      const product = { id: pid, name: name.trim(), fabric: fabric.trim() || undefined, brand: brand.trim() || undefined, description: "", status: "active" as const, created_at: now, updated_at: now, revision: 1 };
      const variants = parsed.map(({ qty }) => ({ id: newId(), product_id: pid, label: tierLabel(qty), active: true, revision: 1 }));
      const prices = parsed.map(({ minor }, i) => ({
        id: newId(), product_id: pid, variant_id: variants[i].id,
        amount_minor: minor, currency, source: "panel", verified_at: now, revision: 1,
      }));
      // Nube primero (1 sola petición en lote), local como espejo.
      setSaving(true);
      await pushChanges(productChanges(product, 0, variants, prices));
      set((p) => audit({
        ...p,
        products: [...p.products, product],
        variants: [...p.variants, ...variants],
        prices: [...p.prices, ...prices],
      }, "producto.crear", `${product.name} · ${parsed.length} precios`));
      setName("");
      setFabric("");
      setBrand("");
      setTiers(defaultTiers());
      toast.add({ description: `"${product.name}" guardado en tu nube.` });
    } catch (ex) {
      toast.add({ title: "Error", description: ex instanceof Error ? ex.message : "error" });
    } finally {
      setSaving(false);
    }
  }

  async function mejorar(): Promise<void> {
    try {
      const k = storedKey();
      if (!k.startsWith("oc_sk_")) throw new Error("pega tu API key en Configuración");
      const mid = storedModelId();
      if (!mid) throw new Error("elige un modelo en Configuración");
      const tela = fabric.trim();
      if (!tela) throw new Error("escribe la tela primero");
      setAiBusy(true);
      const out = await pingApi({
        baseURL: inferenceBase(),
        apiKey: k,
        modelId: mid,
        text: `Redacta la descripción de este material para ficha de prenda. Usa el nombre exacto tal cual, sin traducirlo ni generalizarlo. Investiga y destaca los beneficios reales de este material según su composición y uso ideal. Una sola frase corta (máx 25 palabras), precisa y clara, sin emojis, sin comillas ni explicaciones. Material: "${tela}"`,
        sessionId: crypto.randomUUID(),
        timeoutMs: 120000,
      });
      setFabric(out.trim());
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message.replace(/oc_sk_\S+/g, "oc_sk_…") : "error" });
    } finally {
      setAiBusy(false);
    }
  }

  async function removeProduct(pid: string): Promise<void> {
    const target = s.products.find((x) => x.id === pid);
    if (!target) return;
    try {
      const vRows = s.variants.filter((v) => v.product_id === pid);
      const pRows = s.prices.filter((x) => x.product_id === pid);
      await pushChanges(deleteProductChanges(pid, target.revision, vRows.map((v) => ({ id: v.id, revision: v.revision })), pRows.map((p) => ({ id: p.id, revision: p.revision }))));
      set((p) => audit({
        ...p,
        products: p.products.filter((x) => x.id !== pid),
        variants: p.variants.filter((v) => v.product_id !== pid),
        prices: p.prices.filter((x) => x.product_id !== pid),
      }, "producto.eliminar", target ? target.name : pid.slice(0, 8)));
      if (editingId === pid) setEditingId(null);
      setDeleteId(null);
      setDeleteName("");
      toast.add({ description: "Prenda eliminada de tu nube." });
    } catch (ex) {
      toast.add({ title: "Error", description: ex instanceof Error ? ex.message : "no se pudo eliminar" });
    }
  }

  // --- Edición de prenda existente ---
  interface EditRow { key: string; variantId?: string; priceId?: string; qty: string; soles: string; del: boolean; }
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [eName, setEName] = React.useState("");
  const [eFabric, setEFabric] = React.useState("");
  const [eBrand, setEBrand] = React.useState("");
  const [eRows, setERows] = React.useState<EditRow[]>([]);
  const [brandFilter, setBrandFilter] = React.useState<string>("todas");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteName, setDeleteName] = React.useState("");

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
    setEBrand(p.brand ?? "");
    setERows(rows);
    setEditingId(pid);
  }

  async function saveEdit(pid: string): Promise<void> {
    if (saving) return;
    try {
      const target = s.products.find((x) => x.id === pid);
      if (!target) throw new Error("prenda no encontrada");
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
      // Cambios nube en un lote: producto + precios/variantes tocados + tombstones.
      const changes: ReturnType<typeof buildUpsert>[] = [];
      changes.push(buildUpsert("product", pid, target.revision, {
        id: pid, name: eName.trim(), fabric: eFabric.trim() || undefined, brand: eBrand.trim() || undefined,
        description: target.description, status: target.status, created_at: target.created_at, updated_at: now, revision: target.revision + 1,
      }));
      for (const r of eRows.filter((x) => x.del)) {
        const v = r.variantId ? s.variants.find((x) => x.id === r.variantId) : undefined;
        const pr = r.priceId ? s.prices.find((x) => x.id === r.priceId) : s.prices.find((x) => x.variant_id === r.variantId);
        if (v) changes.push(buildTombstone("variant", v.id, v.revision));
        if (pr) changes.push(buildTombstone("price", pr.id, pr.revision));
      }
      const newVariants: { id: string; product_id: string; label: string; active: boolean; revision: number }[] = [];
      const newPrices: { id: string; product_id: string; variant_id: string; amount_minor: number; currency: string; source: string; verified_at: string; revision: number }[] = [];
      const updatedPrices: { id: string; minor: number; base: number }[] = [];
      for (const r of parsed) {
        if (r.priceId) {
          const cur = s.prices.find((x) => x.id === r.priceId);
          if (cur && cur.amount_minor !== r.minor) {
            changes.push(buildUpsert("price", cur.id, cur.revision, {
              id: cur.id, product_id: pid, variant_id: cur.variant_id, amount_minor: r.minor,
              currency: cur.currency, source: cur.source, verified_at: now, revision: cur.revision + 1,
            }));
            updatedPrices.push({ id: cur.id, minor: r.minor, base: cur.revision });
          }
        } else {
          let vid = r.variantId;
          if (!vid) {
            vid = newId();
            newVariants.push({ id: vid, product_id: pid, label: tierLabel(r.qty), active: true, revision: 1 });
            changes.push(buildUpsert("variant", vid, 0, { id: vid, product_id: pid, label: tierLabel(r.qty), active: true, revision: 1 }));
          }
          const prid = newId();
          newPrices.push({ id: prid, product_id: pid, variant_id: vid, amount_minor: r.minor, currency: "PEN", source: "panel", verified_at: now, revision: 1 });
          changes.push(buildUpsert("price", prid, 0, { id: prid, product_id: pid, variant_id: vid, amount_minor: r.minor, currency: "PEN", source: "panel", verified_at: now, revision: 1 }));
        }
      }
      setSaving(true);
      await pushChanges(changes);
      set((p) => {
        const variants = [...p.variants];
        let prices = [...p.prices];
        for (const r of eRows.filter((x) => x.del)) {
          if (r.variantId) {
            const vi = variants.findIndex((v) => v.id === r.variantId);
            if (vi >= 0) variants.splice(vi, 1);
          }
          prices = prices.filter((x) => x.id !== r.priceId && x.variant_id !== r.variantId);
        }
        for (const u of updatedPrices) {
          prices = prices.map((x) => (x.id === u.id ? { ...x, amount_minor: u.minor, verified_at: now, revision: u.base + 1 } : x));
        }
        for (const v of newVariants) variants.push(v);
        for (const pr of newPrices) prices.push(pr);
        return audit({
          ...p,
          products: p.products.map((x) => (x.id === pid ? { ...x, name: eName.trim(), fabric: eFabric.trim() || undefined, brand: eBrand.trim() || undefined, updated_at: now, revision: x.revision + 1 } : x)),
          variants,
          prices,
        }, "producto.editar", eName.trim());
      });
      setEditingId(null);
      toast.add({ description: "Cambios guardados en tu nube." });
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card label="Catálogo y nuevo producto">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)]">
        {/* Izquierda: formulario */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-primary"><PackagePlus size={18} /></span>
            <h2 className="text-base font-semibold tracking-tight sm:text-[17px]">Nuevo producto</h2>
          </div>
          <form onSubmit={(e) => void save(e)} className="mt-3 grid gap-3">
            <Field label="Marca" htmlFor="c-brand">
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger id="c-brand" />
                <SelectContent>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nombre" htmlFor="c-name"><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Tela" htmlFor="c-fabric">
              <div className="relative">
                <Input id="c-fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} className="pr-11" />
                <button type="button" aria-label="Mejorar con IA" title="Mejorar con IA" onClick={() => void mejorar()} disabled={aiBusy}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-primary transition active:scale-95 hover:bg-muted disabled:opacity-50">
                  <Sparkles size={16} />
                </button>
              </div>
            </Field>
            <div>
              <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Precios por cantidad</p>
              <div className="overflow-hidden rounded-xl border border-border">
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-t border-border px-3 py-1.5 first:border-t-0">
                    <span className="w-10 shrink-0 text-right text-sm sm:text-[15px] tabular-nums">{t.qty || "…"}</span>
                    <span className="flex-1 text-center text-sm sm:text-[15px]">x</span>
                    <span className="flex items-center gap-1.5 text-sm sm:text-[15px] text-muted-foreground">
                      S/
                      <input id={`c-s${i}`} value={t.soles} onChange={(e) => setTier(i, { soles: e.target.value })}
                        inputMode="decimal" aria-label={`Precio por ${t.qty || i + 1}`} placeholder="0.00"
                        className="w-24 rounded-lg border border-transparent bg-muted px-2 py-1 text-right text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:bg-card" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div><Button type="submit" className="w-full" size="lg" disabled={saving}>{saving ? "Guardando en tu nube…" : "Guardar producto"}</Button></div>
          </form>
        </div>

        {/* Separador vertical (horizontal en móvil) — cubre todo el alto/ancho del Card */}
        <div aria-hidden="true" className="bg-border max-lg:-mx-4 max-lg:h-px max-lg:w-auto lg:-my-4 lg:w-px lg:self-stretch" />

        {/* Derecha: catálogo */}
        <div>
          <h2 className="mb-3 text-base font-semibold tracking-tight sm:text-[17px]">Catálogo ({s.products.length})</h2>
          {(() => {
            const brands = Array.from(new Set(s.products.map((x) => x.brand).filter((b): b is string => !!b))).sort((a, b) => a.localeCompare(b, "es"));
            const visible = brandFilter === "todas" ? s.products : s.products.filter((x) => x.brand === brandFilter);
            return (
              <>
                {brands.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por marca">
                    <button type="button" role="tab" aria-selected={brandFilter === "todas"} onClick={() => setBrandFilter("todas")}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${brandFilter === "todas" ? "border-border bg-card text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      Todas ({s.products.length})
                    </button>
                    {brands.map((b) => {
                      const n = s.products.filter((x) => x.brand === b).length;
                      const active = brandFilter === b;
                      return (
                        <button key={b} type="button" role="tab" aria-selected={active} onClick={() => setBrandFilter(active ? "todas" : b)}
                          className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${active ? "border-border bg-card text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                          {b} ({n})
                        </button>
                      );
                    })}
                  </div>
                ) : null}
          {s.products.length === 0 ? <Empty>Sin prendas. Crea una a la izquierda.</Empty> : visible.length === 0 ? <Empty>Sin prendas de esta marca.</Empty> : (
            <div className="grid gap-3">
              {visible.map((p) => {
                const prices = s.prices.filter((x) => x.product_id === p.id);
                const min = prices.length ? Math.min(...prices.map((x) => x.amount_minor)) : null;
                const cur0 = prices[0]?.currency ?? "PEN";
                return (
                  <details key={p.id} className="group overflow-hidden rounded-[20px] border border-border bg-card transition hover:border-primary/30 open:shadow-sm" open={false}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <strong className="block truncate text-sm sm:text-[15px] font-semibold uppercase tracking-tight">{p.name}</strong>
                          {p.brand ? <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{p.brand}</span> : null}
                        </span>
                        {p.fabric ? <span className="mt-0.5 block text-[13px] font-normal leading-snug text-muted-foreground line-clamp-2 [mask-image:linear-gradient(to_bottom,black_78%,transparent_100%)] group-open:line-clamp-none group-open:[mask-image:none]">{p.fabric}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {min !== null ? (
                          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{formatMoney(min, cur0)}</span>
                        ) : <Badge>sin precios</Badge>}
                        <button type="button" aria-label={`Editar ${p.name}`} title="Editar"
                          onClick={(e) => { e.preventDefault(); startEdit(p.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground">
                          <Pencil size={14} />
                        </button>
                        <button type="button" aria-label={`Eliminar ${p.name}`} title="Eliminar"
                          onClick={(e) => { e.preventDefault(); setDeleteName(""); setDeleteId(p.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-sm transition hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </summary>
                    {prices.length === 0 ? (
                      <p className="mx-3 mb-3 mt-2 text-[13px] text-muted-foreground">Sin precios.</p>
                    ) : (
                      <div className="mx-3 mb-3 mt-2 overflow-hidden rounded-2xl border border-border bg-muted/50 divide-y divide-border">
                        {prices
                          .map((pr) => ({ pr, qty: pr.variant_id ? s.variants.find((v) => v.id === pr.variant_id)?.label ?? "" : "" }))
                          .sort((a, b) => (a.qty && b.qty ? a.qty.localeCompare(b.qty, undefined, { numeric: true }) : 0))
                          .map(({ pr, qty }) => (
                            <div key={pr.id} className="flex items-center justify-between px-3 py-2">
                              <span className="text-sm sm:text-[15px] text-foreground">{qty ? `Lleva ${prettyVariant(qty)}` : "Precio general"}</span>
                              <span className="text-sm sm:text-[15px] font-semibold tabular-nums text-foreground">{formatMoney(pr.amount_minor, pr.currency)}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
          )}
              </>
            );
          })()}
          {editingId !== null ? (
            <Dialog title="Editar prenda" onClose={() => setEditingId(null)}>
              <div className="grid gap-3">
                <Field label="Nombre" htmlFor="e-name"><Input id="e-name" value={eName} onChange={(e) => setEName(e.target.value)} /></Field>
                <Field label="Marca" htmlFor="e-brand">
                  <Select value={eBrand} onValueChange={setEBrand}>
                    <SelectTrigger id="e-brand" />
                    <SelectContent>
                      {BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tela" htmlFor="e-fabric"><Input id="e-fabric" value={eFabric} onChange={(e) => setEFabric(e.target.value)} /></Field>
                <div className="overflow-hidden rounded-xl border border-border">
                  {eRows.filter((r) => !r.del).map((r) => (
                    <div key={r.key} className="flex items-center gap-2 border-t border-border px-3 py-1.5 first:border-t-0">
                      <span className="w-16 shrink-0 text-sm sm:text-[15px]">×<input value={r.qty} onChange={(e) => setERows((rows) => rows.map((x) => (x.key === r.key ? { ...x, qty: e.target.value } : x)))} inputMode="numeric" aria-label="Cantidad" className="w-10 border-0 bg-transparent p-1 outline-none" /></span>
                      <span className="flex flex-1 items-center justify-end gap-1 text-sm sm:text-[15px]">
                        S/
                        <input value={r.soles} onChange={(e) => setERows((rows) => rows.map((x) => (x.key === r.key ? { ...x, soles: e.target.value } : x)))} inputMode="decimal" aria-label="Precio" className="w-24 border-0 bg-transparent p-1 text-right outline-none" />
                      </span>
                      <Trash2 size={14} className="shrink-0 cursor-pointer text-destructive" aria-label="Quitar precio" onClick={() => setERows((rows) => rows.map((x) => (x.key === r.key ? { ...x, del: true } : x)))} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setERows((rows) => [...rows, { key: `n${Date.now()}`, qty: "", soles: "", del: false }])}>+ Cantidad</Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
                  <Button size="sm" onClick={() => void saveEdit(editingId)} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
                </div>
              </div>
            </Dialog>
          ) : null}
          {(() => {
            const target = deleteId !== null ? s.products.find((x) => x.id === deleteId) ?? null : null;
            if (deleteId === null || target === null) return null;
            const ok = deleteName.trim() === target.name;
            return (
              <Dialog title="Eliminar prenda" onClose={() => { setDeleteId(null); setDeleteName(""); }}>
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">Se eliminará <strong className="text-foreground">{target.name}</strong> con todos sus precios. Para confirmar, escribe el nombre de la prenda.</p>
                  <Field label="Nombre de la prenda" htmlFor="del-name">
                    <Input id="del-name" value={deleteName} onChange={(e) => setDeleteName(e.target.value)} autoComplete="off" />
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { setDeleteId(null); setDeleteName(""); }}>Cancelar</Button>
                    <Button size="sm" variant="destructive" disabled={!ok} onClick={() => void removeProduct(deleteId)}>Eliminar</Button>
                  </div>
                </div>
              </Dialog>
            );
          })()}
        </div>
      </div>
    </Card>
  );
}
