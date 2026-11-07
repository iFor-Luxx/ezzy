import React from "react";
import { Database, Pencil, Trash2, RefreshCw, KeyRound } from "lucide-react";
import { Button, Card, Field, Input, Textarea, Badge } from "../components/ui";
import { buildUpsert, buildTombstone, type RemoteRecord, type SyncChange } from "../lib/cloud";
import { toast } from "../hooks/use-toast";

// Datos en la nube: ver, editar y eliminar registros del Worker desplegado.
// Requiere instalación enrolada (secreto del propietario, solo en memoria, nunca se guarda).
const INST_KEY = "ezzy.web.installation";

async function api(base: string, path: string, installationId: string, init?: RequestInit, timeoutMs = 15000): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-ezzy-installation": installationId, ...(init?.headers ?? {}) },
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data) {
      const err = data?.["error"] as { code?: unknown; message?: unknown } | undefined;
      throw new Error(typeof err?.message === "string" ? err.message : `error ${res.status}`);
    }
    if (data["error"]) {
      const err = data["error"] as { code?: unknown; message?: unknown };
      throw new Error(typeof err.message === "string" ? err.message : "rechazado");
    }
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("sin respuesta (15s)");
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function ExplorerNube(props: { workerUrl: string }) {
  const base = props.workerUrl.trim().replace(/\/+$/, "");
  const [instId, setInstId] = React.useState(() => {
    try {
      return localStorage.getItem(INST_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [secret, setSecret] = React.useState("");
  const [records, setRecords] = React.useState<RemoteRecord[] | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ key: string; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  function needBase(): string {
    if (!base.startsWith("https://")) throw new Error("primero configura la URL del Worker arriba");
    if (!instId.trim()) throw new Error("indica el ID de instalación");
    return base;
  }

  async function push(changes: SyncChange[]): Promise<void> {
    const out = await api(needBase(), "/v1/sync/push", instId.trim(), {
      method: "POST",
      body: JSON.stringify({ schemaVersion: 1, changes }),
    });
    if (out["error"]) throw new Error("rechazado");
    const conflicts = out["conflicts"] as unknown[];
    if (Array.isArray(conflicts) && conflicts.length) {
      throw new Error("conflicto: otro avanzó primero, recarga y reintentá");
    }
  }

  async function load(): Promise<void> {
    setBusy(true);
    try {
      const out = await api(needBase(), "/v1/data", instId.trim());
      const data = out["data"];
      if (!Array.isArray(data)) throw new Error("respuesta inválida");
      setRecords(data as RemoteRecord[]);
      if (data.length === 0) toast({ description: "La nube está vacía." });
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "no se pudo cargar" });
    } finally {
      setBusy(false);
    }
  }

  async function enroll(): Promise<void> {
    if (!secret) {
      toast({ variant: "destructive", description: "pega el secreto del propietario para enrolar" });
      return;
    }
    setBusy(true);
    try {
      if (!base.startsWith("https://")) throw new Error("primero configura la URL del Worker arriba");
      if (!instId.trim()) throw new Error("indica el ID de instalación");
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 15000);
      let res: Response;
      try {
        res = await fetch(`${base}/v1/enroll`, {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installationId: instId.trim(), ownerSecret: secret }),
        });
      } finally {
        window.clearTimeout(timer);
      }
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok || !data || data["ok"] !== true) {
        const err = data?.["error"] as { message?: unknown } | undefined;
        throw new Error(typeof err?.message === "string" ? err.message : `error ${res.status}`);
      }
      try {
        localStorage.setItem(INST_KEY, instId.trim());
      } catch {
        // sin almacenamiento
      }
      setSecret("");
      toast({ description: "Instalación enrolada." });
      await load();
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error && e.name === "AbortError" ? "sin respuesta (15s)" : e instanceof Error ? e.message : "no se pudo enrolar" });
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(rec: RemoteRecord): Promise<void> {
    if (!editing) return;
    let payload: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(editing.text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("debe ser un objeto JSON");
      payload = parsed as Record<string, unknown>;
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "JSON inválido" });
      return;
    }
    setBusy(true);
    try {
      await push([buildUpsert(rec.entity_type, rec.entity_id, rec.revision, payload)]);
      setEditing(null);
      setOpenId(null);
      toast({ description: "Guardado." });
      await load();
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "no se pudo guardar" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(rec: RemoteRecord): Promise<void> {
    if (!confirm(`¿Eliminar ${rec.entity_type}:${rec.entity_id.slice(0, 8)} de la nube?`)) return;
    setBusy(true);
    try {
      await push([buildTombstone(rec.entity_type, rec.entity_id, rec.revision)]);
      toast({ description: "Eliminado." });
      await load();
    } catch (e) {
      toast({ variant: "destructive", description: e instanceof Error ? e.message : "no se pudo eliminar" });
    } finally {
      setBusy(false);
    }
  }

  const groups = React.useMemo(() => {
    const g = new Map<string, RemoteRecord[]>();
    for (const r of records ?? []) {
      if (!g.has(r.entity_type)) g.set(r.entity_type, []);
      g.get(r.entity_type)!.push(r);
    }
    return [...g.entries()];
  }, [records]);

  return (
    <Card title="Datos en la nube" icon={<Database size={18} />} sub="Ver, editar y eliminar registros del Worker. Todo cambio queda versionado."
      action={records ? <Badge>{records.filter((r) => !r.deleted).length} vivos</Badge> : undefined}>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ID instalación" htmlFor="ex-inst">
            <Input id="ex-inst" value={instId} onChange={(e) => setInstId(e.target.value)} aria-label="ID instalación" />
          </Field>
          <Field label="Secreto propietario (solo para enrolar, no se guarda)" htmlFor="ex-sec">
            <div className="relative">
              <Input id="ex-sec" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} className="pr-11" />
              <button type="button" aria-label="Enrolar instalación" title="Enrolar" onClick={() => void enroll()} disabled={busy}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#007aff] transition hover:bg-[#f5f5f7] active:scale-95 disabled:opacity-50">
                <KeyRound size={16} />
              </button>
            </div>
          </Field>
        </div>
        <div>
          <Button variant="secondary" onClick={() => void load()} disabled={busy}>
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "" : "Cargar datos"}
          </Button>
        </div>
        {records === null ? (
          <p className="text-[13px] text-[#6e6e73]">Sin cargar. Enrolá la instalación y cargá los datos.</p>
        ) : records.length === 0 ? (
          <p className="text-[13px] text-[#6e6e73]">La nube está vacía.</p>
        ) : (
          groups.map(([type, rows]) => (
            <div key={type}>
              <p className="mb-1 text-[13px] font-medium">{type} ({rows.filter((r) => !r.deleted).length})</p>
              <div className="overflow-hidden rounded-xl border border-[#e8e8ed]">
                {rows.map((r) => {
                  const key = `${r.entity_type}:${r.entity_id}`;
                  const isOpen = openId === key;
                  const isEditing = editing?.key === key;
                  return (
                    <div key={key} className="border-t border-[#f0f0f3] first:border-t-0">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button className="min-w-0 flex-1 truncate text-left font-mono text-xs" onClick={() => { setOpenId(isOpen ? null : key); setEditing(null); }}>
                          {r.entity_id.slice(0, 8)}… <span className="text-[#6e6e73]">rev {r.revision}</span>
                        </button>
                        {r.deleted ? <Badge tone="bad">eliminado</Badge> : null}
                        {!r.deleted && (
                          <>
                            <button aria-label="Ver" className="text-[13px] text-[#007aff]" onClick={() => { setOpenId(isOpen ? null : key); setEditing(null); }}>
                              {isOpen ? "cerrar" : "ver"}
                            </button>
                            <button aria-label="Editar" onClick={() => { setOpenId(key); setEditing({ key, text: JSON.stringify(r.dto ?? {}, null, 2) }); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[#6e6e73] hover:bg-[#f5f5f7]">
                              <Pencil size={14} />
                            </button>
                            <button aria-label="Eliminar" onClick={() => void remove(r)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[#cf222e] hover:bg-[#f5f5f7]">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                      {isOpen && !isEditing && (
                        <p className="ez-pre mono mx-3 mb-2">{JSON.stringify(r.dto ?? {}, null, 2)}</p>
                      )}
                      {isEditing && (
                        <div className="grid gap-2 px-3 pb-3">
                          <Textarea value={editing.text} onChange={(e) => setEditing({ key, text: e.target.value })} className="mono" rows={8} aria-label="JSON del registro" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => void saveEdit(r)} disabled={busy}>Guardar en la nube</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
