// Adaptador HTTP del sync-api (piloto): expone el protocolo a la extensión y al panel.
// Rutas: POST /v1/enroll · GET /v1/status · GET /v1/data · POST /v1/sync/push · GET /v1/sync/pull?cursor=
// Auth por header x-ezzy-installation (instalación enrolada). /v1/status es público mínimo (sin contenido).
// Piloto en memoria: en prod, persistir en D1 (ver wrangler.toml).
import { SyncServer } from "./server";
import { AuthStore } from "./auth";
import { SCHEMA_VERSION } from "@ezzy/contracts";
import { errorEnvelope } from "@ezzy/sync-client";

const auth = new AuthStore();
const server = new SyncServer(auth);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function authorizedId(req: Request): string | null {
  const id = req.headers.get("x-ezzy-installation")?.trim();
  return id && auth.isAuthorized(id) ? id : null;
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = (await req.json()) as unknown;
    return typeof b === "object" && b !== null ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "POST" && path === "/v1/enroll") {
      const body = await readJson(req);
      const installationId = body?.["installationId"];
      const ownerSecret = body?.["ownerSecret"];
      if (typeof installationId !== "string" || !installationId || typeof ownerSecret !== "string" || !ownerSecret) {
        return json(errorEnvelope("VALIDATION_ERROR", "installationId y ownerSecret requeridos", false), 400);
      }
      let ok: boolean;
      if (!auth.ownerHash) {
        await auth.bootstrap(ownerSecret, installationId);
        ok = true;
      } else {
        ok = await auth.enroll(installationId, ownerSecret);
      }
      if (!ok) return json(errorEnvelope("FORBIDDEN", "secreto incorrecto", false), 403);
      return json({ schemaVersion: SCHEMA_VERSION, ok: true });
    }

    if (req.method === "GET" && path === "/v1/status") {
      return json(server.status());
    }

    const installationId = authorizedId(req);
    if (!installationId) {
      return json(errorEnvelope("UNAUTHORIZED", "instalación no enrolada o revocada (header x-ezzy-installation)", false), 401);
    }

    if (req.method === "GET" && path === "/v1/data") {
      return json({ schemaVersion: SCHEMA_VERSION, data: server.list() });
    }

    if (req.method === "POST" && path === "/v1/sync/push") {
      const body = await readJson(req);
      if (!Array.isArray(body?.["changes"])) {
        return json(errorEnvelope("VALIDATION_ERROR", "changes requerido", false), 400);
      }
      const out = server.push({
        installationId,
        schemaVersion: typeof body?.["schemaVersion"] === "number" ? (body?.["schemaVersion"] as number) : SCHEMA_VERSION,
        changes: body?.["changes"] as never,
      });
      return json({ schemaVersion: SCHEMA_VERSION, ...out });
    }

    if (req.method === "GET" && path === "/v1/sync/pull") {
      return json({ schemaVersion: SCHEMA_VERSION, ...server.pull(url.searchParams.get("cursor") ?? undefined) });
    }

    return json(errorEnvelope("VALIDATION_ERROR", "ruta no encontrada", false), 404);
  },
};
