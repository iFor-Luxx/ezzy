import React from "react";
import { Sparkles, ClipboardCopy } from "lucide-react";
import { Button, Card, Field, Input, Select, SelectTrigger, SelectContent, SelectItem, Badge, Empty } from "../components/ui";
import { type WebState } from "../lib/store";
import { pingApi, listModels, isBlockedForSales } from "@ezzy/ai-opencode";
import { storedModelId, saveModelId } from "../lib/ai";
import { toast } from "../components/ui/toast";

// La key vive solo en sessionStorage de esta pestaña (se borra al cerrar). Nunca en logs ni sync.
const KEY = "ezzy.oc.key";
const SAVED_KEY = "ezzy.oc.key.saved";
// Base Go verificada en docs (/console/go): lista y chat van con prefijo /go.
const GO_BASE = "https://opencode.ai/inference/go";
// En dev pasamos por proxy local para que el navegador no bloquee (CORS).
const BASE_URL = typeof window !== "undefined" && window.location.port === "5173" ? "/oc-api" : GO_BASE;

export default function Asistente(_props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const [model, setModel] = React.useState("");
  const [models, setModels] = React.useState<string[]>([]);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const [keyInput, setKeyInput] = React.useState("");
  const timer = React.useRef<number | undefined>(undefined);
  const fetching = React.useRef(false);
  const lastFetched = React.useRef("");
  const baseURL = BASE_URL;
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

  function readStored(which: "session" | "saved"): string {
    try {
      const v = which === "session" ? sessionStorage.getItem(KEY) : localStorage.getItem(SAVED_KEY);
      return v ?? "";
    } catch {
      return "";
    }
  }

  function writeStored(which: "session" | "saved", v: string): void {
    try {
      if (which === "session") {
        if (v) sessionStorage.setItem(KEY, v);
        else sessionStorage.removeItem(KEY);
      } else {
        if (v) localStorage.setItem(SAVED_KEY, v);
        else localStorage.removeItem(SAVED_KEY);
      }
    } catch {
      // sin almacenamiento
    }
  }

  // Al abrir: sesión primero; si no hay y la guardaste antes, se restaura sola.
  React.useEffect(() => {
    const k = readStored("session") || readStored("saved");
    setKeyInput(k);
    const stored = storedModelId();
    if (stored) setModel(stored);
    if (k.startsWith("oc_sk_") && k.length >= 20) {
      timer.current = window.setTimeout(() => void loadModels(k), 500);
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadModels(k: string): Promise<void> {
    if (fetching.current || lastFetched.current === k) return;
    fetching.current = true;
    setLoadingModels(true);
    try {
      const { models: list } = await listModels({ baseURL, apiKey: k });
      // Tal cual los trae tu key: sin ocultar ninguno. Los ⚠ pueden retener/entrenar.
      const ids = list.map((m) => m.id);
      setModels(ids);
      setModel((m) => (m && ids.includes(m) ? m : (ids.find((id) => !isBlockedForSales(id)) ?? ids[0] ?? "")));
      lastFetched.current = k;
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message.replace(/oc_sk_\S+/g, "oc_sk_…") : "no se pudo consultar" });
    } finally {
      fetching.current = false;
      setLoadingModels(false);
    }
  }

  function onKeyChange(v: string): void {
    setKeyInput(v);
    writeStored("session", v);
    if (!v) writeStored("saved", ""); // vaciar el campo olvida todo, incluido lo guardado
    if (timer.current) window.clearTimeout(timer.current);
    if (v.startsWith("oc_sk_") && v.length >= 20 && v !== lastFetched.current) {
      timer.current = window.setTimeout(() => void loadModels(v), 700);
    }
  }

  function saveKey(): void {
    if (!keyInput.startsWith("oc_sk_")) {
      toast.add({ title: "Error", description: "pega tu key primero" });
      return;
    }
    writeStored("saved", keyInput);
    toast.add({ description: "Key guardada en este navegador." });
  }

  // Prueba de conexión: solo HOLA, sin nada más. Solo para saber que la API responde.
  async function probar(): Promise<void> {
    setBusy(true);
    setDraft("");
    try {
      const k = keyInput;
      if (!k.startsWith("oc_sk_")) throw new Error("pega tu key");
      if (!model) throw new Error("espera a que carguen los modelos de tu key");
      const text = await pingApi({ baseURL, apiKey: k, modelId: model, text: "HOLA", sessionId, timeoutMs: 120000, stream: true, onToken: (t) => setDraft((d) => d + t) });
      setDraft(text);
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message.replace(/oc_sk_\S+/g, "oc_sk_…") : "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card label="Asistente IA">
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)]">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-primary"><Sparkles size={18} /></span>
            <h2 className="text-base font-semibold tracking-tight sm:text-[17px]">Generar propuesta</h2>
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="API key" htmlFor="ai-key">
              <Input id="ai-key" type="password" autoComplete="off" value={keyInput} onChange={(e) => onKeyChange(e.target.value)} />
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
                <p className="text-[13px] text-muted-foreground">{loadingModels ? "Consultando modelos…" : "Pega tu API key para cargar los modelos."}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="text-primary" onClick={() => void probar()} disabled={busy}>Test</Button>
              <Button onClick={saveKey} disabled={busy}>Guardar</Button>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="bg-border max-lg:-mx-4 max-lg:h-px max-lg:w-auto lg:-my-4 lg:w-px lg:self-stretch" />
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-primary"><ClipboardCopy size={18} /></span>
            <h2 className="text-base font-semibold tracking-tight sm:text-[17px]">Borrador</h2>
            {draft && !busy ? <span className="ml-auto"><Badge tone="ok">ok</Badge></span> : null}
          </div>
          {draft ? <p className="ez-pre mt-3">{draft}</p> : <Empty>Sin respuesta todavía. Pulsa Test.</Empty>}
        </div>
      </div>
    </Card>
  );
}
