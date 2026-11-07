import React from "react";
import { PackagePlus, Archive } from "lucide-react";
import { Button, Card, Field, Input, Badge, Empty } from "../components/ui";
import { newId, nowIso, solesToMinor, validateQty, tierLabel, prettyVariant, formatMoney, audit, type WebState } from "../lib/store";

interface Tier { qty: string; soles: string; }

const DEFAULT_QTIES = ["1", "2", "3", "4", "6", "12"];
function defaultTiers(): Tier[] {
  return DEFAULT_QTIES.map((qty) => ({ qty, soles: "" }));
}

export default function Catalogo(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;
  const [name, setName] = React.useState("");
  const [tiers, setTiers] = React.useState<Tier[]>(defaultTiers());
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");

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
      const product = { id: pid, name: name.trim(), description: "", status: "active" as const, created_at: now, updated_at: now, revision: 1 };
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
      setTiers(defaultTiers());
      setErr("");
      setOk(`"${product.name}" guardado con ${parsed.length} precio(s).`);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "error");
      setOk("");
    }
  }

  function archive(id: string): void {
    set((p) => audit({
      ...p,
      products: p.products.map((x) => (x.id === id ? { ...x, status: x.status === "active" ? ("archived" as const) : ("active" as const), updated_at: nowIso() } : x)),
    }, "producto.archivar", id.slice(0, 8)));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card title="Nuevo producto" icon={<PackagePlus size={18} />} sub="Nombre + sus precios por cantidad. Todo de una vez.">
          <form onSubmit={save} className="grid gap-3">
            <Field label="Nombre" htmlFor="c-name"><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="overflow-hidden rounded-xl border border-[#e8e8ed]">
              <div className="grid grid-cols-2 gap-2 bg-[#f5f5f7] px-3 py-2 text-[13px] font-medium text-[#6e6e73]">
                <span>Cantidad</span><span>Precio (S/)</span>
              </div>
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 border-t border-[#f0f0f3] px-3 py-2">
                  <Input id={`c-q${i}`} value={t.qty} onChange={(e) => setTier(i, { qty: e.target.value })} inputMode="numeric" aria-label={`Cantidad fila ${i + 1}`} />
                  <Input id={`c-s${i}`} value={t.soles} onChange={(e) => setTier(i, { soles: e.target.value })} inputMode="decimal" aria-label={`Precio fila ${i + 1}`} />
                </div>
              ))}
            </div>
            {err ? <p className="text-[13px] text-[#cf222e]">{err}</p> : null}
            {ok ? <p className="text-[13px] text-[#1a7f37]">{ok}</p> : null}
            <div><Button type="submit">Guardar producto</Button></div>
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
                      <strong className="tracking-tight">{p.name}</strong>
                      <span className="flex items-center gap-2">
                        {min !== null ? <Badge tone="ok">desde {formatMoney(min, cur0)}</Badge> : <Badge>sin precios</Badge>}
                        <Archive size={14} className="cursor-pointer text-[#6e6e73]" onClick={(e) => { e.preventDefault(); archive(p.id); }} />
                      </span>
                    </summary>
                    {prices.length === 0 ? (
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
