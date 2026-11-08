// Atajos para usar la IA configurada en Configuración desde cualquier pestaña.
export function inferenceBase(): string {
  return typeof window !== "undefined" && window.location.port === "5173" ? "/oc-api" : "https://opencode.ai/inference/go";
}

export function storedKey(): string {
  try {
    return sessionStorage.getItem("ezzy.oc.key") || localStorage.getItem("ezzy.oc.key.saved") || "";
  } catch {
    return "";
  }
}

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
