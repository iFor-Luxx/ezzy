import { WORKER_KEY } from "./cloud";

// Sesión única del propietario (Lux). El PIN nunca se guarda:
// solo vive en memoria y se verifica/crea contra el servidor.
const SESSION_KEY = "ezzy.web.session";
const INST_KEY = "ezzy.web.installation";

export function getInstallationId(): string {
  try {
    const prev = localStorage.getItem(INST_KEY);
    if (prev && prev.trim()) return prev;
    const id = `web-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(INST_KEY, id);
    return id;
  } catch {
    return `web-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getWorkerUrl(): string {
  try {
    return localStorage.getItem(WORKER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function isAuthed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAuthed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sin almacenamiento de sesión: queda solo en memoria del módulo
  }
}

/** Crea el acceso la primera vez o verifica el PIN contra tu servidor. */
export async function enrollPin(base: string, installationId: string, pin: string): Promise<void> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${base}/v1/enroll`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId, ownerSecret: pin }),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data || data["ok"] !== true) {
      const err = data?.["error"] as { message?: unknown } | undefined;
      throw new Error(typeof err?.message === "string" ? err.message : `error ${res.status}`);
    }
    try {
      localStorage.setItem(WORKER_KEY, base);
    } catch {
      // sin almacenamiento: la URL vive solo esta sesión
    }
    setAuthed();
  } finally {
    window.clearTimeout(timer);
  }
}
