// Resumo da semana do Hub: monta os fatos (números já calculados no banco) que
// vão para a IA. Sem rede nem banco, para poder testar.

// deno-lint-ignore-file no-explicit-any

import { INSIGHT_REASONS } from "./lead-insights.ts";

export const HUB_SUMMARY_SYSTEM_PROMPT = `Você é o analista comercial da rede de buffets infantis Celebrei.
Recebe os números da última semana de cada unidade (comparados com a semana anterior) e escreve um resumo para o dono da rede ler no celular.

Regras:
- Português do Brasil, direto, sem jargão. Use só os números recebidos; nunca invente dados.
- Formato em Markdown, nesta ordem:
  1. Uma frase de abertura com o quadro geral da semana.
  2. "**O que melhorou**": até 3 tópicos curtos.
  3. "**O que piorou**": até 3 tópicos curtos.
  4. "**Onde agir esta semana**": 2 a 4 ações práticas e específicas, citando a unidade.
- Cite unidades pelo nome. Ignore unidades sem movimento.
- "Festas fechadas" são vendas concluídas; "1ª resposta da equipe" é a mediana do tempo até uma pessoa responder (robô não conta).
- No máximo 180 palavras.`;

const pct = (cur: number, prev: number): string | null => {
  if (!prev) return null;
  const v = Math.round(((cur - prev) / prev) * 100);
  return `${v > 0 ? "+" : ""}${v}%`;
};

const minutes = (m: number | null | undefined): string | null => {
  if (m === null || m === undefined) return null;
  if (m < 60) return `${Math.round(m)} min`;
  return `${(m / 60).toFixed(1)} h`;
};

/** Fatos compactos da semana a partir de hub_dashboard_metrics, hub_health e lead_insights */
export function buildHubSummaryFacts(input: {
  dashboard: any;
  health: any[];
  insights: Array<{ company_id: string; motivo: string }>;
  periodFrom: string;
  periodTo: string;
}) {
  const healthById = new Map((input.health || []).map((h: any) => [h.id, h]));
  const reasonsByCompany = new Map<string, Map<string, number>>();
  for (const i of input.insights || []) {
    const m = reasonsByCompany.get(i.company_id) || new Map<string, number>();
    m.set(i.motivo, (m.get(i.motivo) || 0) + 1);
    reasonsByCompany.set(i.company_id, m);
  }

  const companies = (input.dashboard?.companies || [])
    .filter((c: any) => c.leads > 0 || c.closed > 0 || c.msgs_received > 0)
    .map((c: any) => {
      const h: any = healthById.get(c.id) || {};
      const reasons = [...(reasonsByCompany.get(c.id) || new Map()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, n]) => `${(INSIGHT_REASONS as Record<string, string>)[k] || k} (${n})`);
      return {
        unidade: c.name,
        leads: c.leads,
        leads_semana_anterior: h.leads_prev_7d ?? null,
        variacao_leads: pct(c.leads, h.leads_prev_7d ?? 0),
        festas_fechadas: c.closed,
        conversao: c.leads > 0 ? `${((c.closed / c.leads) * 100).toFixed(1)}%` : null,
        perdidos: c.leads_lost,
        primeira_resposta_equipe: minutes(c.response_median_minutes),
        clientes_esperando_resposta_ha_mais_de_2h: h.waiting ?? 0,
        whatsapp: c.whatsapp_status,
        follow_ups: c.follow_ups,
        principais_motivos_de_nao_fechar: reasons,
      };
    });

  const total = companies.reduce(
    (t: any, c: any) => ({ leads: t.leads + c.leads, festas: t.festas + c.festas_fechadas }),
    { leads: 0, festas: 0 },
  );
  const prev = input.dashboard?.previous || {};

  return {
    periodo: { de: input.periodFrom.slice(0, 10), ate: input.periodTo.slice(0, 10) },
    rede: {
      leads: total.leads,
      leads_semana_anterior: prev.leads ?? null,
      variacao_leads: pct(total.leads, prev.leads ?? 0),
      festas_fechadas: total.festas,
      festas_semana_anterior: prev.closed ?? null,
      variacao_festas: pct(total.festas, prev.closed ?? 0),
    },
    unidades: companies,
  };
}
