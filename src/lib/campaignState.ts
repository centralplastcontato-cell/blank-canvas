// Situação de uma campanha para a tela, a partir do que está gravado. O status
// gravado não basta: quem bateu o limite do dia ou pausou volta para
// "draft", e campanhas antigas que terminaram ficaram como "draft" para sempre.

export type CampaignAction = "start" | "continue" | "resume" | "pause" | null;

export interface CampaignStateInput {
  status: string;
  total_recipients: number;
  sent_count: number;
  error_count: number;
  /** na fila do servidor (sai sozinha); sem isso, era o envio antigo pela tela */
  server_send?: boolean | null;
}

export interface CampaignState {
  kind: "draft" | "paused" | "sending" | "completed" | "cancelled";
  label: string;
  /** quem ainda não recebeu */
  pending: number;
  action: CampaignAction;
}

export function campaignState(c: CampaignStateInput, sendingHere = false): CampaignState {
  const sent = c.sent_count || 0;
  const pending = Math.max(0, (c.total_recipients || 0) - sent - (c.error_count || 0));
  if (c.status === "cancelled") return { kind: "cancelled", label: "Cancelada", pending, action: null };
  if (c.status === "sending") {
    // Na fila do servidor: sai sozinha, e dá para pausar
    if (c.server_send) return { kind: "sending", label: `Enviando · faltam ${pending}`, pending, action: "pause" };
    // Envio antigo pela tela: neste aparelho está enviando agora; em outro, parou no meio
    return { kind: "sending", label: "Enviando", pending, action: sendingHere ? null : "resume" };
  }
  if (c.status === "completed" || (pending === 0 && sent > 0)) {
    return { kind: "completed", label: "Concluída", pending: 0, action: null };
  }
  if (sent > 0) {
    return { kind: "paused", label: `Pausada · faltam ${pending}`, pending, action: "continue" };
  }
  return { kind: "draft", label: "Rascunho", pending, action: "start" };
}

/** Status a gravar quando a campanha volta a ficar ativa */
export function reactivatedStatus(c: CampaignStateInput): "draft" | "completed" {
  const pending = Math.max(0, (c.total_recipients || 0) - (c.sent_count || 0) - (c.error_count || 0));
  return pending === 0 && (c.sent_count || 0) > 0 ? "completed" : "draft";
}

const BRT = "America/Sao_Paulo";
const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: BRT, ...opts }).format(d);
const dayKey = (d: Date) => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });

/** Quando sai a próxima mensagem, em palavras: "hoje às 14:32", "amanhã às 09:05", "segunda às 09:10" */
export function nextSendLabel(next: Date, now: Date): string {
  if (next.getTime() <= now.getTime()) return "em instantes";
  const time = fmt(next, { hour: "2-digit", minute: "2-digit" });
  if (dayKey(next) === dayKey(now)) return `hoje às ${time}`;
  if (dayKey(next) === dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return `amanhã às ${time}`;
  return `${fmt(next, { weekday: "long" }).split("-")[0]} às ${time}`;
}
