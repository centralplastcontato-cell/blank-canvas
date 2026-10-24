// Resposta a uma campanha: quem recebeu a campanha fica marcado na conversa
// (bot_data.campaign_pending_reply). A marca vale por alguns dias: depois
// disso, uma mensagem do cliente é uma conversa normal, não "resposta à
// campanha" (antes a marca não vencia e o robô ficava desligado para sempre).

// deno-lint-ignore-file no-explicit-any
type BotData = Record<string, any>;

/** Por quantos dias uma mensagem do cliente ainda conta como resposta à campanha */
export const CAMPAIGN_REPLY_WINDOW_DAYS = 7;

export interface CampaignReplyState {
  campaignId: string;
  soft: boolean;
  leadName: string;
  /** a marca passou do prazo: limpar e seguir como conversa normal */
  expired: boolean;
}

export function campaignReplyState(botData: BotData | null | undefined, now = new Date()): CampaignReplyState | null {
  const id = botData?.campaign_pending_reply;
  if (!id || typeof id !== "string") return null;
  const markedAt = Date.parse(String(botData?.campaign_marked_at || ""));
  const expired = Number.isFinite(markedAt) && now.getTime() - markedAt > CAMPAIGN_REPLY_WINDOW_DAYS * 86400000;
  return {
    campaignId: id,
    soft: botData?.campaign_soft === true,
    leadName: String(botData?.campaign_lead_name || "") || "Cliente",
    expired,
  };
}

/** Tira a marca de "aguardando resposta"; se respondeu, guarda quando e a qual campanha */
export function clearCampaignMark(botData: BotData | null | undefined, replied?: { campaignId: string; leadName: string; at: string }): BotData {
  const out: BotData = { ...(botData || {}) };
  delete out.campaign_pending_reply;
  delete out.campaign_lead_name;
  delete out.campaign_marked_at;
  delete out.campaign_soft;
  if (replied) {
    out.campaign_replied_at = replied.at;
    out.campaign_replied_id = replied.campaignId;
    out.campaign_replied_name = replied.leadName;
  }
  return out;
}

/**
 * Quem atende a resposta: "ai" = a IA responde na hora; "soft" = o
 * atendimento automático segue normal; "team" = passa para a equipe.
 */
export type CampaignReplyMode = "ai" | "soft" | "team";

/** Texto do aviso para a equipe (áudio e foto também contam como resposta) */
export function campaignReplyNotice(leadName: string, campaignName: string, mode: CampaignReplyMode, type: string): string {
  const what = type === "audio" ? "mandou um áudio em resposta à" : type === "image" ? "mandou uma foto em resposta à" : "respondeu à";
  if (mode === "ai") return `${leadName} ${what} campanha "${campaignName}". A IA já está respondendo — acompanhe a conversa.`;
  return mode === "soft"
    ? `${leadName} ${what} campanha "${campaignName}". O atendimento automático continua com ele.`
    : `${leadName} ${what} campanha "${campaignName}" e aguarda atendimento.`;
}
