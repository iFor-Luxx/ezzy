import React from "react";
import { LayoutGrid, MessageSquareText, ScanEye, ArrowLeftRight, DatabaseBackup, Settings } from "lucide-react";
import Catalogo from "./tabs/Catalogo";
import Mensajes from "./tabs/Mensajes";
import Contexto from "./tabs/Contexto";
import Sincronizacion from "./tabs/Sincronizacion";
import Respaldo from "./tabs/Respaldo";
import Configuracion from "./tabs/Configuracion";
import { useWebState } from "./lib/store";
import { Toaster } from "./components/ui/toaster";

const TABS = [
  { id: "catalogo", label: "Catálogo", icon: LayoutGrid },
  { id: "mensajes", label: "Mensajes", icon: MessageSquareText },
  { id: "contexto", label: "Contexto", icon: ScanEye },
  { id: "sync", label: "Sincronización", icon: ArrowLeftRight },
  { id: "respaldo", label: "Respaldo", icon: DatabaseBackup },
  { id: "config", label: "Configuración", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [s, set] = useWebState();
  const [tab, setTab] = React.useState<TabId>("catalogo");

  return (
    <>
      <header className="ez-topbar">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1d1d1f] text-[17px] font-bold text-white">e</div>
          <div>
            <p className="text-[17px] font-semibold leading-tight tracking-tight">Ezzy</p>
            <p className="text-xs leading-tight text-[#6e6e73]">Panel privado · tus datos quedan en este navegador</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-[#1a7f37]/10 px-3 py-1 text-xs font-medium text-[#1a7f37] sm:inline">local</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-5">
        <nav className="ez-segment mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-[#e8e8ed]/70 p-1" role="tablist" aria-label="Secciones">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all ${
                  active ? "bg-white text-[#1d1d1f] shadow" : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </nav>
        <main role="tabpanel">
          {tab === "catalogo" && <Catalogo s={s} set={set} />}
          {tab === "mensajes" && <Mensajes s={s} set={set} />}
          {tab === "config" && <Configuracion s={s} set={set} />}
          {tab === "contexto" && <Contexto s={s} set={set} />}
          {tab === "sync" && <Sincronizacion s={s} set={set} />}
          {tab === "respaldo" && <Respaldo s={s} set={set} />}
        </main>
        <p className="mt-6 text-center text-[13px] text-[#6e6e73]">
          Atajos de la extensión: Ctrl+Shift+Y selector · U/I/O favoritos. La extensión nunca envía sola.
        </p>
      </div>
      <Toaster />
    </>
  );
}
