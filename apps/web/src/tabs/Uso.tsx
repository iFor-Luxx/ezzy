import React from "react";
import { Gauge } from "lucide-react";
import { Card, Badge } from "../components/ui";
import { Skeleton } from "../components/ui/skeleton";
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
// 1 sola consulta a la vez. Al volver a la sección se trae fresco sin parpadear:
// si ya hay datos se muestran hasta que llegan los nuevos; si no hay, esqueletos.
export default function Uso(props: { active: boolean }) {
  const [st, setSt] = React.useState<CloudStatusView | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const busyRef = React.useRef(false);
  const hasData = React.useRef(false);

  React.useEffect(() => {
    if (!props.active || busyRef.current) return;
    busyRef.current = true;
    let alive = true;
    refreshStatus()
      .then((s) => {
        if (!alive) return;
        hasData.current = true;
        setSt(s);
        setErr(null);
      })
      .catch((e) => {
        if (!alive || hasData.current) return;
        setErr(e instanceof Error ? e.message : "no se pudo consultar");
      })
      .finally(() => {
        busyRef.current = false;
      });
    return () => {
      alive = false;
    };
  }, [props.active]);

  return (
    <Card title="Uso de tu servidor" icon={<Gauge size={18} />} sub="Medido por tu Worker y guardado en D1. Igual desde cualquier PC."
      action={st ? <Badge tone={st.blocked ? "bad" : "ok"}>{st.blocked ? `bloqueado ${st.code ?? ""}` : "en línea"}</Badge> : undefined}>
      <div className="grid gap-3">
        {err ? <p className="text-[13px] text-destructive">{err}</p> : null}
        {!st && !err ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Cargando uso">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-1">
                <div className="flex items-baseline justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : null}
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
