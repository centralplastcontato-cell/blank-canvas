import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { evolutionHoldReason, PAUSED_INSTANCE_ROW_IDS } from "./evolution-guard.ts";
import { evolutionRequest, isHeldError, setEvolutionCallGuard } from "./evolution.ts";

// Banco de mentira: último evento do número e trava do monitor
function fakeDb(lastEvent: { event_type: string; received_at: string } | null, lockUntil: string | null) {
  const builder = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, in: () => q, gte: () => q, order: () => q,
      limit: () => Promise.resolve({ data: table === "wapi_webhook_raw_events" && lastEvent ? [lastEvent] : [] }),
      maybeSingle: () => Promise.resolve({ data: table === "provider_health" ? { lock_until: lockUntil } : null }),
    };
    return q;
  };
  return { from: builder };
}

const NOW = Date.parse("2026-10-15T19:20:30Z");
const inst = { id: "row-v1", instance_id: "60626e7d" };
const ago = (s: number) => new Date(NOW - s * 1000).toISOString();

Deno.test("1 s depois de um Disconnected: segura qualquer chamada (caso VENDAS 1, 15/10 16:20)", async () => {
  const r = await evolutionHoldReason(fakeDb({ event_type: "Disconnected", received_at: ago(1) }, null), inst, NOW);
  assertEquals(typeof r === "string" && r.includes("Disconnected"), true);
});

Deno.test("Connected ou mensagem depois da queda: libera", async () => {
  assertEquals(await evolutionHoldReason(fakeDb({ event_type: "Connected", received_at: ago(5) }, null), inst, NOW), null);
  assertEquals(await evolutionHoldReason(fakeDb({ event_type: "Message", received_at: ago(5) }, null), inst, NOW), null);
  assertEquals(await evolutionHoldReason(fakeDb(null, null), inst, NOW), null);
});

Deno.test("monitor com a trava do número: segura; trava vencida: libera", async () => {
  assertEquals(await evolutionHoldReason(fakeDb(null, new Date(NOW + 60000).toISOString()), inst, NOW), "monitor checando o número");
  assertEquals(await evolutionHoldReason(fakeDb(null, ago(10)), inst, NOW), null);
});

Deno.test("número pausado: sempre segura; VENDAS 2 já não está pausado", async () => {
  const vendas2 = { id: "3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7", instance_id: "cb4a0b19" };
  assertEquals(await evolutionHoldReason(fakeDb(null, null), vendas2, NOW), null);
  PAUSED_INSTANCE_ROW_IDS.add("row-pausado");
  assertEquals(await evolutionHoldReason(fakeDb(null, null), { id: "row-pausado", instance_id: "x" }, NOW), "número pausado");
  PAUSED_INSTANCE_ROW_IDS.delete("row-pausado");
});

Deno.test("chamada segurada não vai para a Evolution e volta marcada", async () => {
  setEvolutionCallGuard(() => Promise.resolve("teste"));
  const r = await evolutionRequest("token", "/send/text", "POST", { number: "x" });
  setEvolutionCallGuard(null);
  assertEquals([r.ok, r.held, isHeldError(r.error)], [false, true, true]);
});
