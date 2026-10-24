// Marca a conversa de quem recebeu a campanha, para o webhook reconhecer a resposta
// (bot_data.campaign_pending_reply) e mandar a resposta automática + avisos.
// O robô/IA não é desligado no envio: só quando o cliente responde (e a marca
// vale por poucos dias — ver wapi-webhook/campaign-reply.ts).
// Usado pela campaign-mark-conversation (envio pela tela) e pela campaign-dispatch (servidor).

// deno-lint-ignore-file no-explicit-any
import { phoneVariants } from "./campaign-schedule.ts";

export async function markConversationForCampaign(
  supabase: any,
  params: { campaignId: string; phone: string; instanceRowId: string; leadName?: string | null; soft: boolean },
): Promise<{ marked: boolean; conversationId?: string }> {
  const possibleJids = phoneVariants(params.phone).flatMap((v) => [`${v}@s.whatsapp.net`, `${v}@c.us`]);
  const { data: conv } = await supabase
    .from("wapi_conversations")
    .select("id, bot_data")
    .eq("instance_id", params.instanceRowId)
    .in("remote_jid", possibleJids)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conv) return { marked: false };

  const botData = {
    ...((conv.bot_data as Record<string, unknown>) || {}),
    campaign_pending_reply: params.campaignId,
    campaign_lead_name: params.leadName || null,
    campaign_marked_at: new Date().toISOString(),
    campaign_soft: params.soft,
  };
  await supabase.from("wapi_conversations").update({ bot_data: botData }).eq("id", conv.id);
  return { marked: true, conversationId: conv.id };
}
