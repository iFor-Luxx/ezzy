import { describe, expect, test } from "bun:test";
import { toSyncDto, checkBatchSize } from "./index";

describe("allowlist sync (rechazo en serialización)", () => {
  test("rechaza media/ruta/secreto", () => {
    expect(toSyncDto("product", { id: "x", image_blob: new Uint8Array() } as never).ok).toBe(false);
    expect(toSyncDto("product", { id: "x", local_relative_ref: "C:\\fotos\\a.jpg" } as never).ok).toBe(false);
    expect(toSyncDto("app_setting", { key: "api_key", value: "oc_sk_x" } as never).ok).toBe(false);
  });
  test("rechaza knowledge sin approved_at", () => {
    expect(toSyncDto("knowledge_example", { id: "x", anonymized_text: "hola" } as never).ok).toBe(false);
  });
  test("acepta product mínimo", () => {
    const r = toSyncDto("product", { id: "a", name: "Polo", revision: 1 });
    expect(r.ok).toBe(true);
    expect(r.dto).toMatchObject({ id: "a", name: "Polo" });
  });
  test("rechaza tipo no sincronizable", () => {
    expect(toSyncDto("generation_record", { id: "x" }).ok).toBe(false);
    expect(toSyncDto("product_media_ref", { id: "x" }).ok).toBe(false);
    expect(toSyncDto("temp_contexts", { id: "x" }).ok).toBe(false);
    expect(toSyncDto("consent_audits", { id: "x" }).ok).toBe(false);
  });
  test("límites lote/payload", () => {
    expect(checkBatchSize(new Array(51).fill(0), 10).ok).toBe(false);
    expect(checkBatchSize([1], 70 * 1024).ok).toBe(false);
    expect(checkBatchSize([1], 10).ok).toBe(true);
  });
});
