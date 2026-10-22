// Central de alertas do Hub: regras sobre a saúde de cada unidade (hub_health).
// Funções puras, sem Supabase, para poder testar.

import { formatMinutes } from "./hubDashboardMetrics";

export interface CompanyHealth {
  companyId: string;
  companyName: string;
  whatsappStatus: "connected" | "disconnected" | "unknown";
  lastLeadAt: string | null;
  leads7d: number;
  leadsPrev7d: number;
  leads30d: number;
  responseMedianMinutes: number | null;
  responseSamples: number;
  waiting: number;
  oldestWaitingAt: string | null;
}

export type AlertSeverity = "critical" | "warning";

export interface HubAlert {
  id: string;
  severity: AlertSeverity;
  companyId: string;
  companyName: string;
  title: string;
  detail: string;
  action?: { label: string; path: string };
}

// Limites dos alertas
export const ALERT_RULES = {
  waitingMin: 5,
  waitingCritical: 20,
  responseWarnMinutes: 120,
  responseCriticalMinutes: 480,
  responseMinSamples: 5,
  noLeadDays: 3,
  dropMinPrevious: 10,
  dropRatio: 0.6,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseHubHealth(raw: any): CompanyHealth[] {
  return (Array.isArray(raw) ? raw : []).map((c: any) => ({
    companyId: c.id,
    companyName: c.name,
    whatsappStatus: c.whatsapp_status === "connected" || c.whatsapp_status === "disconnected" ? c.whatsapp_status : "unknown",
    lastLeadAt: c.last_lead_at ?? null,
    leads7d: Number(c.leads_7d) || 0,
    leadsPrev7d: Number(c.leads_prev_7d) || 0,
    leads30d: Number(c.leads_30d) || 0,
    responseMedianMinutes: c.response_median_minutes === null || c.response_median_minutes === undefined ? null : Number(c.response_median_minutes),
    responseSamples: Number(c.response_samples) || 0,
    waiting: Number(c.waiting) || 0,
    oldestWaitingAt: c.oldest_waiting_at ?? null,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / 3_600_000;
}

function formatAge(hours: number): string {
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

/** Alertas das unidades em operação (com lead nos últimos 30 dias), críticos primeiro */
export function buildAlerts(health: CompanyHealth[], now: Date = new Date()): HubAlert[] {
  const r = ALERT_RULES;
  const alerts: HubAlert[] = [];

  for (const c of health) {
    if (c.leads30d === 0) continue; // unidade parada ou de teste
    const base = { companyId: c.companyId, companyName: c.companyName };

    if (c.whatsappStatus !== "connected") {
      alerts.push({
        ...base,
        id: `${c.companyId}:whatsapp`,
        severity: "critical",
        title: c.whatsappStatus === "unknown" ? "WhatsApp não configurado" : "WhatsApp desconectado",
        detail: "Leads novos não estão sendo atendidos por este número.",
        action: { label: "Abrir WhatsApp", path: "/hub/whatsapp" },
      });
    }

    if (c.waiting >= r.waitingMin) {
      const oldestHours = c.oldestWaitingAt ? hoursSince(c.oldestWaitingAt, now) : 0;
      alerts.push({
        ...base,
        id: `${c.companyId}:waiting`,
        severity: c.waiting >= r.waitingCritical ? "critical" : "warning",
        title: `${c.waiting} clientes esperando resposta`,
        detail: `A última mensagem foi do cliente há mais de 2h${c.oldestWaitingAt ? `; o mais antigo espera há ${formatAge(oldestHours)}` : ""}.`,
        action: { label: "Ver leads", path: "/hub/leads" },
      });
    }

    if (c.responseMedianMinutes !== null && c.responseSamples >= r.responseMinSamples && c.responseMedianMinutes > r.responseWarnMinutes) {
      alerts.push({
        ...base,
        id: `${c.companyId}:response`,
        severity: c.responseMedianMinutes > r.responseCriticalMinutes ? "critical" : "warning",
        title: `Equipe demora ${formatMinutes(c.responseMedianMinutes)} para responder`,
        detail: `Mediana da 1ª resposta humana nos últimos 7 dias (${c.responseSamples} conversas).`,
      });
    }

    if (c.lastLeadAt && hoursSince(c.lastLeadAt, now) >= r.noLeadDays * 24) {
      alerts.push({
        ...base,
        id: `${c.companyId}:no-leads`,
        severity: "warning",
        title: `Sem lead novo há ${formatAge(hoursSince(c.lastLeadAt, now))}`,
        detail: "Confira campanhas, site e a conexão do WhatsApp.",
      });
    } else if (c.leadsPrev7d >= r.dropMinPrevious && c.leads7d < c.leadsPrev7d * r.dropRatio) {
      const drop = Math.round((1 - c.leads7d / c.leadsPrev7d) * 100);
      alerts.push({
        ...base,
        id: `${c.companyId}:drop`,
        severity: "warning",
        title: `Leads caíram ${drop}% na semana`,
        detail: `${c.leads7d} leads nos últimos 7 dias contra ${c.leadsPrev7d} na semana anterior.`,
      });
    }
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.companyName.localeCompare(b.companyName));
}
