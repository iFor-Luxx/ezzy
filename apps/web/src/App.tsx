import React from "react";
import { LayoutGrid, MessageSquareText, ScanEye, ArrowLeftRight, DatabaseBackup, Settings } from "lucide-react";
import Catalogo from "./tabs/Catalogo";
import Mensajes from "./tabs/Mensajes";
import Contexto from "./tabs/Contexto";
import Sincronizacion from "./tabs/Sincronizacion";
import Respaldo from "./tabs/Respaldo";
import Configuracion from "./tabs/Configuracion";
import { useWebState } from "./lib/store";
import { Toaster } from "./components/ui/toast";
import Login from "./screens/Login";
import { isAuthed } from "./lib/auth";

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
  const [authed, setAuthed] = React.useState(isAuthed);

  if (!authed) {
    return (
      <>
        <Login onAuthed={() => setAuthed(true)} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <header className="ez-topbar">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground sm:h-9 sm:w-9 sm:text-[17px]">e</div>
          <div>
            <p className="text-base font-semibold leading-tight tracking-tight sm:text-[17px]">Ezzy</p>
            <p className="text-xs leading-tight text-muted-foreground">Panel privado · tus datos quedan en este navegador</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-chart-2/10 px-3 py-1 text-xs font-medium text-chart-2 sm:inline">local</span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <nav className="ez-segment mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[27px] border border-border bg-muted/70 p-1 sm:mb-5" role="tablist" aria-label="Secciones">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:px-3.5 sm:py-2 sm:text-[13px] ${
                  active ? "border-border bg-card text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:text-foreground"
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
        <p className="mt-4 text-center text-xs text-muted-foreground sm:mt-6 sm:text-[13px]">
          Atajos de la extensión: Ctrl+Shift+Y selector · U/I/O favoritos. La extensión nunca envía sola.
        </p>
      </div>
      <Toaster />
    </>
  );
}
