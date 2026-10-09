// Lista "Precisam de atenção" da Inteligência: só o que pede uma pessoa agora.
// Cada lead aparece em uma seção só, na ordem abaixo.
//
// 1. Cliente esperando resposta: a última mensagem da conversa é do cliente,
//    mandada entre 30 min e 7 dias atrás, e a conversa não foi encerrada.
// 2. Visitou e não fechou: visita realizada nos últimos 30 dias, lead ainda
//    aberto e ninguém conversou com ele nos últimos 2 dias.
// 3. Negociação parada: lead em "Negociando" sem conversa há 3 a 30 dias.
//
// Orçamentos sem resposta ficam de fora de propósito: são centenas (só no
// Castelo, 136 de 3 a 7 dias atrás) e não dá para tratar um a um.

import { brtDateDaysAgo } from "./visitOutcome";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const WAITING_MIN = 30 * MINUTE;
const WAITING_MAX = 7 * DAY;
const VISIT_LOOKBACK_DAYS = 30;
const VISIT_QUIET = 2 * DAY;
const NEGOTIATION_MIN = 3 * DAY;
const NEGOTIATION_MAX = 30 * DAY;

export const OPEN_LEAD_STATUSES = ["novo", "em_contato", "orcamento_enviado", "aguardando_resposta", "cliente_retorno"] as const;

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Visita",
  orcamento_enviado: "Orçamento enviado",
  aguardando_resposta: "Negociando",
  cliente_retorno: "Cliente retorno",
};

export interface AttentionLead {
  id: string;
  name: string;
  whatsapp: string;
  status: string;
  unit: string | null;
}

export interface AttentionConversation {
  lead_id: string;
  last_message_at: string | null;
  last_message_from_me: boolean | null;
  last_message_content: string | null;
  is_closed: boolean | null;
}

export interface AttentionVisit {
  lead_id: string;
  data_visita: string;
}

export type AttentionKind = "cliente_esperando" | "visitou_sem_fechar" | "negociacao_parada";

export interface AttentionItem {
  leadId: string;
  name: string;
  whatsapp: string;
  statusLabel: string;
  unit: string | null;
  /** quando foi a última mensagem da conversa (ISO), se houver */
  lastMessageAt: string | null;
  /** texto curto: "esperando há 3 h", "visitou em 02/10", "sem conversa há 5 dias" */
  detail: string;
  /** última mensagem do cliente, só na seção "esperando resposta" */
  preview: string | null;
}

export interface AttentionSection {
  kind: AttentionKind;
  items: AttentionItem[];
}

/** "30 min", "3 h", "1 dia", "5 dias" */
export function describeElapsed(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)} h`;
  const days = Math.floor(ms / DAY);
  return days === 1 ? "1 dia" : `${days} dias`;
}

function latestByLead(conversations: AttentionConversation[]): Map<string, AttentionConversation> {
  const latest = new Map<string, AttentionConversation>();
  for (const c of conversations) {
    if (!c.last_message_at) continue;
    const cur = latest.get(c.lead_id);
    if (!cur || (cur.last_message_at || "") < c.last_message_at) latest.set(c.lead_id, c);
  }
  return latest;
}

export function buildAttentionList(input: {
  leads: AttentionLead[];
  conversations: AttentionConversation[];
  /** visitas com status "realizada" */
  visits: AttentionVisit[];
  now?: Date;
}): AttentionSection[] {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const latest = latestByLead(input.conversations);
  const open = input.leads.filter((l) => (OPEN_LEAD_STATUSES as readonly string[]).includes(l.status));
  const used = new Set<string>();

  const ageOf = (leadId: string): number | null => {
    const c = latest.get(leadId);
    return c?.last_message_at ? nowMs - new Date(c.last_message_at).getTime() : null;
  };
  const item = (l: AttentionLead, detail: string, preview: string | null = null): AttentionItem => ({
    leadId: l.id,
    name: l.name || "Cliente",
    whatsapp: l.whatsapp,
    statusLabel: STATUS_LABELS[l.status] || l.status,
    unit: l.unit,
    lastMessageAt: latest.get(l.id)?.last_message_at ?? null,
    detail,
    preview,
  });

  // 1. Cliente esperando resposta — quem espera há mais tempo primeiro
  const waiting = open
    .filter((l) => {
      const c = latest.get(l.id);
      const age = ageOf(l.id);
      return !!c && c.last_message_from_me === false && !c.is_closed && age !== null && age >= WAITING_MIN && age <= WAITING_MAX;
    })
    .sort((a, b) => (ageOf(b.id) ?? 0) - (ageOf(a.id) ?? 0));
  waiting.forEach((l) => used.add(l.id));

  // 2. Visitou e não fechou — visita mais recente primeiro
  const since = brtDateDaysAgo(VISIT_LOOKBACK_DAYS, now);
  const lastVisit = new Map<string, string>();
  for (const v of input.visits) {
    if (v.data_visita < since) continue;
    const cur = lastVisit.get(v.lead_id);
    if (!cur || cur < v.data_visita) lastVisit.set(v.lead_id, v.data_visita);
  }
  const visited = open
    .filter((l) => {
      if (used.has(l.id) || !lastVisit.has(l.id)) return false;
      const age = ageOf(l.id);
      return age === null || age >= VISIT_QUIET;
    })
    .sort((a, b) => (lastVisit.get(b.id) || "").localeCompare(lastVisit.get(a.id) || ""));
  visited.forEach((l) => used.add(l.id));

  // 3. Negociação parada — a que parou há menos tempo primeiro (mais fácil de retomar)
  const stalled = open
    .filter((l) => {
      if (used.has(l.id) || l.status !== "aguardando_resposta") return false;
      const age = ageOf(l.id);
      return age !== null && age >= NEGOTIATION_MIN && age <= NEGOTIATION_MAX;
    })
    .sort((a, b) => (ageOf(a.id) ?? 0) - (ageOf(b.id) ?? 0));

  const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return [
    {
      kind: "cliente_esperando",
      items: waiting.map((l) => item(l, `esperando há ${describeElapsed(ageOf(l.id) ?? 0)}`, latest.get(l.id)?.last_message_content ?? null)),
    },
    {
      kind: "visitou_sem_fechar",
      items: visited.map((l) => {
        const age = ageOf(l.id);
        const quiet = age === null ? "sem conversa" : `sem conversa há ${describeElapsed(age)}`;
        return item(l, `visitou em ${ddmm(lastVisit.get(l.id) || "")} · ${quiet}`);
      }),
    },
    {
      kind: "negociacao_parada",
      items: stalled.map((l) => item(l, `sem conversa há ${describeElapsed(ageOf(l.id) ?? 0)}`)),
    },
  ];
}
