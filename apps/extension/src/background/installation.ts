// Instalación local por perfil/equipo: aislada hasta enrolamiento (Fase 5 sync).
export interface Installation {
  id: string;
  user_label: string;
  browser_family: string;
  enrolled_at: string;
  enabled: boolean;
}

export function newInstallation(userLabel: string): Installation {
  if (!userLabel.trim()) throw new Error("etiqueta requerida");
  if (userLabel.length > 40) throw new Error("etiqueta >40");
  return {
    id: crypto.randomUUID(),
    user_label: userLabel.trim(),
    browser_family: "chrome",
    enrolled_at: new Date().toISOString(),
    enabled: true,
  };
}

export function validateInstallation(i: Installation): void {
  if (!/^[0-9a-f-]{36}$/i.test(i.id)) throw new Error("installation.id UUID");
  if (i.browser_family !== "chrome") throw new Error("solo chrome en Fase 4");
}
