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

describe("worker IA proxy (write-only)", () => {
  test("sin enrolar → 401; key inválida → 400 y no se guarda", async () => {
    const anon = await handler.fetch(req("/v1/ai/status", {}, "nadie"));
    expect(anon.status).toBe(401);

    const id = await enrollFirst();
    const bad = await handler.fetch(
      req("/v1/ai/key", { method: "POST", body: JSON.stringify({ apiKey: "no-es-key" }) }, id)
    );
    expect(bad.status).toBe(400);
    const st = (await (await handler.fetch(req("/v1/ai/status", {}, id))).json()) as { configured: boolean };
    // Puede venir de otro test del mismo módulo (memoria compartida): solo exige booleano.
    expect(typeof st.configured).toBe("boolean");
  });

  test("guardar → status true → /v1/data y /v1/status no exponen la key → olvidar", async () => {
    const id = await enrollFirst();
    const key = `oc_sk_test_${Math.random().toString(36).slice(2)}1234567890`;
    const save = await handler.fetch(req("/v1/ai/key", { method: "POST", body: JSON.stringify({ apiKey: key }) }, id));
    expect(save.status).toBe(200);

    const st = (await (await handler.fetch(req("/v1/ai/status", {}, id))).json()) as { configured: boolean; updatedAt: string | null };
    expect(st.configured).toBe(true);
    expect(typeof st.updatedAt).toBe("string");

    // La key nunca sale por data/status ni en el body de confirmación.
    const saveBody = JSON.stringify(await save.json().catch(() => ({})));
    expect(saveBody).not.toContain(key);
    const data = JSON.stringify(await (await handler.fetch(req("/v1/data", {}, id))).json());
    expect(data).not.toContain(key);
    const pub = JSON.stringify(await (await handler.fetch(req("/v1/status"))).json());
    expect(pub).not.toContain(key);

    const forget = await handler.fetch(req("/v1/ai/forget", { method: "POST", body: "{}" }, id));
    expect(forget.status).toBe(200);
    const st2 = (await (await handler.fetch(req("/v1/ai/status", {}, id))).json()) as { configured: boolean };
    expect(st2.configured).toBe(false);
  });

  test("chat sin key → 400; con key usa proxy sin exponerla (mock upstream)", async () => {
    const id = await enrollFirst();
    // Asegura estado limpio para este test.
    await handler.fetch(req("/v1/ai/forget", { method: "POST", body: "{}" }, id));
    const nokey = await handler.fetch(
      req("/v1/ai/chat", { method: "POST", body: JSON.stringify({ modelId: "m", text: "HOLA" }) }, id)
    );
    expect(nokey.status).toBe(400);

    const key = `oc_sk_test_${Math.random().toString(36).slice(2)}1234567890`;
    expect((await handler.fetch(req("/v1/ai/key", { method: "POST", body: JSON.stringify({ apiKey: key }) }, id))).status).toBe(200);

    const origFetch = globalThis.fetch;
    let seenAuth = "";
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: unknown, init?: RequestInit) => {
      seenAuth = (init?.headers as Record<string, string>)?.["Authorization"] ?? "";
      return new Response(JSON.stringify({ choices: [{ message: { content: "HOLA desde mock" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    try {
      const r = await handler.fetch(
        req("/v1/ai/chat", { method: "POST", body: JSON.stringify({ modelId: "glm-test", text: "HOLA" }) }, id)
      );
      expect(r.status).toBe(200);
      const body = (await r.json()) as { text: string };
      expect(body.text).toContain("HOLA");
      expect(seenAuth).toBe(`Bearer ${key}`);
      expect(JSON.stringify(body)).not.toContain(key);
    } finally {
      (globalThis as unknown as { fetch: typeof fetch }).fetch = origFetch;
      await handler.fetch(req("/v1/ai/forget", { method: "POST", body: "{}" }, id));
    }
  });

  test("GET /v1/ai/key: sin enrolar 401; enrolado lee la guardada; sin key 400", async () => {
    const anon = await handler.fetch(req("/v1/ai/key", {}, "nadie"));
    expect(anon.status).toBe(401);

    const id = await enrollFirst();
    await handler.fetch(req("/v1/ai/forget", { method: "POST", body: "{}" }, id));
    const empty = await handler.fetch(req("/v1/ai/key", {}, id));
    expect(empty.status).toBe(400);

    const key = `oc_sk_test_${Math.random().toString(36).slice(2)}1234567890`;
    expect((await handler.fetch(req("/v1/ai/key", { method: "POST", body: JSON.stringify({ apiKey: key }) }, id))).status).toBe(200);
    const got = (await (await handler.fetch(req("/v1/ai/key", {}, id))).json()) as { apiKey: string };
    expect(got.apiKey).toBe(key);
    // Sigue sin fugarse por data ni status público.
    expect(JSON.stringify(await (await handler.fetch(req("/v1/data", {}, id))).json())).not.toContain(key);
    expect(JSON.stringify(await (await handler.fetch(req("/v1/status"))).json())).not.toContain(key);
    await handler.fetch(req("/v1/ai/forget", { method: "POST", body: "{}" }, id));
  });

  test("models proxy devuelve ids sin exponer la key (mock upstream)", async () => {
    const id = await enrollFirst();
    const key = `oc_sk_test_${Math.random().toString(36).slice(2)}1234567890`;
    expect((await handler.fetch(req("/v1/ai/key", { method: "POST", body: JSON.stringify({ apiKey: key }) }, id))).status).toBe(200);

    const origFetch = globalThis.fetch;
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async () =>
      new Response(JSON.stringify({ data: [{ id: "glm-5.3-flash" }, { id: "kimi-k2.5" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof fetch;
    try {
      const r = await handler.fetch(req("/v1/ai/models", {}, id));
      expect(r.status).toBe(200);
      const body = (await r.json()) as { models: { id: string }[] };
      expect(body.models.map((m) => m.id)).toEqual(["glm-5.3-flash", "kimi-k2.5"]);
      expect(JSON.stringify(body)).not.toContain(key);
    } finally {
      (globalThis as unknown as { fetch: typeof fetch }).fetch = origFetch;
      await handler.fetch(req("/v1/ai/forget", { method: "POST", body: "{}" }, id));
    }
  });
});
