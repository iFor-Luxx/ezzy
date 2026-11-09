import React from "react";
import { LayoutGrid, MessageSquareText, ScanEye, Database, Settings } from "lucide-react";
import Catalogo from "./tabs/Catalogo";
import Mensajes from "./tabs/Mensajes";
import Contexto from "./tabs/Contexto";
import Base from "./tabs/Datos";
import Configuracion from "./tabs/Configuracion";
import { useWebState, audit } from "./lib/store";
import { Toaster, toast } from "./components/ui/toast";
import Login from "./screens/Login";
import { isAuthed } from "./lib/auth";
import { pullWebState } from "./lib/sync";

const TABS = [
  { id: "catalogo", label: "Catálogo", icon: LayoutGrid },
  { id: "mensajes", label: "Mensajes", icon: MessageSquareText },
  { id: "contexto", label: "Contexto", icon: ScanEye },
  { id: "base", label: "Base", icon: Database },
  { id: "config", label: "Configuración", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [s, set] = useWebState();
  const [tab, setTab] = React.useState<TabId>("catalogo");
  const [authed, setAuthed] = React.useState(isAuthed);
  const [cloud, setCloud] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  // Pestañas visitadas: se montan una vez y quedan montadas (hidden).
  // Así no se pierde estado (tokens, formularios, datos) ni se repiten llamadas al cambiar.
  const [visited, setVisited] = React.useState<TabId[]>(["catalogo"]);
  function go(id: TabId): void {
    setTab(id);
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
  }

  // Fuente de verdad: la nube. Al entrar (cualquier PC), una sola descarga.
  React.useEffect(() => {
    if (!authed || cloud !== "idle") return;
    setCloud("loading");
    let alive = true;
    pullWebState(s.audits)
      .then((fresh) => {
        if (!alive) return;
        set(() => audit(fresh, "nube.cargar", `${fresh.products.length} prod, ${fresh.messages.length} msg`));
        setCloud("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setCloud("error");
        toast.add({ title: "Nube no disponible", description: e instanceof Error ? `${e.message} · mostrando caché local` : "mostrando caché local" });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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
            <p className="text-xs leading-tight text-muted-foreground">Panel privado · tus datos viven en tu nube</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-chart-2/10 px-3 py-1 text-xs font-medium text-chart-2 sm:inline">
            {cloud === "loading" ? "nube…" : cloud === "ready" ? "nube" : cloud === "error" ? "local (sin nube)" : "nube"}
          </span>
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
                onClick={() => go(t.id)}
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
          {visited.includes("catalogo") && <div hidden={tab !== "catalogo"}><Catalogo s={s} set={set} /></div>}
          {visited.includes("mensajes") && <div hidden={tab !== "mensajes"}><Mensajes s={s} set={set} /></div>}
          {visited.includes("config") && <div hidden={tab !== "config"}><Configuracion s={s} set={set} /></div>}
          {visited.includes("contexto") && <div hidden={tab !== "contexto"}><Contexto s={s} set={set} /></div>}
          {visited.includes("base") && <div hidden={tab !== "base"}><Base active={tab === "base"} /></div>}
        </main>
        <p className="mt-4 text-center text-xs text-muted-foreground sm:mt-6 sm:text-[13px]">
          Atajos de la extensión: Ctrl+Shift+Y selector · U/I/O favoritos. La extensión nunca envía sola.
        </p>
      </div>
      <Toaster />
    </>
  );
}
