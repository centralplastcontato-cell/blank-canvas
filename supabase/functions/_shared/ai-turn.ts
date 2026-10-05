// Regras de "vez" da IA (beta): juntar mensagens seguidas do cliente numa
// resposta só e saber se a equipe já respondeu depois da passagem.

// Espera antes de responder: mensagens que chegam nesse intervalo são
// respondidas juntas, numa resposta só.
export const AI_DEBOUNCE_MS = 9000;

export interface IncomingRow {
  message_id: string | null;
  timestamp: string;
}

// A mensagem mais recente do cliente decide quem responde. Empate no mesmo
// segundo: maior message_id — todas as execuções chegam à mesma escolha.
export function pickLatestIncoming(rows: IncomingRow[]): string | null {
  let best: IncomingRow | null = null;
  for (const r of rows) {
    if (!r.message_id) continue;
    if (!best) { best = r; continue; }
    const tr = Date.parse(r.timestamp), tb = Date.parse(best.timestamp);
    if (tr > tb || (tr === tb && r.message_id > (best.message_id || ""))) best = r;
  }
  return best?.message_id ?? null;
}

// Mensagens nossas que NÃO são de uma pessoa da equipe (robôs/avisos)
const AUTOMATED_SOURCES = new Set(["auto_reminder", "campaign_auto_reply", "system_alert", "ai_agent"]);

export interface OutgoingRow {
  from_me: boolean;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

// Alguém da equipe respondeu depois da passagem? Mensagens do Celebrei
// (metadata.source "platform") e do celular (sem metadata) contam; follow-up
// automático e avisos do sistema não.
export function teamRepliedAfter(rows: OutgoingRow[], sinceIso: string): boolean {
  const since = Date.parse(sinceIso);
  return rows.some((r) => {
    if (!r.from_me || Date.parse(r.timestamp) <= since) return false;
    const source = typeof r.metadata?.source === "string" ? r.metadata.source as string : null;
    return !source || !AUTOMATED_SOURCES.has(source);
  });
}
