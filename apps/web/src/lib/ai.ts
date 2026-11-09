// Helpers no-secretos de IA. La API key ya NO vive en el navegador:
// se guarda una vez en tu nube (Worker/D1 write-only) vía lib/aiServer.ts
// y todos los usos (Asistente, Catálogo) van por ese proxy. Vale en
// localhost y en cualquier PC sin repegar.

export function storedModelId(): string {
  try {
    return localStorage.getItem("ezzy.oc.model") ?? "";
  } catch {
    return "";
  }
}

export function saveModelId(id: string): void {
  try {
    if (id) localStorage.setItem("ezzy.oc.model", id);
  } catch {
    // sin almacenamiento
  }
}
