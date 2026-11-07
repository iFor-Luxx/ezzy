import React from "react";
import {
  DatabaseBackup, FlaskConical, Trash2, ShieldCheck, Package, MessageSquareText,
  Sparkles, ArrowLeftRight, ScanEye, CloudSun,
} from "lucide-react";
import { Button, Card, Empty, Badge } from "../components/ui";
import { buildBridge, seedExample, audit, type WebState } from "../lib/store";
import { toast } from "../components/ui/toast";

function fmtDay(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return "Hoy";
  const yesterday = new Date(now.getTime() - 86400000);
  if (sameDay(d, yesterday)) return "Ayer";
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function actionMeta(action: string): { label: string; Icon: typeof Package } {
  if (action.startsWith("producto.")) return { label: "Producto", Icon: Package };
  if (action.startsWith("mensaje.")) return { label: "Mensaje", Icon: MessageSquareText };
  if (action.startsWith("ia.")) return { label: "Asistente IA", Icon: Sparkles };
  if (action.startsWith("puente.")) return { label: "Puente", Icon: ArrowLeftRight };
  if (action.startsWith("nube.")) return { label: "Nube", Icon: CloudSun };
  if (action.startsWith("contexto.")) return { label: "Contexto", Icon: ScanEye };
  if (action.startsWith("respaldo.") || action === "seed") return { label: "Respaldo", Icon: DatabaseBackup };
  return { label: "Actividad", Icon: ShieldCheck };
}

export default function Respaldo(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;

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
          <Button variant="secondary" onClick={() => { set(seedExample()); toast.add({ description: "Ejemplo sintético cargado." }); }}><FlaskConical size={15} /> Cargar ejemplo</Button>
          <Button variant="destructive" onClick={() => { if (confirm("¿Borrar todo el panel? Haz un respaldo antes.")) { localStorage.removeItem("ezzy.web.v1"); location.reload(); } }}><Trash2 size={15} /> Borrar panel</Button>
        </div>
      </Card>
      <Card title={`Auditoría (${s.audits.length})`} icon={<ShieldCheck size={18} />} sub="Solo qué pasó y cuándo. Nada de texto sensible."
        action={<Badge>local</Badge>}>
        {s.audits.length === 0 ? <Empty>Sin eventos.</Empty> : (
          <div>
            {(() => {
              const groups = new Map<string, typeof s.audits>();
              for (const a of s.audits.slice(0, 60)) {
                const day = fmtDay(a.ts);
                if (!groups.has(day)) groups.set(day, []);
                groups.get(day)!.push(a);
              }
              return [...groups.entries()].map(([day, rows]) => (
                <div key={day} className="mb-3 last:mb-0">
                  <p className="mb-1 text-xs font-medium text-[#6e6e73]">{day}</p>
                  <div className="overflow-hidden rounded-xl border border-[#e8e8ed]">
                    {rows.map((a) => {
                      const meta = actionMeta(a.action);
                      const Icon = meta.Icon;
                      return (
                        <div key={a.id} className="flex items-center gap-3 border-t border-[#f0f0f3] px-3 py-2 first:border-t-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6e6e73]">
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{meta.label} · <span className="font-normal text-[#6e6e73]">{a.detail}</span></p>
                          </div>
                          <span className="mono shrink-0 text-xs text-[#6e6e73]">{fmtTime(a.ts)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
        <p className="mt-2 text-[13px] text-[#6e6e73]">Incidente: olvida la key, pausa el sync, desconecta el equipo, limpia temporales, exporta este registro redactado.</p>
      </Card>
    </div>
  );
}
