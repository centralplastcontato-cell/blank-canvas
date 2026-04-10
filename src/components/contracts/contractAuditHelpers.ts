import { supabase } from "@/integrations/supabase/client";

/**
 * Log a contract-related action to the audit trail.
 */
export async function logContractAction(
  companyId: string,
  contractId: string | null | undefined,
  templateId: string | null | undefined,
  action: string,
  performedBy: string,
  details: Record<string, any> = {},
) {
  try {
    await (supabase as any).from("contract_audit_logs").insert({
      company_id: companyId,
      contract_id: contractId || null,
      template_id: templateId || null,
      action,
      details,
      performed_by: performedBy,
    });
  } catch (e) {
    console.warn("[contract-audit] Failed to log action:", action, e);
  }
}

/**
 * Strip HTML tags and clean up contract content for WhatsApp plain-text sending.
 */
function stripHtmlForWhatsApp(html: string): string {
  let text = html;
  // Convert <strong> to *bold* for WhatsApp formatting
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "*$1*");
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Normalize whitespace but keep newlines
  text = text.replace(/[ \t]+/g, " ");
  // Remove excessive blank lines (max 2)
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Send a generated contract to the lead via WhatsApp using wapi-send.
 * Returns { success, error? }
 */
export async function sendContractViaWhatsApp(
  companyId: string,
  leadId: string,
  contractContent: string,
  contractName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get lead phone
    const { data: lead, error: leadErr } = await supabase
      .from("campaign_leads")
      .select("whatsapp, name")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead?.whatsapp) {
      return { success: false, error: "Lead não encontrado ou sem WhatsApp cadastrado." };
    }

    // 2. Find connected instance for this company
    const { data: instances } = await (supabase as any)
      .from("wapi_instances")
      .select("id, instance_id, instance_token, status")
      .eq("company_id", companyId)
      .eq("status", "connected")
      .limit(1);

    const instance = instances?.[0];
    if (!instance) {
      return { success: false, error: "Nenhuma instância do WhatsApp conectada." };
    }

    // 3. Find existing conversation
    const phone = lead.whatsapp.replace(/\D/g, "");
    const { data: convs } = await (supabase as any)
      .from("wapi_conversations")
      .select("id, jid")
      .eq("company_id", companyId)
      .eq("instance_id", instance.id)
      .or(`jid.ilike.%${phone}%,lead_id.eq.${leadId}`)
      .limit(1);

    const conv = convs?.[0];

    // 4. Format contract text
    const plainText = stripHtmlForWhatsApp(contractContent);
    const header = `📄 *${contractName}*\n\n`;
    const message = header + plainText;

    // 5. Send via wapi-send
    const { data: sendResult, error: sendErr } = await supabase.functions.invoke("wapi-send", {
      body: {
        action: "send-text",
        instanceId: instance.instance_id,
        instanceToken: instance.instance_token,
        phone: phone,
        message: message,
        conversationId: conv?.id || undefined,
      },
    });

    const sendPayload = sendResult as { success?: boolean; error?: string } | null;

    if (sendErr) {
      return { success: false, error: sendErr.message || "Erro ao enviar mensagem." };
    }

    if (sendPayload?.success === false) {
      return { success: false, error: sendPayload.error || "Falha no envio pelo WhatsApp." };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro inesperado ao enviar contrato." };
  }
}
