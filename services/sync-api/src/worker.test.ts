import { describe, expect, test } from "bun:test";
import handler from "./worker";

const BASE = "https://ezzy.test";

function req(path: string, init?: RequestInit, installationId?: string): Request {
  const headers = new Headers(init?.headers);
  if (installationId) headers.set("x-ezzy-installation", installationId);
  return new Request(`${BASE}${path}`, { ...init, headers });
}

async function enrollFirst(): Promise<string> {
  const id = `inst-${Math.random().toString(36).slice(2)}`;
  const r = await handler.fetch(
    req("/v1/enroll", { method: "POST", body: JSON.stringify({ installationId: id, ownerSecret: "secreto-x" }) })
  );
  expect(r.status).toBe(200);
  return id;
}

describe("worker HTTP (piloto)", () => {
  test("sin enrolar → 401; enrolar → ver, editar y eliminar", async () => {
    const bad = await handler.fetch(req("/v1/data", {}, "nadie"));
    expect(bad.status).toBe(401);

    const id = await enrollFirst();
    const push = await handler.fetch(
      req("/v1/sync/push", { method: "POST", body: JSON.stringify({ schemaVersion: 1, changes: [{ idempotencyKey: "w1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p1", name: "Polo" } }] }) }, id)
    );
    expect(push.status).toBe(200);

    const data1 = (await (await handler.fetch(req("/v1/data", {}, id))).json()) as { data: { entity_id: string; revision: number; dto: { name: string } }[] };
    expect(data1.data).toHaveLength(1);
    expect(data1.data[0].dto.name).toBe("Polo");

    // editar
    const edit = await handler.fetch(
      req("/v1/sync/push", { method: "POST", body: JSON.stringify({ schemaVersion: 1, changes: [{ idempotencyKey: "w2", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 2, base_revision: 1, payload: { id: "p1", name: "Polo editado" } }] }) }, id)
    );
    expect(edit.status).toBe(200);
    const data2 = (await (await handler.fetch(req("/v1/data", {}, id))).json()) as { data: { dto: { name: string } }[] };
    expect(data2.data[0].dto.name).toBe("Polo editado");

    // eliminar
    const del = await handler.fetch(
      req("/v1/sync/push", { method: "POST", body: JSON.stringify({ schemaVersion: 1, changes: [{ idempotencyKey: "w3", entity_type: "product", entity_id: "p1", operation: "tombstone", revision: 3, base_revision: 2, payload: {} }] }) }, id)
    );
    expect(del.status).toBe(200);
    const data3 = (await (await handler.fetch(req("/v1/data", {}, id))).json()) as { data: { deleted: boolean }[] };
    expect(data3.data[0].deleted).toBe(true);

    // status público con conteos
    const st = (await (await handler.fetch(req("/v1/status"))).json()) as { entities: number; plan: string };
    expect(st.entities).toBe(1);
    expect(st.plan).toBe("free");
  });

  test("secreto incorrecto al enrolar segunda instalación → 403", async () => {
    await enrollFirst();
    const r = await handler.fetch(
      req("/v1/enroll", { method: "POST", body: JSON.stringify({ installationId: "otra", ownerSecret: "mal" }) })
    );
    expect(r.status).toBe(403);
  });
});
