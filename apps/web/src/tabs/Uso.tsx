import React from "react";
import { Gauge, RefreshCw } from "lucide-react";
import { Button, Card, Badge } from "../components/ui";
import { pct, barTone, type CloudStatusView } from "../lib/cloud";
import { ensureStatus, refreshStatus, getCachedStatus } from "../lib/sync";

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
// 1 sola consulta por sesión; al volver se muestra lo guardado.
// Solo Actualizar vuelve a pedir (ahí cambian los porcentajes).
export default function Uso() {
  const [st, setSt] = React.useState<CloudStatusView | null>(() => getCachedStatus());
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (getCachedStatus()) return;
    let alive = true;
    setBusy(true);
    ensureStatus()
      .then((s) => {
        if (alive) setSt(s);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : "no se pudo consultar");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function actualizar(): Promise<void> {
    setBusy(true);
    setErr(null);
    try {
      setSt(await refreshStatus());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "no se pudo consultar");
    } finally {
      setBusy(false);
    }
  }

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
            <div>
              <Button variant="secondary" size="sm" onClick={() => void actualizar()} disabled={busy}>
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> {busy ? "" : "Actualizar"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
