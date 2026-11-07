// Activación con variables: preview → completar → confirmar → copiar/insertar. Sin envío.
export function listVars(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) out.add(m[1]);
  return [...out];
}

export function renderWithVars(body: string, vars: Record<string, string>): { text: string; missing: string[] } {
  const missing = listVars(body).filter((k) => vars[k] === undefined || vars[k] === "");
  const text = body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k: string) =>
    vars[k] !== undefined && vars[k] !== "" ? vars[k] : m
  );
  return { text, missing };
}
