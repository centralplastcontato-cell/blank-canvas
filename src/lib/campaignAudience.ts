// Quem entra no público de uma campanha.
// Esconde sozinho: telefone inválido, quem pediu para sair, telefone repetido
// e, a não ser que a pessoa peça, quem já fechou/perdeu/não é cliente e quem
// recebeu campanha há pouco.

/** Situações em que não faz sentido mandar promoção sem a pessoa escolher */
export const CLOSED_LEAD_STATUSES = [
  "fechado",
  "perdido",
  "transferido",
  "fornecedor",
  "trabalhe_conosco",
  "outros",
] as const;

/** Limite de envios por dia por empresa (protege o número contra bloqueio) */
export const CAMPAIGN_DAILY_LIMIT = 50;

/** Quem recebeu campanha há menos que isso fica de fora */
export const RECENT_CAMPAIGN_DAYS = 15;

/** Últimos 8 dígitos do telefone (igual ao banco). Vazio se não tiver 8 dígitos. */
export function phoneTail(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : "";
}

export interface AudienceCandidate {
  id: string;
  whatsapp: string;
  status: string;
  source: "crm" | "base";
}

export interface AudienceHidden {
  invalid: number;
  optout: number;
  duplicate: number;
  closed: number;
  recent: number;
}

export interface AudienceOptions {
  optoutTails: Set<string>;
  recentTails: Set<string>;
  includeClosed: boolean;
  includeRecent: boolean;
}

export function prepareAudience<T extends AudienceCandidate>(
  leads: T[],
  opts: AudienceOptions,
): { available: T[]; hidden: AudienceHidden } {
  const hidden: AudienceHidden = { invalid: 0, optout: 0, duplicate: 0, closed: 0, recent: 0 };
  const closed = new Set<string>(CLOSED_LEAD_STATUSES);

  // Um por telefone: o do CRM vale mais que o da Base (tem situação de verdade)
  const ordered = [...leads].sort((a, b) => (a.source === b.source ? 0 : a.source === "crm" ? -1 : 1));
  const seen = new Set<string>();
  const keep = new Set<string>();
  for (const lead of ordered) {
    const tail = phoneTail(lead.whatsapp);
    if (!tail) { hidden.invalid++; continue; }
    if (opts.optoutTails.has(tail)) { hidden.optout++; continue; }
    if (seen.has(tail)) { hidden.duplicate++; continue; }
    seen.add(tail);
    if (!opts.includeClosed && closed.has(lead.status)) { hidden.closed++; continue; }
    if (!opts.includeRecent && opts.recentTails.has(tail)) { hidden.recent++; continue; }
    keep.add(lead.id);
  }

  // Mantém a ordem original da lista
  return { available: leads.filter((l) => keep.has(l.id)), hidden };
}

/** Na hora de gravar: um destinatário por telefone, sem telefones inválidos */
export function uniqueByPhone<T extends { whatsapp: string }>(leads: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const lead of leads) {
    const tail = phoneTail(lead.whatsapp);
    if (!tail || seen.has(tail)) continue;
    seen.add(tail);
    out.push(lead);
  }
  return out;
}

/** Quantos dias o envio leva, com o limite de mensagens por dia */
export function sendDays(pending: number, perDay: number): number {
  if (pending <= 0 || perDay <= 0) return 0;
  return Math.ceil(pending / perDay);
}
