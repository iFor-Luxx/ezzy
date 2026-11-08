import React from "react";
import { Sparkles, Gauge } from "lucide-react";
import Asistente from "./Asistente";
import Uso from "./Uso";
import type { WebState } from "../lib/store";

// Ajustes estilo macOS: sidebar gris con iconos en mosaico + contenido blanco con título.
// Para agregar una sección futura: añade su entrada aquí y su caso abajo.
const SECTIONS = [
  { id: "asistente", label: "Asistente IA", icon: Sparkles },
  { id: "uso", label: "Uso", icon: Gauge },
] as const;

export default function Configuracion(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const [section, setSection] = React.useState<string>("asistente");
  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[240px_1fr]">
      <aside aria-label="Ajustes" className="bg-muted/80 p-2">
        {SECTIONS.map((it) => {
          const Icon = it.icon;
          const active = section === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setSection(it.id)}
              aria-current={active ? "true" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition ${
                active ? "bg-black/[0.07]" : "hover:bg-black/[0.04]"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground">
                <Icon size={17} />
              </span>
              {it.label}
            </button>
          );
        })}
      </aside>
      <div className="min-w-0 border-t border-border p-4 md:border-l md:border-t-0">
        <div hidden={section !== "asistente"}><Asistente s={props.s} set={props.set} /></div>
        <div hidden={section !== "uso"}><Uso active={section === "uso"} /></div>
      </div>
    </div>
  );
}
