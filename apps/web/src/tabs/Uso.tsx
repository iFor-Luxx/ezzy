import React from "react";
import { Skeleton } from "../components/ui/skeleton";
import { pct, barTone, type CloudStatusView } from "../lib/cloud";
import { refreshStatus } from "../lib/sync";

function Bar(props: { label: string; used: number | null; cap: number; unit: string }) {
  const p = props.used === null ? 0 : pct(props.used, props.cap);
  const tone = barTone(p);
  const color = tone === "ok" ? "bg-chart-2" : tone === "warn" ? "bg-chart-4" : "bg-destructive";
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-muted-foreground">{props.label}</span>
        {props.used === null ? (
          <Skeleton className="h-3 w-44" />
        ) : (
          <span className="mono text-xs">{props.used.toLocaleString("es-PE")} / {props.cap.toLocaleString("es-PE")} {props.unit} · {p.toFixed(1)}%</span>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        {props.used === null ? (
          <Skeleton className="h-full w-full rounded-full" />
        ) : (
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(p, 2)}%` }} />
        )}
      </div>
    </div>
  );
}

// Uso real de tu servidor: contadores durables en D1 + filas guardadas.
// 1 sola consulta a la vez. Estructura fija: solo números y barras llevan
// esqueleto mientras cargan; al volver se muestra lo guardado sin parpadear.
const CAPS = { workersReqDay: 100000, d1ReadsDay: 5000000, d1WritesDay: 100000 };

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
    <div className="grid gap-3">
      <h1 className="text-lg font-bold tracking-tight sm:text-[19px]">Uso</h1>
      {err ? <p className="text-[13px] text-destructive">{err}</p> : null}
      <Bar label="Peticiones / día" used={st ? st.used.req : null} cap={st?.caps.workersReqDay ?? CAPS.workersReqDay} unit="req" />
      <Bar label="Lecturas D1 / día" used={st ? st.used.reads : null} cap={st?.caps.d1ReadsDay ?? CAPS.d1ReadsDay} unit="filas" />
      <Bar label="Escrituras D1 / día" used={st ? st.used.writes : null} cap={st?.caps.d1WritesDay ?? CAPS.d1WritesDay} unit="filas" />
      <p className="text-[13px] text-muted-foreground">
        Hoy {st?.day ?? "—"} · Plan {st?.plan ?? "—"} · {st ? `${st.storage.records} registros · ${st.storage.installations} instalaciones · ${st.storage.keys} claves` : "—"}
      </p>
    </div>
  );
}
