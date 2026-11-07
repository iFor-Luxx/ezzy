// Custodia de API key en MV3 pura: memoria + chrome.storage.session. Nunca local/sync/IndexedDB/logs.
// En bun/tests (sin chrome) opera solo en memoria.
let memKey: string | null = null;
let memSetAt = 0;
const SESSION_TTL_MS = 30 * 60 * 1000;

function session(): { set(k: object): Promise<void>; get(k: string): Promise<Record<string, unknown>>; remove(k: string | string[]): Promise<void> } | undefined {
  try {
    const g = globalThis as unknown as Record<string, { storage?: { session?: unknown } }>;
    return g["chrome"]?.storage?.session as never;
  } catch {
    return undefined;
  }
}

function hasSession(): boolean {
  return !!session();
}

export async function setApiKey(key: string): Promise<void> {
  if (!key.startsWith("oc_sk_")) throw new Error("formato esperado oc_sk_…");
  memKey = key;
  memSetAt = Date.now();
  const s = session();
  if (s) await s.set({ ezzy_oc_key: key });
}

export async function getApiKey(): Promise<string | null> {
  if (memKey && Date.now() - memSetAt < SESSION_TTL_MS) return memKey;
  const s = session();
  if (s) {
    const r = await s.get("ezzy_oc_key");
    const k = r["ezzy_oc_key"];
    if (typeof k === "string" && k.startsWith("oc_sk_")) {
      memKey = k;
      memSetAt = Date.now();
      return k;
    }
  }
  return null;
}

export async function forgetApiKey(): Promise<void> {
  memKey = null;
  memSetAt = 0;
  const s = session();
  if (s) await s.remove("ezzy_oc_key");
}

export function isKeyExpiredForTest(setAt: number, now: number): boolean {
  return now - setAt >= SESSION_TTL_MS;
}
