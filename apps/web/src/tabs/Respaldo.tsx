import React from "react";
import { DatabaseBackup, FlaskConical, Trash2, ShieldCheck } from "lucide-react";
import { Button, Card, Empty, Badge } from "../components/ui";
import { buildBridge, seedExample, audit, type WebState } from "../lib/store";

export default function Respaldo(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;
  const [msg, setMsg] = React.useState("");

  function full(): void {
    const blob = new Blob([JSON.stringify({ ...buildBridge(s), audits: s.audits }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ezzy-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    set((p) => audit(p, "respaldo.exportar", "completo local"));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Respaldo local" icon={<DatabaseBackup size={18} />} sub="Sin nube. Las imágenes quedan fuera (solo referencias locales en tus equipos).">
        <div className="flex flex-wrap gap-2">
          <Button onClick={full}>Exportar todo</Button>
          <Button variant="secondary" onClick={() => { set(seedExample()); setMsg("Ejemplo sintético cargado."); }}><FlaskConical size={15} /> Cargar ejemplo</Button>
          <Button variant="destructive" onClick={() => { if (confirm("¿Borrar todo el panel? Haz un respaldo antes.")) { localStorage.removeItem("ezzy.web.v1"); location.reload(); } }}><Trash2 size={15} /> Borrar panel</Button>
        </div>
        {msg ? <p className="mt-2 text-[13px] text-[#6e6e73]">{msg}</p> : null}
      </Card>
      <Card title={`Auditoría local (${s.audits.length})`} icon={<ShieldCheck size={18} />} sub="Solo metadatos: acción + fecha + referencia. Nada de texto sensible. Retención 180 días."
        action={<Badge>local</Badge>}>
        {s.audits.length === 0 ? <Empty>Sin eventos.</Empty> : (
          <table className="w-full border-collapse text-sm">
            <thead><tr className="text-left text-xs text-[#6e6e73]"><th className="pb-1">Fecha</th><th className="pb-1">Acción</th><th className="pb-1">Detalle</th></tr></thead>
            <tbody>
              {s.audits.slice(0, 30).map((a) => (
                <tr key={a.id} className="border-t border-[#f0f0f3]">
                  <td className="mono py-1.5 pr-2 text-xs">{a.ts.slice(0, 19).replace("T", " ")}</td>
                  <td className="py-1.5 pr-2">{a.action}</td>
                  <td className="py-1.5">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[13px] text-[#6e6e73]">Incidente: olvida la key, pausa el sync, desconecta el equipo, limpia temporales, exporta este registro redactado.</p>
      </Card>
    </div>
  );
}
