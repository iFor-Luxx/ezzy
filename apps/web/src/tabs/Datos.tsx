import React from "react";
import { ArrowUpDown, Database } from "lucide-react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge, Button, Card } from "../components/ui";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../components/ui/accordion";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { Empty } from "../components/ui";
import { refreshRawRecords, refreshStatus } from "../lib/sync";
import { aiKeyStatus, aiGetKey, aiSaveKey, aiForgetKey } from "../lib/aiServer";
import { maskKey } from "@ezzy/ai-opencode";
import { Input } from "../components/ui/input";
import { toast } from "../components/ui/toast";
import type { RemoteRecord, CloudStatusView } from "../lib/cloud";

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "—";
  }
}

// Vista árbol con shadcn Accordion: tipo → registro → campos (shadcn Table).
function TreeView(props: { records: RemoteRecord[] }) {
  const groups = React.useMemo(() => {
    const g = new Map<string, RemoteRecord[]>();
    for (const r of props.records) {
      if (!g.has(r.entity_type)) g.set(r.entity_type, []);
      g.get(r.entity_type)!.push(r);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [props.records]);
  return (
    <Accordion className="rounded-xl border border-border px-3">
      {groups.map(([type, rows]) => {
        const vivos = rows.filter((r) => !r.deleted).length;
        return (
          <AccordionItem key={type} value={type}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <span className="font-medium">{type}</span>
                <span className="text-xs font-normal text-muted-foreground">{vivos}/{rows.length}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Accordion>
                {rows.map((r) => {
                  const fields = r.dto ? Object.entries(r.dto) : [];
                  return (
                    <AccordionItem key={`${r.entity_type}:${r.entity_id}`} value={`${r.entity_type}:${r.entity_id}`} className={r.deleted ? "opacity-60" : undefined}>
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">{r.entity_id}</span>
                          <span className="text-xs font-normal text-muted-foreground">rev {r.revision}</span>
                          {r.deleted ? <Badge tone="bad">eliminado</Badge> : null}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {fields.length === 0 ? (
                          <p className="text-[13px] text-muted-foreground">sin campos</p>
                        ) : (
                          <Table>
                            <TableBody>
                              {fields.map(([k, v]) => (
                                <TableRow key={k}>
                                  <TableCell className="font-mono text-xs font-medium">{k}</TableCell>
                                  <TableCell className="whitespace-normal break-all font-mono text-xs text-muted-foreground">{fmtVal(v)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

// Data Table shadcn (TanStack): cabeceras ordenables + paginación.
function sortHeader(label: string) {
  return ({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) => (
    <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {label}
      <ArrowUpDown size={13} />
    </Button>
  );
}

function DataTable<TData, TValue>(props: { title: string; columns: ColumnDef<TData, TValue>[]; data: TData[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: 10 } },
  });
  return (
    <div className="grid gap-1">
      <p className="mono px-2 text-xs font-medium text-foreground">{props.title} <span className="text-muted-foreground">{props.data.length}</span></p>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={props.columns.length}>Sin resultados.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2 px-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
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
  const rev = (v: unknown): number => (typeof v === "number" ? v : 0);
  const mono = "mono";
  const productCols: ColumnDef<Record<string, unknown>, unknown>[] = [
    { accessorKey: "name", header: sortHeader("Nombre"), cell: ({ row }) => <span className="font-medium">{str(row.getValue("name"))}</span> },
    { accessorKey: "brand", header: sortHeader("Marca"), cell: ({ row }) => str(row.getValue("brand")) },
    { accessorKey: "fabric", header: sortHeader("Tela"), cell: ({ row }) => <span className="block max-w-40 truncate">{str(row.getValue("fabric")) || str((row.original as Record<string, unknown>)["description"])}</span> },
    { accessorKey: "status", header: sortHeader("Estado"), cell: ({ row }) => str(row.getValue("status")) },
    { accessorKey: "_rev", header: sortHeader("Rev"), cell: ({ row }) => <span className={mono}>{String(rev(row.getValue("_rev")))}</span> },
  ];
  const variantCols: ColumnDef<Record<string, unknown>, unknown>[] = [
    { accessorKey: "label", header: sortHeader("Etiqueta"), cell: ({ row }) => <span className="font-medium">{str(row.getValue("label"))}</span> },
    { accessorKey: "product_id", header: sortHeader("Producto"), cell: ({ row }) => <span className={mono} title={str(row.getValue("product_id"))}>{shortId(str(row.getValue("product_id")))}</span> },
    { accessorKey: "active", header: sortHeader("Activa"), cell: ({ row }) => (row.getValue("active") === false ? "no" : "sí") },
    { accessorKey: "_rev", header: sortHeader("Rev"), cell: ({ row }) => <span className={mono}>{String(rev(row.getValue("_rev")))}</span> },
  ];
  const priceCols: ColumnDef<Record<string, unknown>, unknown>[] = [
    { accessorKey: "amount_minor", header: sortHeader("Monto"), cell: ({ row }) => <span className="font-medium tabular-nums">{typeof row.getValue("amount_minor") === "number" ? ((row.getValue("amount_minor") as number) / 100).toFixed(2) : "—"}</span> },
    { accessorKey: "currency", header: sortHeader("Moneda"), cell: ({ row }) => str(row.getValue("currency")) },
    { accessorKey: "product_id", header: sortHeader("Producto"), cell: ({ row }) => <span className={mono} title={str(row.getValue("product_id"))}>{shortId(str(row.getValue("product_id")))}</span> },
    { accessorKey: "_rev", header: sortHeader("Rev"), cell: ({ row }) => <span className={mono}>{String(rev(row.getValue("_rev")))}</span> },
  ];
  const messageCols: ColumnDef<Record<string, unknown>, unknown>[] = [
    { accessorKey: "title", header: sortHeader("Título"), cell: ({ row }) => <span className="font-medium">{str(row.getValue("title"))}</span> },
    { accessorKey: "intent", header: sortHeader("Intención"), cell: ({ row }) => str(row.getValue("intent")) },
    { accessorKey: "channel", header: sortHeader("Canal"), cell: ({ row }) => str(row.getValue("channel")) },
    { accessorKey: "status", header: sortHeader("Estado"), cell: ({ row }) => str(row.getValue("status")) },
    { accessorKey: "_rev", header: sortHeader("Rev"), cell: ({ row }) => <span className={mono}>{String(rev(row.getValue("_rev")))}</span> },
  ];
  const otherCols: ColumnDef<RemoteRecord, unknown>[] = [
    { accessorKey: "entity_type", header: sortHeader("Tipo"), cell: ({ row }) => <span className="font-medium">{row.getValue("entity_type")}</span> },
    { accessorKey: "entity_id", header: sortHeader("ID"), cell: ({ row }) => <span className={mono}>{row.getValue("entity_id")}</span> },
    { accessorKey: "revision", header: sortHeader("Rev"), cell: ({ row }) => <span className={mono}>{String(row.getValue("revision"))}</span> },
    { accessorKey: "deleted", header: sortHeader("Estado"), cell: ({ row }) => (row.getValue("deleted") ? <Badge tone="bad">eliminado</Badge> : "vivo") },
  ];
  return (
    <div className="grid gap-3">
      {products.length > 0 ? <DataTable title="product" columns={productCols} data={products} /> : null}
      {variants.length > 0 ? <DataTable title="variant" columns={variantCols} data={variants} /> : null}
      {prices.length > 0 ? <DataTable title="price" columns={priceCols} data={prices} /> : null}
      {messages.length > 0 ? <DataTable title="approved_message" columns={messageCols} data={messages} /> : null}
      {rest.length > 0 ? <DataTable title="otros" columns={otherCols} data={rest} /> : null}
    </div>
  );
}

// Todos los datos reales de tu nube, estilo Realtime Database: árbol por
// tipo → registro → campos. Solo lectura. 1 consulta al entrar a la sección.
export default function Datos(props: { active: boolean }) {
  const [records, setRecords] = React.useState<RemoteRecord[] | null>(null);
  const [ia, setIa] = React.useState<{ configured: boolean; updatedAt: string | null } | null>(null);
  const [keyMasked, setKeyMasked] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editVal, setEditVal] = React.useState("");
  const [iaBusy, setIaBusy] = React.useState(false);
  const [st, setSt] = React.useState<CloudStatusView | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const hasData = React.useRef(false);

  // Una sola carga en vuelo: al volver a la pestaña se reengancha
  // a la misma promesa en vez de bloquearse (el busyRef anterior
  // dejaba skeletons eternos si cambiabas de pestaña a mitad de carga).
  const loadRef = React.useRef<Promise<{
    rec: { ok: true; r: RemoteRecord[] } | { ok: false; e: unknown };
    ia: { configured: boolean; updatedAt: string | null } | null;
    key: string | null;
    st: CloudStatusView | null;
  }> | null>(null);

  React.useEffect(() => {
    if (!props.active) return;
    let alive = true;
    if (!loadRef.current) {
      loadRef.current = (async () => {
        const rec = await refreshRawRecords()
          .then((r) => ({ ok: true as const, r }))
          .catch((e) => ({ ok: false as const, e }));
        const ia = await aiKeyStatus().catch(() => null);
        const key = ia?.configured ? await aiGetKey().catch(() => null) : null;
        const st = await refreshStatus().catch(() => null);
        return { rec, ia, key, st };
      })().finally(() => {
        loadRef.current = null;
      });
    }
    loadRef.current
      .then(({ rec, ia, key, st }) => {
        if (!alive) return;
        if (rec.ok) {
          hasData.current = true;
          setRecords(rec.r);
          setErr(null);
        } else if (!hasData.current) {
          setErr(rec.e instanceof Error ? rec.e.message : "no se pudo cargar");
        }
        if (ia) {
          setIa(ia);
          setKeyMasked(key ? maskKey(key) : null);
        }
        if (st) setSt(st);
      })
      .catch(() => {
        // las ramas ya capturan sus errores; esto es red de seguridad
      });
    return () => {
      alive = false;
    };
  }, [props.active]);

  const [view, setView] = React.useState<"tablas" | "arbol">("tablas");

  async function saveIaEdit(): Promise<void> {
    const v = editVal.trim();
    if (!v.startsWith("oc_sk_") || v.length < 20) {
      toast.add({ title: "Error", description: "pega tu key primero" });
      return;
    }
    setIaBusy(true);
    try {
      await aiSaveKey(v);
      const s = await aiKeyStatus();
      setIa(s);
      const k = await aiGetKey().catch(() => null);
      setKeyMasked(k ? maskKey(k) : null);
      setEditing(false);
      setEditVal("");
      toast.add({ description: "Guardado." });
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "no se pudo guardar" });
    } finally {
      setIaBusy(false);
    }
  }

  async function removeIa(): Promise<void> {
    setIaBusy(true);
    try {
      await aiForgetKey();
      setIa({ configured: false, updatedAt: null });
      setKeyMasked(null);
      setEditing(false);
      setEditVal("");
      toast.add({ description: "Eliminado." });
    } catch (e) {
      toast.add({ title: "Error", description: e instanceof Error ? e.message : "no se pudo eliminar" });
    } finally {
      setIaBusy(false);
    }
  }

  const nubeRows = st
    ? [
        { dato: "registros (productos, precios, mensajes)", filas: String(st.storage.records) },
        { dato: "api_key (1 sola fila, se sobreescribe)", filas: ia?.configured ? "1" : "0" },
        { dato: "instalaciones", filas: String(st.storage.installations) },
        { dato: "operaciones hoy (req / lecturas / escrituras)", filas: `${st.used.req} / ${st.used.reads} / ${st.used.writes}` },
      ]
    : [];
  const nubeCols: ColumnDef<{ dato: string; filas: string }, unknown>[] = [
    { accessorKey: "dato", header: sortHeader("Dato"), cell: ({ row }) => <span className="font-medium">{row.getValue("dato")}</span> },
    { accessorKey: "filas", header: sortHeader("Filas reales"), cell: ({ row }) => <span className="mono">{row.getValue("filas")}</span> },
  ];
  const iaRows = ia
    ? [
        { nodo: "api_key", valor: keyMasked ?? (ia.configured ? "guardada" : "vacía") },
        ...(ia.updatedAt ? [{ nodo: "actualizada", valor: ia.updatedAt }] : []),
      ]
    : [];
  const iaCols: ColumnDef<{ nodo: string; valor: string }, unknown>[] = [
    { accessorKey: "nodo", header: sortHeader("Nodo"), cell: ({ row }) => <span className="font-medium">{row.getValue("nodo")}</span> },
    {
      accessorKey: "valor",
      header: sortHeader("Valor"),
      cell: ({ row }) =>
        editing && row.getValue("nodo") === "api_key" ? (
          <Input type="password" autoComplete="off" placeholder="oc_sk_…" value={editVal} onChange={(e) => setEditVal(e.target.value)} disabled={iaBusy} />
        ) : (
          <span className="mono">{row.getValue("valor")}</span>
        ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) =>
        row.getValue("nodo") !== "api_key" ? null : editing ? (
          <span className="inline-flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setEditVal(""); }} disabled={iaBusy}>Cancelar</Button>
            <Button size="sm" onClick={() => void saveIaEdit()} disabled={iaBusy}>Guardar</Button>
          </span>
        ) : (
          <span className="inline-flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setEditVal(""); setEditing(true); }} disabled={iaBusy}>Editar</Button>
            {ia?.configured ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void removeIa()} disabled={iaBusy}>Eliminar</Button> : null}
          </span>
        ),
    },
  ];

  return (
    <Card label="Base" title="Base" icon={<Database size={18} />} sub="Todo lo guardado en tu nube: registros y estado.">
      <div className="grid gap-3">
        {st ? <DataTable title="nube" columns={nubeCols} data={nubeRows} /> : null}
        {ia ? <DataTable title="ia" columns={iaCols} data={iaRows} /> : null}
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
        {records && records.length === 0 && !ia?.configured ? <Empty>La nube está vacía.</Empty> : null}
        {records && records.length === 0 && ia?.configured ? <Empty>Sin registros (productos, precios, mensajes).</Empty> : null}
        {records && records.length > 0 && view === "tablas" ? <TablesView records={records} /> : null}
        {records && records.length > 0 && view === "arbol" ? (
          <TreeView records={records} />
        ) : null}
      </div>
    </Card>
  );
}
