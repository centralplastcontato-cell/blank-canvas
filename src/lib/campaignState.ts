// Situação de uma campanha para a tela, a partir do que está gravado. O status
// gravado não basta: quem bateu o limite de 50 por dia ou pausou volta para
// "draft", e campanhas antigas que terminaram ficaram como "draft" para sempre.

export type CampaignAction = "start" | "continue" | "resume" | null;

export interface CampaignStateInput {
  status: string;
  total_recipients: number;
  sent_count: number;
  error_count: number;
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
    // Neste aparelho está enviando agora; em outro, provavelmente parou no meio (página fechada)
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
