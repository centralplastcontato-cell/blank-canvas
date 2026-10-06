import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { aiSandbox, createSandboxDb, inSandbox, SandboxContext, type SandboxState, sandboxSleep } from "./ai-sandbox.ts";
import { deterministicChecks } from "../ai-simulator/checks.ts";
import type { ScenarioState } from "../ai-simulator/engine.ts";

const emptyState = (): SandboxState => ({ memory: { wapi_messages: [] }, clockMs: Date.now(), seq: 0, outbox: [], tools: [] });

Deno.test("sandbox: tabelas da conversa em memória; banco real só leitura", async () => {
  const realCalls: string[] = [];
  const real = {
    from(table: string) {
      const b: any = {
        select() { realCalls.push(`select ${table}`); return b; },
        eq() { return b; },
        insert() { realCalls.push(`insert ${table}`); return b; },
        then(res: any) { return Promise.resolve({ data: [{ id: "real" }], error: null }).then(res); },
      };
      return b;
    },
  };
  const memory: Record<string, any[]> = { lead_visits: [{ id: "v1", lead_id: "L", data_visita: "2030-01-02" }] };
  const db = createSandboxDb(real, memory);

  // memória: insert + select com filtros, ordem e limite
  const ins = await db.from("lead_visits").insert({ lead_id: "SIM", data_visita: "2030-01-01" }).select("id").single();
  assertEquals(typeof ins.data.id, "string");
  const { data } = await db.from("lead_visits").select("*").gte("data_visita", "2030-01-01").order("data_visita", { ascending: true }).limit(1);
  assertEquals(data[0].lead_id, "SIM");
  await db.from("lead_visits").update({ status_visita: "remarcada" }).eq("lead_id", "SIM");
  assertEquals(memory.lead_visits.find((v) => v.lead_id === "SIM").status_visita, "remarcada");

  // real: leitura passa, escrita é recusada sem chegar ao banco
  const read = await db.from("company_events").select("*").eq("company_id", "c");
  assertEquals(read.data[0].id, "real");
  const write = await db.from("company_events").insert({ title: "x" });
  assertEquals(write.error?.message.includes("só leitura"), true);
  assertEquals(realCalls, ["select company_events"]);
  assertEquals((await db.rpc("get_company_notification_targets")).data, []);
});

Deno.test("sandbox: envio vai para a caixa de saída e esperas são puladas só dentro do contexto", async () => {
  const ctx = new SandboxContext(emptyState(), "gpt-4o-mini");
  assertEquals(inSandbox(), undefined);
  await aiSandbox.run(ctx, async () => {
    const t0 = Date.now();
    await sandboxSleep(5000);
    assertEquals(Date.now() - t0 < 1000, true);
    assertEquals(inSandbox()?.model, "gpt-4o-mini");
    assertEquals(ctx.send("send-text", "conv1", { message: "Oi! 😊" }), "");
  });
  assertEquals(ctx.state.outbox.length, 1);
  assertEquals(ctx.state.memory.wapi_messages[0].from_me, true);
  assertEquals(ctx.state.memory.wapi_messages[0].metadata.source, "ai_agent");
});

Deno.test("simulador: conferências automáticas (palavra sistema e valores fora da consulta)", () => {
  const st = { transcript: [] } as unknown as ScenarioState;
  st.transcript = [
    { who: "cliente", text: "quanto fica?", turn: 1 },
    { who: "ferramenta", text: "consultar_valor_pacote({})\n→ 🏰 *Castelo* — R$ 6.490", turn: 1 },
    { who: "ia", text: "🏰 *Castelo* — R$ 6.490 e o Premium R$ 9.999 😊", turn: 1 },
    { who: "ia", text: "Vou ver no sistema", turn: 2 },
  ];
  const checks = Object.fromEntries(deterministicChecks(st).map((c) => [c.id, c.ok]));
  assertEquals(checks, { sem_palavra_sistema: false, valores_conferidos: false });
});
