import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  assertManagedName,
  createManagedInstance,
  deleteBlockReason,
  deleteManagedInstance,
  isProtectedName,
  managedNameFor,
  MAX_MANAGED_INSTANCES,
  summarize,
} from "./evolution-admin.ts";
import { isExpired, PENDING_TTL_MS, phoneFromPayload } from "./whatsapp-provision.ts";

async function throwsAsync(fn: () => Promise<unknown>): Promise<string> {
  try { await fn(); } catch (e) { return (e as Error).message; }
  throw new Error("esperava erro");
}
function throws(fn: () => unknown): string {
  try { fn(); } catch (e) { return (e as Error).message; }
  throw new Error("esperava erro");
}

// Evolution falsa: registra as chamadas
function fakeEvolution(instances: Array<Record<string, unknown>>) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  Deno.env.set("EVOLUTION_GLOBAL_API_KEY", "chave-teste");
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method || "GET"} ${new URL(url).pathname}`);
    if (url.endsWith("/instance/all")) return Promise.resolve(new Response(JSON.stringify({ data: instances, message: "success" })));
    if (url.endsWith("/instance/create")) return Promise.resolve(new Response(JSON.stringify({ data: { id: "novo-id", name: "x" } })));
    return Promise.resolve(new Response(JSON.stringify({ message: "success" })));
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

Deno.test("nomes protegidos e fora do padrão são recusados", () => {
  for (const n of ["castelo-vendas1", "castelo-vendas2", "planeta-vendas1", "prospecta-x", "Prospecta-vendas"]) {
    assertEquals(isProtectedName(n), true);
  }
  for (const n of ["castelo-vendas1", "prospecta-abc", "planeta-vendas1", "", "celebrei-", "buffet-x"]) {
    throws(() => assertManagedName(n));
  }
  assertEquals(assertManagedName("celebrei-buffet-encantado"), "celebrei-buffet-encantado");
  assertEquals(managedNameFor("Buffet Encantado & Cia"), "celebrei-buffet-encantado-cia");
});

Deno.test("a lista nunca devolve o token", () => {
  const out = summarize({ data: [{ id: "1", name: "celebrei-a", token: "SEGREDO", connected: true, jid: "" }] });
  assertEquals(JSON.stringify(out).includes("SEGREDO"), false);
  assertEquals(out[0], { id: "1", name: "celebrei-a", connected: true, jid: "" });
});

Deno.test("só apaga o que a Celebrei criou, com ID e nome conferidos e sem número pareado", () => {
  const row = { instance_id: "id1", evolution_name: "celebrei-a", managed_by_celebrei: true, provider: "evolution" };
  const live = { id: "id1", name: "celebrei-a", connected: true, jid: "" };
  assertEquals(deleteBlockReason(row, live), null);
  assertEquals(deleteBlockReason(null, live), "sem registro no wapi_instances");
  assertEquals(deleteBlockReason({ ...row, managed_by_celebrei: false }, live), "não foi criada pela Celebrei");
  assertEquals(deleteBlockReason({ ...row, evolution_name: "castelo-vendas1" }, { ...live, name: "castelo-vendas1" })?.includes("celebrei-*"), true);
  assertEquals(deleteBlockReason({ ...row, evolution_name: "celebrei-a" }, { ...live, id: "outro" }), "ID diferente do salvo");
  assertEquals(deleteBlockReason(row, { ...live, name: "prospecta-a" }), "nome diferente do salvo");
  assertEquals(deleteBlockReason(row, { ...live, jid: "5515999990000@s.whatsapp.net" }), "número já conectado");
});

Deno.test("criar: recusa nome protegido sem chamar a Evolution", async () => {
  const evo = fakeEvolution([]);
  try {
    await throwsAsync(() => createManagedInstance("castelo-vendas1", "t".repeat(32)));
    await throwsAsync(() => createManagedInstance("prospecta-novo", "t".repeat(32)));
    assertEquals(evo.calls, []);
  } finally { evo.restore(); }
});

Deno.test("criar: nome repetido e limite de instâncias", async () => {
  const evo = fakeEvolution([{ id: "1", name: "celebrei-a", token: "x" }]);
  try {
    const msg = await throwsAsync(() => createManagedInstance("celebrei-a", "t".repeat(32)));
    assertEquals(msg.includes("já existe"), true);
    assertEquals(evo.calls, ["GET /instance/all"]);
    assertEquals(await createManagedInstance("celebrei-b", "t".repeat(32)), "novo-id");
  } finally { evo.restore(); }
  const cheio = fakeEvolution(Array.from({ length: MAX_MANAGED_INSTANCES }, (_, i) => ({ id: String(i), name: `celebrei-${i}` })));
  try {
    assertEquals((await throwsAsync(() => createManagedInstance("celebrei-novo", "t".repeat(32)))).includes("limite"), true);
    assertEquals(cheio.calls.includes("POST /instance/create"), false);
  } finally { cheio.restore(); }
});

Deno.test("apagar: nunca chama DELETE em instância protegida ou pareada", async () => {
  const evo = fakeEvolution([
    { id: "c1", name: "castelo-vendas1", jid: "" },
    { id: "p1", name: "celebrei-pareada", jid: "5515999990000:3@s.whatsapp.net" },
    { id: "ok", name: "celebrei-livre", jid: "" },
  ]);
  try {
    await throwsAsync(() => deleteManagedInstance({ instance_id: "c1", evolution_name: "castelo-vendas1", managed_by_celebrei: true, provider: "evolution" }));
    await throwsAsync(() => deleteManagedInstance({ instance_id: "c1", evolution_name: "celebrei-livre", managed_by_celebrei: true, provider: "evolution" }));
    await throwsAsync(() => deleteManagedInstance({ instance_id: "p1", evolution_name: "celebrei-pareada", managed_by_celebrei: true, provider: "evolution" }));
    await throwsAsync(() => deleteManagedInstance({ instance_id: "ok", evolution_name: "celebrei-livre", managed_by_celebrei: false, provider: "evolution" }));
    assertEquals(evo.calls.some((c) => c.startsWith("DELETE")), false);
    await deleteManagedInstance({ instance_id: "ok", evolution_name: "celebrei-livre", managed_by_celebrei: true, provider: "evolution" });
    assertEquals(evo.calls.filter((c) => c.startsWith("DELETE")), ["DELETE /instance/delete/ok"]);
  } finally { evo.restore(); }
});

Deno.test("pareamento: número do evento e prazo do QR", () => {
  assertEquals(phoneFromPayload({ event: "PairSuccess", data: { jid: "5515999990000:12@s.whatsapp.net" } }), "5515999990000");
  assertEquals(phoneFromPayload({ event: "PairSuccess", data: {} }), null);
  const now = Date.parse("2026-10-19T12:00:00Z");
  assertEquals(isExpired({ updated_at: new Date(now - PENDING_TTL_MS - 1000).toISOString() }, now), true);
  assertEquals(isExpired({ updated_at: new Date(now - 60_000).toISOString() }, now), false);
});

Deno.test("remover (admin): desconecta e apaga a pareada, mas nunca uma protegida", async () => {
  const evo = fakeEvolution([
    { id: "p1", name: "celebrei-pareada", jid: "5515999990000:3@s.whatsapp.net" },
    { id: "c1", name: "castelo-vendas1", jid: "5515988880000:1@s.whatsapp.net" },
  ]);
  try {
    // sem o token da própria instância, número pareado não sai
    await throwsAsync(() => deleteManagedInstance({ instance_id: "p1", evolution_name: "celebrei-pareada", managed_by_celebrei: true, provider: "evolution" }, { allowPaired: true }));
    await throwsAsync(() => deleteManagedInstance({ instance_id: "c1", evolution_name: "castelo-vendas1", managed_by_celebrei: true, provider: "evolution" }, { allowPaired: true, instanceToken: "tok" }));
    assertEquals(evo.calls.some((c) => c.startsWith("DELETE")), false);
    await deleteManagedInstance({ instance_id: "p1", evolution_name: "celebrei-pareada", managed_by_celebrei: true, provider: "evolution" }, { allowPaired: true, instanceToken: "tok" });
    assertEquals(evo.calls.filter((c) => c.startsWith("DELETE")), ["DELETE /instance/logout", "DELETE /instance/delete/p1"]);
  } finally { evo.restore(); }
});
