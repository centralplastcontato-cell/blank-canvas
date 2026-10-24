// Campanha que o cliente recebeu há poucos dias: a IA sabe do que ele está
// falando quando responde ("quero saber mais", "ainda tem?", um áudio...).
// Vale com ou sem marca na conversa (quem nunca tinha conversado ganha uma
// conversa nova só quando responde).

// deno-lint-ignore-file no-explicit-any
import { phoneTail, renderCampaignMessage } from "./campaign-schedule.ts";

/** Por quantos dias a IA ainda leva em conta a campanha recebida */
export const CAMPAIGN_CONTEXT_DAYS = 7;

export interface CampaignContext {
  name: string;
  message: string;
  hasImage: boolean;
  sentAt: string;
}

/** Última campanha enviada a este telefone nos últimos dias (null = nenhuma) */
export async function loadCampaignContext(
  supabase: any,
  companyId: string,
  phone: string,
  companyName: string,
  nowMs = Date.now(),
): Promise<CampaignContext | null> {
  const tail = phoneTail(phone);
  if (!tail || !companyId) return null;
  const since = new Date(nowMs - CAMPAIGN_CONTEXT_DAYS * 86400000).toISOString();
  const { data } = await supabase
    .from("campaign_recipients")
    .select("lead_name, variation_index, sent_at, campaigns!inner(name, company_id, message_variations, image_url)")
    .eq("campaigns.company_id", companyId)
    .eq("status", "sent")
    .gte("sent_at", since)
    .like("phone", `%${tail}`)
    .order("sent_at", { ascending: false })
    .limit(1);
  const row = (data as any[] | null)?.[0];
  if (!row?.campaigns) return null;
  const variations = Array.isArray(row.campaigns.message_variations) ? row.campaigns.message_variations : [];
  const variation = variations.length ? variations[Math.abs(row.variation_index ?? 0) % variations.length] : undefined;
  return {
    name: String(row.campaigns.name || "Promoção"),
    message: renderCampaignMessage(variation?.text || "", row.lead_name || "", companyName).trim(),
    hasImage: !!row.campaigns.image_url,
    sentAt: String(row.sent_at),
  };
}

/** Bloco do prompt da IA sobre a campanha recebida */
export function campaignPromptNote(ctx: CampaignContext, nowMs = Date.now()): string {
  const days = Math.max(0, Math.floor((nowMs - Date.parse(ctx.sentAt)) / 86400000));
  const when = days === 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
  const msg = ctx.message ? `"${ctx.message.slice(0, 700)}"` : "(só uma imagem, sem texto)";
  return `ATENÇÃO — CAMPANHA: este cliente recebeu ${when} a campanha "${ctx.name}" do buffet${ctx.hasImage ? " (com uma imagem)" : ""}. A mensagem foi: ${msg}
Ele provavelmente está respondendo a ela. Ela aparece no histórico como uma mensagem nossa. Como atender:
- Entenda a resposta à luz da campanha: "quero saber mais", "ainda tem?", "quanto fica?" ou um áudio falam DELA.
- Agradeça o retorno com naturalidade (sem repetir a campanha inteira) e siga o roteiro normal: se ainda não sabemos o mês e os convidados, pergunte; se ele quer valores, siga as regras de valores; conduza para a visita.
- Só fale das condições que estão escritas na campanha ou nas informações do buffet. Não invente desconto, prazo ou brinde. Se ele pedir algo além disso, passe para a equipe.
- Se a pessoa não quiser receber mensagens ("não tenho interesse", "sair"), respeite: agradeça com gentileza e encerre, sem insistir e sem prometer nada sobre próximas mensagens.`;
}
