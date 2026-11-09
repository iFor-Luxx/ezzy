// Cliente del proxy IA (write-only): la key vive en el Worker/D1, nunca en el navegador.
// Funciona en localhost y en cualquier PC: el frontend solo habla con tu Worker (https).
// La key solo viaja una vez (al guardarla, por POST). Listar/probar van sin key.
import { cloudBase, cloudInstallation } from "./sync";

function mask(s: string): string {
  return s.replace(/oc_sk_\S+/g, "oc_sk_…");
}

async function aiFetch(path: string, init?: RequestInit, timeoutMs = 15000): Promise<Record<string, unknown>> {
  const base = cloudBase();
  const inst = cloudInstallation();
  if (!base.startsWith("https://")) throw new Error("servidor no configurado");
  if (!inst) throw new Error("instalación no configurada");
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-ezzy-installation": inst, ...(init?.headers ?? {}) },
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data) {
      const err = data?.["error"] as { message?: unknown } | undefined;
      const msg = typeof err?.message === "string" ? err.message : `error ${res.status}`;
      throw new Error(mask(msg));
    }
    if (data["error"]) {
      const err = data["error"] as { message?: unknown };
      throw new Error(mask(typeof err.message === "string" ? err.message : "rechazado"));
    }
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("sin respuesta (timeout)");
    throw e instanceof Error ? new Error(mask(e.message)) : e;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function aiKeyStatus(): Promise<{ configured: boolean; updatedAt: string | null }> {
  const out = await aiFetch("/v1/ai/status", {}, 15000);
  return {
    configured: out["configured"] === true,
    updatedAt: typeof out["updatedAt"] === "string" ? (out["updatedAt"] as string) : null,
  };
}

export async function aiSaveKey(apiKey: string): Promise<void> {
  if (!apiKey.startsWith("oc_sk_") || apiKey.length < 20) throw new Error("pega tu key primero (oc_sk_…)");
  await aiFetch("/v1/ai/key", { method: "POST", body: JSON.stringify({ apiKey }) }, 15000);
}

export async function aiForgetKey(): Promise<void> {
  await aiFetch("/v1/ai/forget", { method: "POST", body: "{}" }, 15000);
}

// Lee la key guardada (panel privado tras PIN): para rellenar el campo
// tras recargar. Solo la ve quien ya está enrolado.
export async function aiGetKey(): Promise<string | null> {
  try {
    const out = await aiFetch("/v1/ai/key", {}, 15000);
    return typeof out["apiKey"] === "string" ? (out["apiKey"] as string) : null;
  } catch (e) {
    if (e instanceof Error && e.message.includes("no configurada")) return null;
    throw e;
  }
}

export async function aiListModels(): Promise<string[]> {
  const out = await aiFetch("/v1/ai/models", {}, 30000);
  const arr = out["models"];
  if (!Array.isArray(arr)) throw new Error("respuesta inválida");
  const ids: string[] = [];
  for (const m of arr) {
    if (typeof m === "string" && m) ids.push(m);
    else if (typeof m === "object" && m !== null && typeof (m as Record<string, unknown>)["id"] === "string") {
      ids.push((m as Record<string, unknown>)["id"] as string);
    }
  }
  if (ids.length === 0) throw new Error("sin modelos disponibles");
  return ids;
}

// Lee el SSE del proxy (passthrough de OpenCode) y entrega tokens en vivo.
async function readProxyStream(res: Response, onToken: (t: string) => void): Promise<string> {
  if (!res.body) throw new Error("sin cuerpo de stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const line of parts) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          acc += delta;
          onToken(delta);
        }
      } catch {
        // fragmento parcial: sigue acumulando
      }
    }
  }
  try {
    await reader.cancel();
  } catch {
    // limpieza best-effort
  }
  if (!acc.trim()) throw new Error("respuesta vacía");
  return acc;
}

export async function aiChat(args: {
  modelId: string;
  text: string;
  sessionId?: string;
  stream?: boolean;
  onToken?: (t: string) => void;
  timeoutMs?: number;
}): Promise<string> {
  if (!args.modelId.trim()) throw new Error("elige un modelo primero");
  if (!args.text.trim()) throw new Error("texto requerido");
  const base = cloudBase();
  const inst = cloudInstallation();
  if (!base.startsWith("https://")) throw new Error("servidor no configurado");
  if (!inst) throw new Error("instalación no configurada");
  const timeoutMs = args.timeoutMs ?? 120000;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/ai/chat`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-ezzy-installation": inst },
      body: JSON.stringify({ modelId: args.modelId, text: args.text, sessionId: args.sessionId, stream: args.stream !== false }),
    });
    const ctype = res.headers.get("content-type") ?? "";
    // Stream SSE: viene como text/event-stream (sin envelope JSON).
    if (res.ok && ctype.includes("text/event-stream")) {
      if (!args.onToken) {
        // Sin onToken: acumula igual para devolver el texto completo.
        return await readProxyStream(res, () => {});
      }
      return await readProxyStream(res, args.onToken);
    }
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data) {
      const err = data?.["error"] as { message?: unknown } | undefined;
      throw new Error(mask(typeof err?.message === "string" ? err.message : `error ${res.status}`));
    }
    if (data["error"]) {
      const err = data["error"] as { message?: unknown };
      throw new Error(mask(typeof err.message === "string" ? err.message : "rechazado"));
    }
    // No-stream: el Worker devuelve { text }.
    if (typeof data["text"] === "string" && (data["text"] as string).trim()) return (data["text"] as string).trim();
    // Por si el proxy devolviera SSE como JSON (fallback): intenta choices.
    const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
    const fallback = choices?.[0]?.message?.content?.trim() ?? "";
    if (fallback) return fallback;
    throw new Error("respuesta vacía");
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error(`timeout ${timeoutMs}ms`);
    throw e instanceof Error ? new Error(mask(e.message)) : e;
  } finally {
    window.clearTimeout(timer);
  }
}
