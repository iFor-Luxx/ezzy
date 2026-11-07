// Auth propietario Fase 5 (piloto sintético): hash de owner_secret + allowlist instalaciones + revocación.
// Nunca guarda el secreto en claro. Sesión corta atada a installation_id.
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class AuthStore {
  ownerHash: string | null = null;
  installations = new Map<string, { enabled: boolean }>();

  async bootstrap(ownerSecret: string, installationId: string): Promise<void> {
    this.ownerHash = await sha256Hex(ownerSecret);
    this.installations.set(installationId, { enabled: true });
  }

  async enroll(installationId: string, ownerSecret: string): Promise<boolean> {
    if (!this.ownerHash) return false;
    if ((await sha256Hex(ownerSecret)) !== this.ownerHash) return false;
    this.installations.set(installationId, { enabled: true });
    return true;
  }

  revoke(installationId: string): void {
    this.installations.set(installationId, { enabled: false });
  }

  isAuthorized(installationId: string): boolean {
    return this.installations.get(installationId)?.enabled === true;
  }
}
