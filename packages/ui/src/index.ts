// @ezzy/ui — Fase 1: helpers mínimos. shadcn/ui + Tailwind se cablean en 1.1 con Vite.
export function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
