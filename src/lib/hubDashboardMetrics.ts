// Cálculos puros do Painel do Hub (sem Supabase), para poder testar.

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Delta {
  label: string;
  direction: "up" | "down" | "flat";
  goodWhenUp?: boolean;
}

export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from.toISOString() && iso <= range.to.toISOString();
}

/** Período imediatamente anterior, com a mesma duração */
export function computePreviousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - duration), to: new Date(range.from.getTime()) };
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

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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
  responseMedianMinutes: number | null;
  lastLeadAt: string | null;
}

interface BuildInput {
  companies: {
    id: string;
    name: string;
    logoUrl: string | null;
    whatsappStatus: "connected" | "disconnected" | "unknown";
    whatsappPhone: string | null;
  }[];
  leads: { company_id: string; status: string; created_at: string }[];
  convos: { company_id: string; is_closed: boolean }[];
  followUps: { company_id: string }[];
  closedEvents: { company_id: string }[];
  responseSamples: { company_id: string; minutes: number }[];
  todayISO: string;
}

function groupBy<T extends { company_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  rows.forEach(r => {
    const arr = map.get(r.company_id);
    if (arr) arr.push(r);
    else map.set(r.company_id, [r]);
  });
  return map;
}

/** Métricas por empresa, todas calculadas sobre as linhas já filtradas pelo período */
export function buildPeriodMetrics(input: BuildInput): CompanyPeriodMetrics[] {
  const leads = groupBy(input.leads);
  const convos = groupBy(input.convos);
  const followUps = groupBy(input.followUps);
  const closed = groupBy(input.closedEvents);
  const responses = groupBy(input.responseSamples);

  return input.companies.map(c => {
    const cl = leads.get(c.id) || [];
    const cc = convos.get(c.id) || [];
    const lastLeadAt = cl.reduce<string | null>((latest, l) => (!latest || l.created_at > latest ? l.created_at : latest), null);
    return {
      companyId: c.id,
      companyName: c.name,
      logoUrl: c.logoUrl,
      whatsappStatus: c.whatsappStatus,
      whatsappPhone: c.whatsappPhone,
      totalLeads: cl.length,
      leadsToday: cl.filter(l => l.created_at >= input.todayISO).length,
      leadsNew: cl.filter(l => l.status === "novo").length,
      leadsClosed: (closed.get(c.id) || []).length,
      leadsLost: cl.filter(l => l.status === "perdido").length,
      totalConversations: cc.length,
      activeConversations: cc.filter(x => !x.is_closed).length,
      followUps: (followUps.get(c.id) || []).length,
      responseMedianMinutes: median((responses.get(c.id) || []).map(r => r.minutes)),
      lastLeadAt,
    };
  });
}
