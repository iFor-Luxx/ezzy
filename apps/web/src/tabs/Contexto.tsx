import React from "react";
import { ScanEye, ImageOff } from "lucide-react";
import { Button, Card, Field, Textarea, Input, Empty } from "../components/ui";
import { audit, type WebState } from "../lib/store";
import { anonymizeForKnowledge } from "@ezzy/domain";
import { toast } from "../components/ui/toast";

// Texto manual + anonimizado local + aprobación. Imagen bloqueada (fail-closed).
export default function Contexto(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { set } = props;
  const [raw, setRaw] = React.useState("");
  const [prev, setPrev] = React.useState("");

  function redact(): void {
    if (!raw.trim()) {
      toast.add({ title: "Error", description: "Pega primero un fragmento (máx 4000)." });
      return;
    }
    if (raw.length > 4000) {
      toast.add({ title: "Error", description: "Fragmento > 4000 caracteres." });
      return;
    }
    setPrev(anonymizeForKnowledge(raw));
    set((p) => audit(p, "contexto.anonimizar", `${raw.length} chars → local`));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Contexto para IA" icon={<ScanEye size={18} />} sub="Se anonimiza en tu navegador. Nada sale sin tu confirmación en Asistente.">
        <div className="grid gap-3">
          <Field label="Fragmento" htmlFor="cx-raw"><Textarea id="cx-raw" value={raw} onChange={(e) => setRaw(e.target.value)} /></Field>
          <div className="flex gap-2">
            <Button onClick={redact}>1) Anonimizar local</Button>
            <Button variant="secondary" onClick={() => { setRaw(""); setPrev(""); toast.add({ description: "Temporales limpiados." }); }}>Cancelar y limpiar</Button>
          </div>
        </div>
      </Card>
      <Card title="Vista previa anonimizada" sub="Edítala antes de usarla como contexto.">
        {prev ? <p className="ez-pre">{prev}</p> : <Empty>Sin vista previa.</Empty>}
        <Field label="Imagen" htmlFor="cx-img">
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-[13px] text-(--ez-muted)">
            <ImageOff size={15} /> Bloqueada en esta versión
          </div>
          <Input id="cx-img" type="file" accept="image/*" className="hidden" aria-label="Imagen bloqueada"
            onChange={(e) => { e.target.value = ""; toast.add({ title: "Error", description: "Imagen no soportada: pega el texto manualmente." }); }} />
        </Field>
      </Card>
    </div>
  );
}
