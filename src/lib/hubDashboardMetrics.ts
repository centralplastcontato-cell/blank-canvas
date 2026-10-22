// Painel do Hub: leitura da resposta de hub_dashboard_metrics (banco) e formatações.
// Funções puras, sem Supabase, para poder testar.

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Delta {
  label: string;
  direction: "up" | "down" | "flat";
  goodWhenUp?: boolean;
}

/** Variação percentual; null quando não há base de comparação */
export function percentDelta(current: number, previous: number): Delta | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return { label: "0%", direction: "flat" };
  return { label: `${rounded > 0 ? "+" : ""}${rounded}%`, direction: rounded > 0 ? "up" : "down" };
}

/** Variação em pontos percentuais (para taxas) */
export function pointsDelta(current: number, previous: number): Delta {
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return { label: "0 p.p.", direction: "flat" };
  const text = Math.abs(diff).toFixed(1).replace(".", ",");
  return { label: `${diff > 0 ? "+" : "−"}${text} p.p.`, direction: diff > 0 ? "up" : "down" };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return "< 1min";
  if (minutes < 60) return `${Math.round(minutes)}min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1).replace(".", ",")}h`;
  return `${(minutes / 1440).toFixed(1).replace(".", ",")}d`;
}

export interface CompanyPeriodMetrics {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  whatsappStatus: "connected" | "disconnected" | "unknown";
  whatsappPhone: string | null;
  totalLeads: number;
  leadsToday: number;
  leadsNew: number;
  leadsClosed: number;
  leadsLost: number;
  totalConversations: number;
  activeConversations: number;
  followUps: number;
  messagesSent: number;
  messagesReceived: number;
  responseMedianMinutes: number | null;
  responseSamples: number;
  lastLeadAt: string | null;
}

export interface LeadBucket {
  companyId: string;
  /** "YYYY-MM" no fuso de São Paulo */
  month: string;
  status: string;
  count: number;
}

export interface HubDashboardData {
  companiesAll: { id: string; name: string }[];
  companies: CompanyPeriodMetrics[];
  previous: { leads: number; closed: number };
  response: { medianMinutes: number | null; samples: number };
  leadBuckets: LeadBucket[];
}

export interface HubDashboardTotals {
  leads: number;
  leadsToday: number;
  closed: number;
  lost: number;
  activeConversations: number;
  followUps: number;
  messagesSent: number;
  messagesReceived: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: any): number => (typeof v === "number" ? v : Number(v) || 0);
const numOrNull = (v: any): number | null => (v === null || v === undefined ? null : Number(v));

/** Converte o JSON devolvido por hub_dashboard_metrics */
export function parseHubDashboard(raw: any): HubDashboardData {
  const r = raw || {};
  return {
    companiesAll: (r.companies_all || []).map((c: any) => ({ id: c.id, name: c.name })),
    companies: (r.companies || []).map((c: any): CompanyPeriodMetrics => ({
      companyId: c.id,
      companyName: c.name,
      logoUrl: c.logo_url ?? null,
      whatsappStatus: c.whatsapp_status === "connected" || c.whatsapp_status === "disconnected" ? c.whatsapp_status : "unknown",
      whatsappPhone: c.whatsapp_phone ?? null,
      totalLeads: num(c.leads),
      leadsToday: num(c.leads_today),
      leadsNew: num(c.leads_new),
      leadsClosed: num(c.closed),
      leadsLost: num(c.leads_lost),
      totalConversations: num(c.conversations),
      activeConversations: num(c.active_conversations),
      followUps: num(c.follow_ups),
      messagesSent: num(c.msgs_sent),
      messagesReceived: num(c.msgs_received),
      responseMedianMinutes: numOrNull(c.response_median_minutes),
      responseSamples: num(c.response_samples),
      lastLeadAt: c.last_lead_at ?? null,
    })),
    previous: { leads: num(r.previous?.leads), closed: num(r.previous?.closed) },
    response: { medianMinutes: numOrNull(r.response?.median_minutes), samples: num(r.response?.samples) },
    leadBuckets: (r.lead_buckets || []).map((b: any) => ({
      companyId: b.company_id, month: b.month, status: b.status, count: num(b.count),
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function sumTotals(companies: CompanyPeriodMetrics[]): HubDashboardTotals {
  return companies.reduce<HubDashboardTotals>((t, c) => ({
    leads: t.leads + c.totalLeads,
    leadsToday: t.leadsToday + c.leadsToday,
    closed: t.closed + c.leadsClosed,
    lost: t.lost + c.leadsLost,
    activeConversations: t.activeConversations + c.activeConversations,
    followUps: t.followUps + c.followUps,
    messagesSent: t.messagesSent + c.messagesSent,
    messagesReceived: t.messagesReceived + c.messagesReceived,
  }), { leads: 0, leadsToday: 0, closed: 0, lost: 0, activeConversations: 0, followUps: 0, messagesSent: 0, messagesReceived: 0 });
}

export function countByStatus(buckets: LeadBucket[]): Record<string, number> {
  const out: Record<string, number> = {};
  buckets.forEach(b => { out[b.status] = (out[b.status] || 0) + b.count; });
  return out;
}

/** Empresa sem nenhum movimento no período (vai para a lista recolhida) */
export function isIdle(c: CompanyPeriodMetrics): boolean {
  return c.totalLeads === 0 && c.totalConversations === 0 && c.leadsClosed === 0 && c.messagesReceived === 0;
}
