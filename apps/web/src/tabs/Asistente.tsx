import React from "react";
import { Button, Field, Input, Select, SelectTrigger, SelectContent, SelectItem, Empty } from "../components/ui";
import { Skeleton } from "../components/ui/skeleton";
import { type WebState } from "../lib/store";
import { isBlockedForSales } from "@ezzy/ai-opencode";
import { storedModelId, saveModelId } from "../lib/ai";
import { aiKeyStatus, aiSaveKey, aiForgetKey, aiGetKey, aiListModels, aiChat } from "../lib/aiServer";
import { toast } from "../components/ui/toast";

// La key vive en tu nube (Worker/D1, write-only): vale en localhost y en cualquier PC.
// El navegador nunca la guarda: el input es transitorio y se limpia al guardar.
export default function Asistente(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>>; active: boolean }) {
  const [model, setModel] = React.useState(() => storedModelId());
  const [models, setModels] = React.useState<string[]>([]);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [keyInput, setKeyInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);
  const fetching = React.useRef(false);
  const statusChecked = React.useRef(false);
  // El modelo elegido siempre queda guardado (para usarlo desde Catálogo).
  React.useEffect(() => {
    if (model) saveModelId(model);
  }, [model]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // ID estable de sesión para Go (se genera una vez por pestaña).
  const [sessionId] = React.useState(() => {
    let id = "";
    try {
      id = sessionStorage.getItem("ezzy.oc.session") ?? "";
    } catch {
      id = "";
    }
    if (!id) {
      id = crypto.randomUUID();
      try {
        sessionStorage.setItem("ezzy.oc.session", id);
      } catch {
        // sin almacenamiento: se usa solo en memoria
      }
    }
    return id;
  });

  // Al mostrarse: una sola consulta de estado + modelos (vía proxy, sin key local).
  const activeRef = React.useRef(props.active);
  activeRef.current = props.active;
  const modelsLenRef = React.useRef(0);
  modelsLenRef.current = models.length;
  React.useEffect(() => {
    if (!activeRef.current || statusChecked.current) return;
    statusChecked.current = true;
    void (async () => {
      try {
        const st = await aiKeyStatus();
        setConfigured(st.configured);
        if (st.configured) {
          // Rellena el campo con la guardada (vale tras recargar y en cualquier PC).
          const saved = await aiGetKey().catch(() => null);
          if (saved) setKeyInput(saved);
          if (modelsLenRef.current === 0) await loadModels();
        }
      } catch (e) {
        toast.add({ title: "Error", description: e instanceof Error ? e.message : "no se pudo consultar" });
        setConfigured(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.active]);

  async function loadModels(): Promise<void> {
    if (fetching.current) return;
    fetching.current = true;
    setLoadingModels(true);
    try {
      // Tal cual los trae tu key: sin ocultar ninguno. Los ⚠ pueden retener/entrenar.
      const ids = await aiListModels();
      setModels(ids);
      setModel((m) => (m && ids.includes(m) ? m : (ids.find((id) => !isBlockedForSales(id)) ?? ids[0] ?? "")));
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "no se pudo consultar" });
    } finally {
      fetching.current = false;
      setLoadingModels(false);
    }
  }

  async function saveKey(): Promise<void> {
    if (!keyInput.startsWith("oc_sk_") || keyInput.length < 20) {
      toast.add({ title: "Error", description: "pega tu key primero" });
      return;
    }
    setSaving(true);
    try {
      await aiSaveKey(keyInput.trim());
      setConfigured(true);
      toast.add({ description: "Guardado." });
      await loadModels();
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "no se pudo guardar" });
    } finally {
      setSaving(false);
    }
  }

  async function clearKey(): Promise<void> {
    setKeyInput("");
    if (!configured) return;
    try {
      await aiForgetKey();
      setConfigured(false);
      setModels([]);
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "no se pudo eliminar" });
    }
  }

  // Prueba de conexión: solo HOLA, sin nada más. Solo para saber que la API responde.
  async function probar(): Promise<void> {
    setBusy(true);
    setDraft("");
    try {
      if (!model) throw new Error("espera a que carguen los modelos de tu key");
      const text = await aiChat({ modelId: model, text: "HOLA", sessionId, timeoutMs: 120000, stream: true, onToken: (t) => setDraft((d) => d + t) });
      setDraft(text);
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="px-3 text-lg font-bold tracking-tight sm:text-[19px]">Asistente IA</h1>
      <div aria-hidden="true" className="-mx-4 mb-3 mt-3 h-px bg-border" />
      <div className="grid items-center gap-3 px-3 lg:grid-cols-[minmax(0,3fr)_auto_minmax(0,2fr)]">
        <div className="min-w-0">
          <div className="grid gap-3">
            <Field label="API key" htmlFor="ai-key">
              <div className="relative">
                <Input id="ai-key" type="password" autoComplete="off" placeholder="oc_sk_…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="pr-11" />
                {keyInput || configured ? (
                  <button type="button" aria-label="Eliminar key" title="Eliminar" onClick={() => void clearKey()}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition active:scale-95 hover:bg-muted hover:text-foreground">
                    ✕
                  </button>
                ) : null}
              </div>
            </Field>
            <div>
              <label htmlFor="ai-model" className="mb-1.5 block text-[13px] font-medium">Modelo</label>
              {models.length ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="ai-model" />
                  <SelectContent>
                    {models.map((m) => <SelectItem key={m} value={m}>{m}{isBlockedForSales(m) ? " ⚠" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Skeleton className="h-9 w-full rounded-full" />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="text-primary" onClick={() => void probar()} disabled={busy || loadingModels}>Test</Button>
              <Button onClick={() => void saveKey()} disabled={saving || busy}>Guardar</Button>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="bg-border max-lg:-mx-7 max-lg:h-px max-lg:w-auto lg:-mb-4 lg:-mt-3 lg:w-px lg:self-stretch" />
        <div className="min-w-0">
          {draft ? <p className="ez-pre">{draft}</p> : <Empty>Sin respuesta todavía. Pulsa Test.</Empty>}
        </div>
      </div>
    </>
  );
}
