// Contas da aba Relatórios da Inteligência, com uma definição só para cada
// número (antes "fechados", "visitas" e "conversão" mudavam de aba para aba).
//
// - Leads recebidos: leads criados no período (sem Trabalhe Conosco,
//   fornecedor, transferido e outros — pelo status ou pela unidade).
// - Festas fechadas: festas com data de venda no período (sem data de venda,
//   vale o dia em que a festa foi cadastrada), com ou sem valor.
// - Conversão: festas fechadas ÷ leads recebidos no mesmo período.
// - Comparecimento: realizadas ÷ (realizadas + não compareceu). Visitas que já
//   passaram e ninguém respondeu ficam de fora e aparecem como "sem resposta".
// - Faturamento e ticket médio: das festas fechadas no período que têm valor.

import { buildChannelBreakdown, type ChannelBreakdownRow } from "./leadChannel";
import { isVisitOutcomeDue, PENDING_VISIT_STATUSES } from "./visitOutcome";

export interface ReportLead {
  id?: string;
  status: string;
  unit: string | null;
  origem?: string | null;
  campaign_id?: string | null;
}

export interface ReportVisit {
  lead_id: string | null;
  status_visita: string;
  data_visita: string;
  horario_visita: string | null;
  unit: string | null;
}

export interface ReportEvent {
  lead_id: string | null;
  total_value: number | null;
  data_fechamento_venda: string | null;
  /** Dia (aaaa-mm-dd, horário de Brasília) em que a festa foi cadastrada */
  created_date: string | null;
}

export interface FunnelStep {
  status: string;
  label: string;
  count: number;
  pct: number;
}

export interface ChannelRow {
  channel: string;
  leads: number;
  visitsRealized: number;
  sales: number;
  /** festas ÷ leads do canal, em % */
  conversion: number;
  /** canal atendido pela IA */
  isAi: boolean;
}

export interface CommercialReport {
  leadsReceived: number;
  leadsReturned: number;
  salesCount: number;
  salesWithValue: number;
  salesTotal: number;
  ticketMedio: number;
  conversionRate: number;
  funnelSteps: FunnelStep[];
  channelBreakdown: ChannelBreakdownRow[];
  visitsRealized: number;
  visitsNoShow: number;
  visitsPendingAnswer: number;
  visitsUpcoming: number;
  visitsCancelled: number;
  /** null quando nenhuma visita do período tem resultado ainda */
  attendanceRate: number | null;
  byChannel: ChannelRow[];
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Visita",
  orcamento_enviado: "Orçamento enviado",
  aguardando_resposta: "Negociando",
  fechado: "Fechado",
  perdido: "Perdido",
  cliente_retorno: "Cliente retorno",
};

const FUNNEL_ORDER = ["novo", "em_contato", "orcamento_enviado", "aguardando_resposta", "fechado", "perdido", "cliente_retorno"];

/** "Vendas 2" e "VENDAS 2" são o mesmo canal */
export function normalizeChannel(unit: string | null | undefined): string {
  const u = (unit || "").trim();
  return u ? u.toUpperCase() : "SEM CANAL";
}

function inPeriod(date: string | null, from: string, to: string): boolean {
  return !!date && date >= from && date <= to;
}

export function buildCommercialReport(input: {
  leads: ReportLead[];
  leadsReturned: number;
  visits: ReportVisit[];
  events: ReportEvent[];
  /** canal (unit) dos leads das festas, para a tabela por canal */
  eventLeadUnits: Map<string, string | null>;
  /** canal (unit) que a IA atende, se houver */
  aiChannel?: string | null;
  from: string;
  to: string;
  now?: Date;
}): CommercialReport {
  const { visits, from, to, now = new Date() } = input;
  // Candidatos a emprego que caíram na unidade "Trabalhe Conosco" não são leads de festa
  const leads = input.leads.filter((l) => normalizeChannel(l.unit) !== "TRABALHE CONOSCO");

  // --- Leads e situação atual ---
  const leadsReceived = leads.length;
  const counts: Record<string, number> = {};
  for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
  const base = leadsReceived || 1;
  const funnelSteps = FUNNEL_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: counts[status] || 0,
    pct: parseFloat((((counts[status] || 0) / base) * 100).toFixed(1)),
  })).filter((s) => s.count > 0 || s.status !== "cliente_retorno");

  // --- Festas fechadas ---
  const events = input.events.filter((e) => inPeriod(e.data_fechamento_venda || e.created_date, from, to));
  const salesCount = events.length;
  const withValue = events.filter((e) => (e.total_value || 0) > 0);
  const salesTotal = withValue.reduce((sum, e) => sum + (e.total_value || 0), 0);
  const ticketMedio = withValue.length > 0 ? salesTotal / withValue.length : 0;
  const conversionRate = leadsReceived > 0 ? (salesCount / leadsReceived) * 100 : 0;

  // --- Visitas ---
  const periodVisits = visits.filter((v) => inPeriod(v.data_visita, from, to));
  const visitsRealized = periodVisits.filter((v) => v.status_visita === "realizada").length;
  const visitsNoShow = periodVisits.filter((v) => v.status_visita === "nao_compareceu").length;
  const visitsCancelled = periodVisits.filter((v) => v.status_visita === "cancelada").length;
  const pending = periodVisits.filter((v) => (PENDING_VISIT_STATUSES as readonly string[]).includes(v.status_visita));
  const visitsPendingAnswer = pending.filter((v) => isVisitOutcomeDue(v.data_visita, v.horario_visita, now)).length;
  const visitsUpcoming = pending.length - visitsPendingAnswer;
  const answered = visitsRealized + visitsNoShow;
  const attendanceRate = answered > 0 ? (visitsRealized / answered) * 100 : null;

  // --- Por canal de atendimento (VENDAS 1, 2, 3...) ---
  const channels = new Map<string, ChannelRow>();
  const row = (channel: string) => {
    let r = channels.get(channel);
    if (!r) {
      r = { channel, leads: 0, visitsRealized: 0, sales: 0, conversion: 0, isAi: false };
      channels.set(channel, r);
    }
    return r;
  };
  for (const l of leads) row(normalizeChannel(l.unit)).leads++;
  for (const v of periodVisits) {
    if (v.status_visita === "realizada") row(normalizeChannel(v.unit)).visitsRealized++;
  }
  for (const e of events) {
    const unit = e.lead_id ? input.eventLeadUnits.get(e.lead_id) : null;
    row(normalizeChannel(unit)).sales++;
  }
  const aiChannel = input.aiChannel ? normalizeChannel(input.aiChannel) : null;
  const byChannel = [...channels.values()]
    .map((r) => ({ ...r, conversion: r.leads > 0 ? (r.sales / r.leads) * 100 : 0, isAi: r.channel === aiChannel }))
    .sort((a, b) => b.leads - a.leads);

  return {
    leadsReceived,
    leadsReturned: input.leadsReturned,
    salesCount,
    salesWithValue: withValue.length,
    salesTotal,
    ticketMedio,
    conversionRate,
    funnelSteps,
    channelBreakdown: buildChannelBreakdown(leads),
    visitsRealized,
    visitsNoShow,
    visitsPendingAnswer,
    visitsUpcoming,
    visitsCancelled,
    attendanceRate,
    byChannel,
  };
}
