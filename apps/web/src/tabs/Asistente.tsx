import React from "react";
import { Sparkles, ClipboardCopy, Clipboard, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select, SelectTrigger, SelectContent, SelectItem, Badge, Empty } from "../components/ui";
import { type WebState } from "../lib/store";
import { pingApi, listModels, isBlockedForSales } from "@ezzy/ai-opencode";

// La key vive solo en sessionStorage de esta pestaña (se borra al cerrar). Nunca en logs ni sync.
const KEY = "ezzy.oc.key";
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
  const [draft, setDraft] = React.useState("");
  const [err, setErr] = React.useState("");
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

  // Al abrir: recupera key de sesión. Solo hay modelos tras consulta en vivo con esa key.
  React.useEffect(() => {
    const k = sessionStorage.getItem(KEY) ?? "";
    setKeyInput(k);
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
    setErr("");
    try {
      const { models: list } = await listModels({ baseURL, apiKey: k });
      // Tal cual los trae tu key: sin ocultar ninguno. Los ⚠ pueden retener/entrenar.
      const ids = list.map((m) => m.id);
      setModels(ids);
      setModel((m) => (m && ids.includes(m) ? m : (ids.find((id) => !isBlockedForSales(id)) ?? ids[0] ?? "")));
      lastFetched.current = k;
    } catch (e) {
      setErr(e instanceof Error ? e.message.replace(/oc_sk_\S+/g, "oc_sk_…") : "no se pudo consultar");
    } finally {
      fetching.current = false;
      setLoadingModels(false);
    }
  }

  function onKeyChange(v: string): void {
    setKeyInput(v);
    setErr("");
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
    if (timer.current) window.clearTimeout(timer.current);
    if (v.startsWith("oc_sk_") && v.length >= 20 && v !== lastFetched.current) {
      timer.current = window.setTimeout(() => void loadModels(v), 700);
    }
  }

  async function pasteKey(): Promise<void> {
    try {
      const v = (await navigator.clipboard.readText()).trim();
      if (timer.current) window.clearTimeout(timer.current);
      onKeyChange(v);
      if (v.startsWith("oc_sk_")) await loadModels(v);
      else setErr("eso no parece una key (empieza con oc_sk_)");
    } catch {
      setErr("no se pudo pegar: usa Ctrl+V en el campo");
    }
  }

  function clearKey(): void {
    if (timer.current) window.clearTimeout(timer.current);
    setKeyInput("");
    sessionStorage.removeItem(KEY);
    setModels([]);
    setModel("");
    setErr("");
  }

  // Prueba de conexión: solo HOLA, sin nada más. Solo para saber que la API responde.
  async function probar(): Promise<void> {
    setErr("");
    setBusy(true);
    setDraft("");
    try {
      const k = keyInput;
      if (!k.startsWith("oc_sk_")) throw new Error("pega tu key");
      if (!model) throw new Error("espera a que carguen los modelos de tu key");
      const text = await pingApi({ baseURL, apiKey: k, modelId: model, text: "HOLA", sessionId, timeoutMs: 120000, stream: true, onToken: (t) => setDraft((d) => d + t) });
      setDraft(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message.replace(/oc_sk_\S+/g, "oc_sk_…") : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card title="Generar propuesta" icon={<Sparkles size={18} />}>
          <div className="grid gap-3">
            <Field label="API key" htmlFor="ai-key">
              <div className="relative">
                <Input id="ai-key" type="password" autoComplete="off" value={keyInput} onChange={(e) => onKeyChange(e.target.value)} className="pr-11" />
                {keyInput ? (
                  <button type="button" aria-label="Eliminar key" title="Eliminar" onClick={clearKey}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#6e6e73] transition active:scale-95 hover:bg-[#f5f5f7]">
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <button type="button" aria-label="Pegar key" title="Pegar" onClick={() => void pasteKey()}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#0071e3] transition active:scale-95 hover:bg-[#f5f5f7]">
                    <Clipboard size={16} />
                  </button>
                )}
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
                <p className="text-[13px] text-[#6e6e73]">{loadingModels ? "Consultando modelos…" : "Pega tu API key para cargar los modelos."}</p>
              )}
            </div>
            {err ? <p className="text-[13px] text-[#cf222e]">{err}</p> : null}
            <div><Button onClick={() => void probar()} disabled={busy}>Test</Button></div>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-3">
        <Card title="Borrador" icon={<ClipboardCopy size={18} />}
          action={draft && !busy ? <Badge tone="ok">ok</Badge> : undefined}>
          {draft ? <p className="ez-pre">{draft}</p> : <Empty>Sin respuesta todavía. Pulsa Test.</Empty>}
        </Card>
      </div>
    </div>
  );
}
