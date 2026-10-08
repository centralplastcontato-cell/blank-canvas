// Aprovação de freelancer: mensagem de aprovação no WhatsApp (modelo da
// empresa) e a conversa marcada como equipe. Usada no Cadastro e nos
// Candidatos.
import { supabase } from "@/integrations/supabase/client";

export interface WaInstance { instance_id: string; unit: string | null; phone_number: string | null }

/** Números de WhatsApp conectados da empresa */
export async function fetchConnectedInstances(companyId: string): Promise<WaInstance[]> {
  const { data } = await supabase
    .from("wapi_instances")
    .select("instance_id, unit, phone_number")
    .eq("company_id", companyId)
    .in("status", ["connected", "degraded"]);
  return (data || []) as WaInstance[];
}

/**
 * Manda a mensagem de aprovação e marca a conversa como freelancer/equipe
 * (bot desligado, lead em "Trabalhe Conosco"). Grava o resultado no cadastro
 * (whatsapp_sent_at ou whatsapp_send_error) e relança o erro.
 */
export async function sendFreelancerApprovalMessage(
  companyId: string,
  instance: { instance_id: string },
  phone: string,
  freelancerName: string,
  responseId?: string,
): Promise<void> {
  try {
    const { DEFAULT_FREELANCER_APPROVAL_MESSAGE } = await import("@/components/whatsapp/settings/FreelancerApprovalMessageCard");
    let messageTemplate = DEFAULT_FREELANCER_APPROVAL_MESSAGE;
    const { data: companyData } = await supabase.from("companies").select("settings").eq("id", companyId).single();
    const settings = companyData?.settings as Record<string, any> | null;
    if (settings?.freelancer_approval_message) messageTemplate = settings.freelancer_approval_message;
    const message = messageTemplate.replace(/\{nome\}/g, freelancerName);

    const { error: sendError } = await supabase.functions.invoke("wapi-send", {
      body: { action: "send-text", phone, message, instanceId: instance.instance_id, contactName: freelancerName },
    });
    if (sendError) throw sendError;

    if (responseId) {
      await supabase.from("freelancer_responses").update({ whatsapp_sent_at: new Date().toISOString(), whatsapp_send_error: null } as any).eq("id", responseId);
    }

    // Conversa: freelancer + equipe, bot desligado
    const { data: convData } = await (supabase as any)
      .from("wapi_conversations")
      .select("id, lead_id")
      .eq("company_id", companyId)
      .eq("contact_phone", phone)
      .limit(1)
      .maybeSingle();
    if (convData) {
      await (supabase as any).from("wapi_conversations").update({ is_freelancer: true, is_equipe: true, bot_enabled: false, bot_step: null }).eq("id", convData.id);
      if (convData.lead_id) {
        await supabase.from("campaign_leads").update({ status: "trabalhe_conosco" }).eq("id", convData.lead_id);
      }
    }
  } catch (err: any) {
    if (responseId) {
      await supabase.from("freelancer_responses").update({ whatsapp_send_error: err?.message || "Erro desconhecido", whatsapp_sent_at: null } as any).eq("id", responseId);
    }
    throw err;
  }
}
