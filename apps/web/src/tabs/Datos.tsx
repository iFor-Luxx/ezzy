import React from "react";
import { ChevronRight } from "lucide-react";
import { Badge, Button } from "../components/ui";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { Empty } from "../components/ui";
import { refreshRawRecords } from "../lib/sync";
import type { RemoteRecord } from "../lib/cloud";

function JValue(props: { v: unknown }) {
  const { v } = props;
  if (v === null) return <span className="text-muted-foreground">null</span>;
  if (typeof v === "string") return <span className="text-muted-foreground">“{v}”</span>;
  if (typeof v === "number" || typeof v === "boolean") return <span className="text-muted-foreground">{String(v)}</span>;
  return null;
}

function JNode(props: { name: string; value: unknown; depth: number }) {
  const { name, value, depth } = props;
  const [open, setOpen] = React.useState(depth < 1);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <div className="mono truncate px-2 py-1 text-xs">
          <span className="text-foreground">{name}</span>
          <span className="text-muted-foreground">: {Array.isArray(value) ? "[]" : "{}"}</span>
        </div>
      );
    }
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mono flex w-full items-center gap-1 truncate rounded px-2 py-1 text-left text-xs transition hover:bg-black/[0.04]"
        >
          <ChevronRight size={13} className={`shrink-0 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
          <span className="truncate text-foreground">{name}</span>
          <span className="shrink-0 text-muted-foreground">{entries.length}</span>
        </button>
        {open ? (
          <div className="ml-3 border-l border-border pl-1">
            {entries.map(([k, v]) => (
              <JNode key={k} name={k} value={v} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mono truncate px-2 py-1 pl-7 text-xs">
      <span className="text-foreground">{name}</span>
      <span className="text-muted-foreground">: </span>
      <JValue v={value} />
    </div>
  );
}

function TypeGroup(props: { type: string; rows: RemoteRecord[] }) {
  const { type, rows } = props;
  const [open, setOpen] = React.useState(true);
  const vivos = rows.filter((r) => !r.deleted).length;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mono flex w-full items-center gap-1.5 truncate rounded px-2 py-1.5 text-left text-xs transition hover:bg-black/[0.04]"
      >
        <ChevronRight size={13} className={`shrink-0 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
        <span className="truncate font-medium text-foreground">{type}</span>
        <span className="shrink-0 text-muted-foreground">{vivos}/{rows.length}</span>
      </button>
      {open ? (
        <div className="ml-3 border-l border-border pl-1">
          {rows.map((r) => (
            <RecordNode key={`${r.entity_type}:${r.entity_id}`} rec={r} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function TableWrap(props: { title: string; count: number; head: string[]; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <p className="mono px-2 text-xs font-medium text-foreground">{props.title} <span className="text-muted-foreground">{props.count}</span></p>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {props.head.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{props.children}</TableBody>
        </Table>
      </div>
    </div>
  );
}

function TablesView(props: { records: RemoteRecord[] }) {
  const vivos = props.records.filter((r) => !r.deleted && r.dto);
  const byType = (t: string): Record<string, unknown>[] =>
    vivos.filter((r) => r.entity_type === t).map((r) => ({ _rev: r.revision, ...(r.dto as Record<string, unknown>) }));
  const products = byType("product");
  const variants = byType("variant");
  const prices = byType("price");
  const messages = byType("approved_message");
  const rest = vivos.filter((r) => !["product", "variant", "price", "approved_message"].includes(r.entity_type));
  const str = (v: unknown): string => (typeof v === "string" ? v : "—");
  return (
    <div className="grid gap-3">
      {products.length > 0 ? (
        <TableWrap title="product" count={products.length} head={["Nombre", "Marca", "Tela", "Estado", "Rev"]}>
          {products.map((p) => (
            <TableRow key={String(p["id"])}>
              <TableCell className="font-medium">{str(p["name"])}</TableCell>
              <TableCell>{str(p["brand"])}</TableCell>
              <TableCell className="max-w-40 truncate">{str(p["fabric"]) || str(p["description"])}</TableCell>
              <TableCell>{str(p["status"])}</TableCell>
              <TableCell className="mono">{String(p["_rev"])}</TableCell>
            </TableRow>
          ))}
        </TableWrap>
      ) : null}
      {variants.length > 0 ? (
        <TableWrap title="variant" count={variants.length} head={["Etiqueta", "Producto", "Activa", "Rev"]}>
          {variants.map((v) => (
            <TableRow key={String(v["id"])}>
              <TableCell className="font-medium">{str(v["label"])}</TableCell>
              <TableCell className="mono" title={str(v["product_id"])}>{shortId(str(v["product_id"]))}</TableCell>
              <TableCell>{v["active"] === false ? "no" : "sí"}</TableCell>
              <TableCell className="mono">{String(v["_rev"])}</TableCell>
            </TableRow>
          ))}
        </TableWrap>
      ) : null}
      {prices.length > 0 ? (
        <TableWrap title="price" count={prices.length} head={["Monto", "Moneda", "Producto", "Rev"]}>
          {prices.map((p) => (
            <TableRow key={String(p["id"])}>
              <TableCell className="font-medium tabular-nums">{typeof p["amount_minor"] === "number" ? (p["amount_minor"] as number / 100).toFixed(2) : "—"}</TableCell>
              <TableCell>{str(p["currency"])}</TableCell>
              <TableCell className="mono" title={str(p["product_id"])}>{shortId(str(p["product_id"]))}</TableCell>
              <TableCell className="mono">{String(p["_rev"])}</TableCell>
            </TableRow>
          ))}
        </TableWrap>
      ) : null}
      {messages.length > 0 ? (
        <TableWrap title="approved_message" count={messages.length} head={["Título", "Intención", "Canal", "Estado", "Rev"]}>
          {messages.map((m) => (
            <TableRow key={String(m["id"])}>
              <TableCell className="font-medium">{str(m["title"])}</TableCell>
              <TableCell>{str(m["intent"])}</TableCell>
              <TableCell>{str(m["channel"])}</TableCell>
              <TableCell>{str(m["status"])}</TableCell>
              <TableCell className="mono">{String(m["_rev"])}</TableCell>
            </TableRow>
          ))}
        </TableWrap>
      ) : null}
      {rest.length > 0 ? (
        <div className="grid gap-1">
          <p className="mono px-2 text-xs font-medium text-foreground">otros <span className="text-muted-foreground">{rest.length}</span></p>
          {rest.map((r) => (
            <RecordNode key={`${r.entity_type}:${r.entity_id}`} rec={r} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
function RecordNode(props: { rec: RemoteRecord }) {
  const { rec } = props;
  const [open, setOpen] = React.useState(false);
  const fields = rec.dto ? Object.entries(rec.dto) : [];
  return (
    <div className={rec.deleted ? "opacity-60" : undefined}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mono flex w-full items-center gap-1.5 truncate rounded px-2 py-1.5 text-left text-xs transition hover:bg-black/[0.04]"
      >
        <ChevronRight size={13} className={`shrink-0 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
        <span className="truncate text-foreground">{rec.entity_id}</span>
        <span className="shrink-0 text-muted-foreground">rev {rec.revision}</span>
        {rec.deleted ? <Badge tone="bad">eliminado</Badge> : null}
      </button>
      {open ? (
        <div className="ml-3 border-l border-border pl-1 pb-1">
          {fields.length === 0 ? (
            <p className="mono px-2 py-1 text-xs text-muted-foreground">sin campos</p>
          ) : (
            fields.map(([k, v]) => <JNode key={k} name={k} value={v} depth={1} />)
          )}
        </div>
      ) : null}
    </div>
  );
}

// Todos los datos reales de tu nube, estilo Realtime Database: árbol por
// tipo → registro → campos. Solo lectura. 1 consulta al entrar a la sección.
export default function Datos(props: { active: boolean }) {
  const [records, setRecords] = React.useState<RemoteRecord[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const busyRef = React.useRef(false);
  const hasData = React.useRef(false);

  React.useEffect(() => {
    if (!props.active || busyRef.current) return;
    busyRef.current = true;
    let alive = true;
    refreshRawRecords()
      .then((r) => {
        if (!alive) return;
        hasData.current = true;
        setRecords(r);
        setErr(null);
      })
      .catch((e) => {
        if (!alive || hasData.current) return;
        setErr(e instanceof Error ? e.message : "no se pudo cargar");
      })
      .finally(() => {
        busyRef.current = false;
      });
    return () => {
      alive = false;
    };
  }, [props.active]);

  const [view, setView] = React.useState<"tablas" | "arbol">("tablas");

  const groups = React.useMemo(() => {
    const g = new Map<string, RemoteRecord[]>();
    for (const r of records ?? []) {
      if (!g.has(r.entity_type)) g.set(r.entity_type, []);
      g.get(r.entity_type)!.push(r);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [records]);

  return (
    <>
      <h1 className="px-3 text-lg font-bold tracking-tight sm:text-[19px]">Datos</h1>
      <div aria-hidden="true" className="-mx-4 mb-3 mt-3 h-px bg-border" />
      <div className="grid gap-3 px-3">
        {records && records.length > 0 ? (
          <div className="flex gap-2">
            <Button size="sm" variant={view === "tablas" ? "default" : "ghost"} onClick={() => setView("tablas")}>Tablas</Button>
            <Button size="sm" variant={view === "arbol" ? "default" : "ghost"} onClick={() => setView("arbol")}>Árbol</Button>
          </div>
        ) : null}
        {err ? <p className="text-[13px] text-destructive">{err}</p> : null}
        {!records && !err ? (
          <div className="grid gap-1" aria-busy="true" aria-label="Cargando datos">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
          </div>
        ) : null}
        {records && records.length === 0 ? <Empty>La nube está vacía.</Empty> : null}
        {records && records.length > 0 && view === "tablas" ? <TablesView records={records} /> : null}
        {records && records.length > 0 && view === "arbol" ? (
          <div className="grid gap-1">
            {groups.map(([type, rows]) => (
              <TypeGroup key={type} type={type} rows={rows} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
