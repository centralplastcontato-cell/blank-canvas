import { assertEquals } from "jsr:@std/assert@1";
import { buildHubSummaryFacts } from "./hub-summary.ts";

Deno.test("buildHubSummaryFacts: compara com a semana anterior e ignora unidades paradas", () => {
  const facts = buildHubSummaryFacts({
    dashboard: {
      companies: [
        { id: "a", name: "Castelo", leads: 47, closed: 5, leads_lost: 3, msgs_received: 900, response_median_minutes: 1046, follow_ups: 80, whatsapp_status: "connected" },
        { id: "b", name: "Teste", leads: 0, closed: 0, leads_lost: 0, msgs_received: 0, response_median_minutes: null, follow_ups: 0, whatsapp_status: "unknown" },
      ],
      previous: { leads: 92, closed: 4 },
    },
    health: [{ id: "a", leads_prev_7d: 92, waiting: 22 }],
    insights: [
      { company_id: "a", motivo: "preco" },
      { company_id: "a", motivo: "preco" },
      { company_id: "a", motivo: "sumiu" },
    ],
    periodFrom: "2026-10-15T03:00:00.000Z",
    periodTo: "2026-10-22T03:00:00.000Z",
  });

  assertEquals(facts.unidades.length, 1);
  const u = facts.unidades[0];
  assertEquals(u.variacao_leads, "-49%");
  assertEquals(u.primeira_resposta_equipe, "17.4 h");
  assertEquals(u.clientes_esperando_resposta_ha_mais_de_2h, 22);
  assertEquals(u.principais_motivos_de_nao_fechar, ["Achou caro (2)", "Parou de responder (1)"]);
  assertEquals(facts.rede.variacao_festas, "+25%");
  assertEquals(facts.periodo, { de: "2026-10-15", ate: "2026-10-22" });
});
