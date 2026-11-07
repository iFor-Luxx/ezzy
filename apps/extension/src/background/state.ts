// Estado SW efímero: persistir y rehidratar por evento (tolera suspensión MV3).
// Sin globals; storage inyectado para tests, chrome.storage.local en runtime.
export interface SwState {
  favorites: Record<string, string>;
  installationId?: string;
}

export interface Kv {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export async function loadState(store: Kv): Promise<SwState> {
  const r = await store.get("ezzy_sw");
  const s = r["ezzy_sw"] as SwState | undefined;
  return { favorites: {}, ...s };
}

export async function saveState(store: Kv, s: SwState): Promise<void> {
  await store.set({ ezzy_sw: s });
}
