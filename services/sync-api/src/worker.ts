// Adaptador HTTP del sync-api: expone el protocolo a la extensión y al panel.
// Rutas: POST /v1/enroll · GET /v1/status · GET /v1/data · POST /v1/sync/push · GET /v1/sync/pull?cursor=
// Auth por header x-ezzy-installation (instalación enrolada). /v1/status es público mínimo (sin contenido).
// Auth persistente en D1 (una sola fuente de verdad aunque Cloudflare recicle isolates).
// Datos sync aún en memoria por isolate (piloto): se pierden al reiniciar.
import { SyncServer } from "./server";
import { AuthStore, D1AuthStore, type AuthPort, type D1Database } from "./auth";
import { SCHEMA_VERSION } from "@ezzy/contracts";
import { errorEnvelope } from "@ezzy/sync-client";

interface Env {
  EZZY_DB?: D1Database;
}

// Un SyncServer por binding D1 (misma fuente de verdad en todo el isolate).
// Sin binding (tests): servidor en memoria.
const memAuth = new AuthStore();
const memServer = new SyncServer(memAuth);
const servers = new WeakMap<D1Database, SyncServer>();

function getServer(env?: Env): SyncServer {
  const db = env?.EZZY_DB;
  if (!db) return memServer;
  let s = servers.get(db);
  if (!s) {
    s = new SyncServer(new D1AuthStore(db));
    servers.set(db, s);
  }
  return s;
}

function getAuth(server: SyncServer): AuthPort {
  return server.auth;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,x-ezzy-installation",
    },
  });
}

async function authorizedId(req: Request, auth: AuthPort): Promise<string | null> {
  const id = req.headers.get("x-ezzy-installation")?.trim();
  return id && (await auth.isAuthorized(id)) ? id : null;
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
  async fetch(req: Request, env?: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const server = getServer(env);
    const auth = getAuth(server);

    // Preflight CORS: la web en Pages llama al Worker desde otro origen.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,x-ezzy-installation",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (req.method === "POST" && path === "/v1/enroll") {
      const body = await readJson(req);
      const installationId = body?.["installationId"];
      const ownerSecret = body?.["ownerSecret"];
      if (typeof installationId !== "string" || !installationId || typeof ownerSecret !== "string" || !ownerSecret) {
        return json(errorEnvelope("VALIDATION_ERROR", "installationId y ownerSecret requeridos", false), 400);
      }
      let ok: boolean;
      if (!(await auth.getOwnerHash())) {
        ok = await auth.bootstrap(ownerSecret, installationId);
      } else {
        ok = await auth.enroll(installationId, ownerSecret);
      }
      if (!ok) return json(errorEnvelope("FORBIDDEN", "secreto incorrecto", false), 403);
      return json({ schemaVersion: SCHEMA_VERSION, ok: true });
    }

    if (req.method === "GET" && path === "/v1/status") {
      return json(await server.status());
    }

    const installationId = await authorizedId(req, auth);
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
      const out = await server.push({
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
