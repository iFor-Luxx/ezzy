import React from "react";
import { ArrowLeftRight, CloudSun, Upload, Download, RefreshCw } from "lucide-react";
import { Button, Card, Field, Input, Badge } from "../components/ui";
import { buildBridge, parseBridge, audit, type WebState } from "../lib/store";
import { parseStatus, pct, barTone, WORKER_KEY, STATUS_KEY, type CloudStatusView } from "../lib/cloud";
import ExplorerNube from "./ExplorerNube";
import { toast } from "../components/ui/toast";

function Bar(props: { label: string; used: number; cap: number; unit: string }) {
  const p = pct(props.used, props.cap);
  const tone = barTone(p);
  const color = tone === "ok" ? "bg-[#1a7f37]" : tone === "warn" ? "bg-[#9a6700]" : "bg-[#cf222e]";
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-[#6e6e73]">{props.label}</span>
        <span className="mono text-xs">{props.used.toLocaleString("es-PE")} / {props.cap.toLocaleString("es-PE")} {props.unit} · {p.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e8e8ed]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(p, 2)}%` }} />
      </div>
    </div>
  );
}

// Puente v1: la web exporta JSON y lo importas en Opciones de la extensión.
// Estado de la nube: lee /v1/status de tu Worker desplegado (sin tokens en el navegador).
export default function Sincronizacion(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;
  const [workerUrl, setWorkerUrl] = React.useState(() => {
    try {
      return localStorage.getItem(WORKER_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [cloud, setCloud] = React.useState<CloudStatusView | null>(() => {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      return raw ? (parseStatus(JSON.parse(raw)) as CloudStatusView) : null;
    } catch {
      return null;
    }
  });
  const [checking, setChecking] = React.useState(false);

  function download(): void {
    const blob = new Blob([JSON.stringify(buildBridge(s), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ezzy-puente-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    set((p) => audit(p, "puente.exportar", `${s.products.length} prod, ${s.messages.length} msg`));
    toast.add({ description: "Archivo descargado. En la extensión: Opciones → Restaurar." });
  }

  function upload(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const back = parseBridge(JSON.parse(String(r.result)));
        set((p) => audit({
          ...p,
          products: [...p.products, ...back.products.filter((x) => !p.products.some((y) => y.id === x.id))],
          variants: [...p.variants, ...(back.variants ?? []).filter((x) => !p.variants.some((y) => y.id === x.id))],
          prices: [...p.prices, ...back.prices.filter((x) => !p.prices.some((y) => y.id === x.id))],
          messages: [...p.messages, ...back.messages.filter((x) => !p.messages.some((y) => y.id === x.id))],
        }, "puente.importar", f.name));
        toast.add({ description: `Importado: ${back.products.length} productos, ${back.messages.length} mensajes.` });
      } catch (ex) {
        toast.add({ title: "Error", description: ex instanceof Error ? ex.message : "archivo inválido" });
      }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  async function checkCloud(): Promise<void> {
    const base = workerUrl.trim().replace(/\/+$/, "");
    if (!base.startsWith("https://")) {
      toast.add({ title: "Error", description: "pega la URL https de tu Worker desplegado" });
      return;
    }
    setChecking(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${base}/v1/status`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`el Worker respondió ${res.status}`);
      const st = parseStatus(await res.json());
      setCloud(st);
      try {
        localStorage.setItem(WORKER_KEY, base);
        localStorage.setItem(STATUS_KEY, JSON.stringify(st));
      } catch {
        // sin almacenamiento: se muestra solo en esta sesión
      }
      set((p) => audit(p, "nube.consultar", st.blocked ? `bloqueado ${st.code ?? ""}` : "ok"));
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error && e.name === "AbortError" ? "sin respuesta (15s)" : e instanceof Error ? e.message : "no se pudo consultar" });
    } finally {
      window.clearTimeout(timer);
      setChecking(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Estado de la nube" icon={<CloudSun size={18} />}
        sub="Tu Worker, sin entrar a Cloudflare."
        action={cloud ? <Badge tone={cloud.blocked ? "bad" : "ok"}>{cloud.blocked ? `bloqueado ${cloud.code ?? ""}` : "en línea"}</Badge> : <Badge>sin conectar</Badge>}>
        <div className="grid gap-3">
          <Field label="URL del Worker" htmlFor="wk-url">
            <div className="flex gap-2">
              <Input id="wk-url" value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)} inputMode="url" aria-label="URL del Worker" />
              <Button variant="secondary" onClick={() => void checkCloud()} disabled={checking}>
                <RefreshCw size={15} className={checking ? "animate-spin" : ""} /> {checking ? "" : "Ver"}
              </Button>
            </div>
          </Field>
          {cloud ? (
            <>
              <p className="text-[13px] text-[#6e6e73]">
                Plan {cloud.plan}{cloud.planVerifiedAt ? ` · verificado ${cloud.planVerifiedAt.slice(0, 10)}` : " · sin verificar"} ·{" "}
                {cloud.entities} entidades · {cloud.installations} instalaciones ·{" "}
                <span className="mono text-xs">{cloud.ts.slice(0, 19).replace("T", " ")}</span>
              </p>
              <Bar label="Peticiones / día" used={cloud.used.req} cap={cloud.caps.workersReqDay} unit="req" />
              <Bar label="Lecturas D1 / día" used={cloud.used.reads} cap={cloud.caps.d1ReadsDay} unit="filas" />
              <Bar label="Escrituras D1 / día" used={cloud.used.writes} cap={cloud.caps.d1WritesDay} unit="filas" />
            </>
          ) : null}
        </div>
      </Card>
      <Card title="Puente con la extensión" icon={<ArrowLeftRight size={18} />}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}><Download size={15} /> Exportar puente JSON</Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#e8e8ed] px-4 text-sm font-medium hover:bg-[#d2d2d7]" htmlFor="br-file">
            <Upload size={15} /> Importar puente
          </label>
          <input id="br-file" type="file" accept="application/json" className="hidden" onChange={upload} />
        </div>
      </Card>
      {cloud && !cloud.blocked ? (
        <div className="lg:col-span-2">
          <ExplorerNube workerUrl={workerUrl} />
        </div>
      ) : null}
    </div>
  );
}
