import React from "react";
import { MessageSquarePlus, Search, Star } from "lucide-react";
import { Button, Card, Field, Input, Textarea, Badge, Empty } from "../components/ui";
import { newId, nowIso, audit, type WebState } from "../lib/store";
import { toast } from "../components/ui/toast";

export default function Mensajes(props: { s: WebState; set: React.Dispatch<React.SetStateAction<WebState>> }) {
  const { s, set } = props;
  const [q, setQ] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("Hola {{nombre}}, ");

  const rows = s.messages.filter((m) => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return `${m.title} ${m.body} ${m.intent}`.toLowerCase().includes(n);
  });

  function add(e: React.FormEvent): void {
    e.preventDefault();
    try {
      if (!title.trim() || !body.trim()) throw new Error("título y cuerpo requeridos");
      const now = nowIso();
      set((p) => audit({
        ...p,
        messages: [...p.messages, { id: newId(), title: title.trim(), body, intent: "general", channel: "whatsapp", tags: [], status: "approved", verified_at: now, revision: 1 }],
      }, "mensaje.crear", title.trim()));
      setTitle("");
      setBody("Hola {{nombre}}, ");
      toast.add({ description: `"${title.trim()}" aprobado.` });
    } catch (ex) {
      toast.add({ title: "Error", description: ex instanceof Error ? ex.message : "error" });
    }
  }

  function setFav(id: string, slot: string): void {
    set((p) => ({
      ...p,
      messages: p.messages.map((m) => (m.id === id ? { ...m, command_alias: `favorito-${slot}` } : m.command_alias === `favorito-${slot}` ? { ...m, command_alias: undefined } : m)),
    }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card title="Nuevo mensaje aprobado" icon={<MessageSquarePlus size={18} />} sub="Usa {{variables}}. Se revisa antes de copiar; nunca se envía solo.">
          <form onSubmit={add} className="grid gap-3">
            <Field label="Título" htmlFor="m-title"><Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Cuerpo" htmlFor="m-body"><Textarea id="m-body" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            <div><Button type="submit">Aprobar mensaje</Button></div>
          </form>
        </Card>
      </div>
      <div className="lg:col-span-3">
        <Card title={`Mensajes (${rows.length})`} sub="Atajos de la extensión: favorito 1-3. El resto va por selector.">
          <Field label="Buscar" htmlFor="m-q">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <Input id="m-q" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
            </div>
          </Field>
          {rows.length === 0 ? <Empty>Sin mensajes.</Empty> : (
            <div className="mt-2 grid gap-3">
              {rows.map((m) => (
                <div key={m.id} className="rounded-2xl border border-[#e8e8ed] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="tracking-tight">{m.title}</strong>
                    <Badge tone={m.status === "approved" ? "ok" : "warn"}>{m.status}</Badge>
                    {m.command_alias ? <Badge tone="info"><Star size={11} />{m.command_alias}</Badge> : null}
                  </div>
                  <p className="ez-pre mt-2">{m.body}</p>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3].map((n) => (
                      <Button key={n} size="sm" variant="secondary" onClick={() => setFav(m.id, String(n))}>Fav {n}</Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
