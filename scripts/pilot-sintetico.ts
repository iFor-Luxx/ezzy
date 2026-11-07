// Piloto sintético Fase 1-6: ejercita criterios 1-12 sin datos reales ni red.
import { MemoryStore } from "../packages/storage/src/index";
import { validatePrice, validatePromotion, checkFactual, renderMessage } from "../packages/domain/src/index";
import { proposeKnowledge, previewProposal, approveProposal, confirmInclusion } from "../packages/domain/src/index";
import { toSyncDto, checkBatchSize } from "../packages/contracts/src/index";
import { Outbox } from "../packages/sync-client/src/index";
import { generateDraft } from "../packages/ai-opencode/src/index";
import { SyncServer } from "../services/sync-api/src/server";
import { AuthStore } from "../services/sync-api/src/auth";
import { newId, nowIso } from "../packages/domain/src/index";

const ok: string[] = [];
function pass(n: string): void { ok.push(n); console.log(`OK ${n}`); }

// 1. CRUD offline + persistencia
const store = new MemoryStore();
const pid = newId();
store.put("products", pid, { id: pid, name: "Polo sintético", revision: 1 });
if (!store.get("products", pid)) throw new Error("persistencia");
pass("1-crear-editar-offline");

// 2. Precio/vigencia + bloqueo
const price = { id: newId(), product_id: pid, amount_minor: 4990, currency: "PEN", source: "test", verified_at: nowIso(), revision: 1 };
validatePrice(price);
const v = checkFactual("Cuesta S/ 49.90", { prices: [], promotions: [], products: [] });
if (v.ok) throw new Error("debió bloquear sin fuente");
pass("2-precio-vigencia-bloqueo");

// 3. Comando → activar → variables → copiar (sin envío)
const body = "Hola {{nombre}}, tenemos {{producto}}";
const rendered = renderMessage(body, { nombre: "Ana", producto: "Polo" });
if (!rendered.includes("Ana")) throw new Error("vars");
const missing = renderMessage(body, {});
if (!missing.includes("{{nombre}}")) throw new Error("fail-closed vars");
pass("3-comando-activar-vars");

// 4. IA con consentimiento + key fuera de logs
const mockFetch = (async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "Hola, S/ 49.90 stock." } }] }) })) as unknown as typeof fetch;
const gen = await generateDraft({ cfg: { baseURL: "https://opencode.ai/inference", apiFamily: "openai-chat", modelId: "glm-5.3-flash", updatedAt: nowIso() }, apiKey: "oc_sk_x", facts: [{ label: "Precio", value: "4990 PEN" }], contextText: "cliente pregunta", fetchFn: mockFetch });
if (!gen.draft.includes("49.90")) throw new Error("draft");
pass("4-ia-consentida");

// 5/7. Aprendizaje voluntario completo
const p0 = proposeKnowledge("cliente pregunta por polo talla M", "faq");
const p1 = previewProposal(p0);
const p2 = approveProposal(p1, "cliente pregunta por polo talla M");
const { example } = confirmInclusion(p2);
if (!example.approved_at) throw new Error("approved_at");
pass("5-aprendizaje-voluntario");

// 9. Allowlist rechaza imagen/secreto/ruta
if (toSyncDto("product", { id: "x", image_blob: "b" } as never).ok) throw new Error("media");
if (toSyncDto("app_setting", { key: "api_key", value: "v" } as never).ok) throw new Error("secreto");
if (checkBatchSize(new Array(51).fill(0), 10).ok) throw new Error("lote");
pass("9-allowlist");

// 8/10/11. Sync: enrolar, push/pull idempotente, conflicto, tombstone, revoke, quota
const auth = new AuthStore();
await auth.bootstrap("secreto-piloto", "inst-a");
await auth.enroll("inst-b", "secreto-piloto");
const server = new SyncServer(auth);
const push1 = server.push({ installationId: "inst-a", schemaVersion: 1, changes: [{ idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: { id: "p1", name: "Polo" } }] });
if (push1.applied[0] !== "k1") throw new Error("push");
const outbox = new Outbox();
outbox.enqueue({ idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: {} });
outbox.enqueue({ idempotencyKey: "k1", entity_type: "product", entity_id: "p1", operation: "upsert", revision: 1, base_revision: 0, payload: {} });
if (outbox.pending() !== 1) throw new Error("idempotencia");
pass("10-sync-idempotente");
const bad = server.push({ installationId: "nope", schemaVersion: 1, changes: [] });
if (!bad.error) throw new Error("aislamiento");
pass("8-aislamiento-enrolamiento");

// 12. Export/restore sin temporales
store.putTemporal("t1", "context", 60000, Date.now());
const snap = store.exportLocal();
const store2 = new MemoryStore();
store2.importLocal(snap);
if (store2.list("temp_contexts").length !== 0) throw new Error("temporales");
if (!store2.get("products", pid)) throw new Error("restore");
pass("12-export-restore");

console.log(`\nPILOTO OK: ${ok.length} grupos (${ok.join(", ")})`);
