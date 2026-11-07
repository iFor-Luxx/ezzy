// Datos 100% sintéticos. Prohibido usar chats reales (sdd/13).
export const fixtureProducts = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Polo piqué", sku: "POL-001", description: "Algodón verificado", status: "active", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z", revision: 1 },
];
export const fixtureMessages = [
  { id: "22222222-2222-2222-2222-222222222222", title: "Saludo inicial", body: "Hola {{nombre}}, tenemos {{producto}} a S/ 49.90.", intent: "saludo", channel: "whatsapp", tags: ["saludo"], status: "approved", verified_at: "2026-01-01T00:00:00.000Z", revision: 1, command_alias: "saludo" },
];
export const fixturePrices = [
  { id: "33333333-3333-3333-3333-333333333333", product_id: "11111111-1111-1111-1111-111111111111", amount_minor: 4990, currency: "PEN", source: "catálogo", verified_at: "2026-01-01T00:00:00.000Z", revision: 1 },
];
