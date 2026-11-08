import React from "react";
import { Gauge } from "lucide-react";
import { Card, Badge } from "../components/ui";
import { pct, barTone, type CloudStatusView } from "../lib/cloud";
import { refreshStatus } from "../lib/sync";

function Bar(props: { label: string; used: number; cap: number; unit: string }) {
  const p = pct(props.used, props.cap);
  const tone = barTone(p);
  const color = tone === "ok" ? "bg-chart-2" : tone === "warn" ? "bg-chart-4" : "bg-destructive";
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-muted-foreground">{props.label}</span>
        <span className="mono text-xs">{props.used.toLocaleString("es-PE")} / {props.cap.toLocaleString("es-PE")} {props.unit} · {p.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(p, 2)}%` }} />
      </div>
    </div>
  );
}

// Uso real de tu servidor: contadores durables en D1 + filas guardadas.
// 1 sola consulta al entrar a la sección. Para recargar, sal y vuelve a entrar.
export default function Uso() {
  const [st, setSt] = React.useState<CloudStatusView | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    refreshStatus()
      .then((s) => {
        if (alive) setSt(s);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : "no se pudo consultar");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card title="Uso de tu servidor" icon={<Gauge size={18} />} sub="Medido por tu Worker y guardado en D1. Igual desde cualquier PC."
      action={st ? <Badge tone={st.blocked ? "bad" : "ok"}>{st.blocked ? `bloqueado ${st.code ?? ""}` : "en línea"}</Badge> : undefined}>
      <div className="grid gap-3">
        {err ? <p className="text-[13px] text-destructive">{err}</p> : null}
        {!st && !err ? <p className="text-[13px] text-muted-foreground">Consultando a tu servidor…</p> : null}
        {st ? (
          <>
            <p className="text-[13px] text-muted-foreground">
              Día {st.day || "—"} · Plan {st.plan} · {st.entities} entidades · {st.installations} instalaciones
            </p>
            <Bar label="Peticiones / día" used={st.used.req} cap={st.caps.workersReqDay} unit="req" />
            <Bar label="Lecturas D1 / día" used={st.used.reads} cap={st.caps.d1ReadsDay} unit="filas" />
            <Bar label="Escrituras D1 / día" used={st.used.writes} cap={st.caps.d1WritesDay} unit="filas" />
            <p className="text-[13px] text-muted-foreground">
              Guardado: {st.storage.records} registros · {st.storage.installations} instalaciones · {st.storage.keys} claves
            </p>
          </>
        ) : null}
      </div>
    </Card>
  );
}
