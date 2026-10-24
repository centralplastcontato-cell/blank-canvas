import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { currentDownStreak, evolutionHoldReason, PAUSED_INSTANCE_ROW_IDS, streakNeedsAlert } from "./evolution-guard.ts";
import { evolutionRequest, isHeldError, MONITOR_HOLD_REASON, monitorHoldWait, setEvolutionCallGuard } from "./evolution.ts";

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

Deno.test("monitor checando: espera a checagem acabar e segue; passou do limite, segura", async () => {
  const saved = { ...monitorHoldWait };
  monitorHoldWait.totalMs = 300;
  monitorHoldWait.stepMs = 5;
  const realFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = (() => { fetched++; return Promise.resolve(new Response(JSON.stringify({ data: { Id: "x" } }), { status: 200 })); }) as typeof fetch;
  try {
    let calls = 0;
    setEvolutionCallGuard(() => Promise.resolve(++calls < 3 ? MONITOR_HOLD_REASON : null));
    const ok = await evolutionRequest("token", "/send/text", "POST", { number: "x" });
    assertEquals([ok.held ?? false, calls, fetched], [false, 3, 1]);

    setEvolutionCallGuard(() => Promise.resolve(MONITOR_HOLD_REASON));
    const held = await evolutionRequest("token", "/send/text", "POST", { number: "x" });
    assertEquals([held.ok, held.held, fetched], [false, true, 1]);

    // Outros motivos (queda, número pausado) não esperam
    let other = 0;
    setEvolutionCallGuard(() => { other++; return Promise.resolve("número pausado"); });
    await evolutionRequest("token", "/send/text", "POST", { number: "x" });
    assertEquals(other, 1);
  } finally {
    setEvolutionCallGuard(null);
    globalThis.fetch = realFetch;
    Object.assign(monitorHoldWait, saved);
  }
});

Deno.test("queda pelos eventos: LoggedOut avisa na hora; caindo e voltando só depois de 10 min", () => {
  const now = Date.parse("2026-10-16T23:30:00Z");
  assertEquals(streakNeedsAlert(null, now), false);
  assertEquals(streakNeedsAlert({ since: "2026-10-16T23:29:50Z", loggedOut: true }, now), true);
  assertEquals(streakNeedsAlert({ since: "2026-10-16T23:25:00Z", loggedOut: false }, now), false);
  assertEquals(streakNeedsAlert({ since: "2026-10-16T23:20:00Z", loggedOut: false }, now), true);
});

// Banco de mentira com os eventos do número (mais novos primeiro quando pedir desc)
function eventsDb(events: Array<{ event_type: string; received_at: string }>) {
  return {
    from: () => {
      const f: { types: string[]; gte?: string; gt?: string; asc: boolean } = { types: [], asc: true };
      const q = {
        select: () => q,
        eq: () => q,
        in: (_c: string, v: string[]) => (f.types = v, q),
        gte: (_c: string, v: string) => (f.gte = v, q),
        gt: (_c: string, v: string) => (f.gt = v, q),
        order: (_c: string, o: { ascending: boolean }) => (f.asc = o.ascending, q),
        limit: (n: number) => {
          const rows = events.filter((e) => f.types.includes(e.event_type) && (!f.gte || e.received_at >= f.gte) && (!f.gt || e.received_at > f.gt))
            .sort((a, b) => (f.asc ? 1 : -1) * a.received_at.localeCompare(b.received_at));
          return Promise.resolve({ data: rows.slice(0, n) });
        },
      };
      return q;
    },
  };
}

Deno.test("queda pelos eventos: lê desde o último sinal de vida", async () => {
  const now = Date.parse("2026-10-16T23:30:00Z");
  // VENDAS 2 em 16/10: mensagens até 22:49, depois LoggedOut em ciclo
  const db = eventsDb([
    { event_type: "Message", received_at: "2026-10-16T22:07:01Z" },
    { event_type: "Receipt", received_at: "2026-10-16T22:49:00.700Z" },
    { event_type: "LoggedOut", received_at: "2026-10-16T22:49:00.873Z" },
    { event_type: "Disconnected", received_at: "2026-10-16T22:52:31Z" },
    { event_type: "LoggedOut", received_at: "2026-10-16T23:29:14Z" },
  ]);
  assertEquals(await currentDownStreak(db, "cb4a0b19", now), { since: "2026-10-16T22:49:00.873Z", loggedOut: true });
  // Reconectou (PairSuccess) depois: não há queda em andamento
  const back = eventsDb([
    { event_type: "LoggedOut", received_at: "2026-10-16T23:29:14Z" },
    { event_type: "PairSuccess", received_at: "2026-10-16T23:29:40Z" },
  ]);
  assertEquals(await currentDownStreak(back, "cb4a0b19", now), null);
  // Queda rápida que voltou sozinha (Disconnected → Connected)
  const blip = eventsDb([
    { event_type: "Disconnected", received_at: "2026-10-16T23:28:00Z" },
    { event_type: "Connected", received_at: "2026-10-16T23:28:03Z" },
  ]);
  assertEquals(await currentDownStreak(blip, "cb4a0b19", now), null);
});
