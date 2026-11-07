import React from "react";
import { ScanEye, ImageOff } from "lucide-react";
import { Button, Card, Field, Textarea, Input, Empty } from "../components/ui";
import { audit, type WebState } from "../lib/store";
import { anonymizeForKnowledge } from "@ezzy/domain";

// Texto manual + anonimizado local + aprobación. Imagen bloqueada (fail-closed).
export default function Contexto(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { set } = props;
  const [raw, setRaw] = React.useState("");
  const [prev, setPrev] = React.useState("");
  const [msg, setMsg] = React.useState("");

  function redact(): void {
    if (!raw.trim()) {
      setMsg("Pega primero un fragmento (máx 4000).");
      return;
    }
    if (raw.length > 4000) {
      setMsg("Fragmento > 4000 caracteres.");
      return;
    }
    setPrev(anonymizeForKnowledge(raw));
    setMsg("");
    set((p) => audit(p, "contexto.anonimizar", `${raw.length} chars → local`));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Contexto para IA" icon={<ScanEye size={18} />} sub="Se anonimiza en tu navegador. Nada sale sin tu confirmación en Asistente.">
        <div className="grid gap-3">
          <Field label="Fragmento" htmlFor="cx-raw"><Textarea id="cx-raw" value={raw} onChange={(e) => setRaw(e.target.value)} /></Field>
          <div className="flex gap-2">
            <Button onClick={redact}>1) Anonimizar local</Button>
            <Button variant="secondary" onClick={() => { setRaw(""); setPrev(""); setMsg("Temporales limpiados."); }}>Cancelar y limpiar</Button>
          </div>
          {msg ? <p className="text-[13px] text-[#6e6e73]">{msg}</p> : null}
        </div>
      </Card>
      <Card title="Vista previa anonimizada" sub="Edítala antes de usarla como contexto.">
        {prev ? <p className="ez-pre">{prev}</p> : <Empty>Sin vista previa.</Empty>}
        <Field label="Imagen" htmlFor="cx-img">
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#d2d2d7] p-3 text-[13px] text-[#6e6e73]">
            <ImageOff size={15} /> Bloqueada en esta versión
          </div>
          <Input id="cx-img" type="file" accept="image/*" className="hidden" aria-label="Imagen bloqueada"
            onChange={(e) => { e.target.value = ""; setMsg("Imagen no soportada: pega el texto manualmente."); }} />
        </Field>
      </Card>
    </div>
  );
}
