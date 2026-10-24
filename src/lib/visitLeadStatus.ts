import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";

// Visita registrada à mão (chat, Agenda ou histórico do lead): o lead passa a
// "Visita". Antes só a IA mudava o status e quem marcava pelo WhatsApp e
// registrava depois ficava com o lead em "Negociando" (Leticia, Castelo, 24/10).
// Fechado, Perdido, Trabalhe Conosco etc. ficam como estão.
export const STATUSES_MOVED_TO_VISIT = ["novo", "aguardando_resposta", "orcamento_enviado", "cliente_retorno"];
const VISIT_STATUSES = ["agendada", "confirmada", "remarcada"];

export function visitMovesLeadStatus(visitType: string | null | undefined, visitStatus: string | null | undefined, leadStatus: string | null | undefined): boolean {
  if (visitType === "atendimento") return false; // entrega/retirada não é visita
  if (!VISIT_STATUSES.includes(String(visitStatus || ""))) return false;
  return STATUSES_MOVED_TO_VISIT.includes(String(leadStatus || ""));
}

/** Depois de gravar a visita: lead vira "Visita" (se couber) e a conversa ganha a marca de visita. */
export async function afterManualVisit(leadId: string | null | undefined, visitType: string | null | undefined, visitStatus: string | null | undefined, userId?: string | null): Promise<boolean> {
  if (!leadId) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: lead } = await db.from("campaign_leads").select("status").eq("id", leadId).maybeSingle();
  if (visitType !== "atendimento") {
    await db.from("wapi_conversations").update({ has_scheduled_visit: true }).eq("lead_id", leadId);
  }
  if (!visitMovesLeadStatus(visitType, visitStatus, lead?.status)) return false;
  const { error } = await db.from("campaign_leads").update({ status: "em_contato" }).eq("id", leadId).in("status", STATUSES_MOVED_TO_VISIT);
  if (error) {
    console.error("[visita] não foi possível mudar o status do lead:", error.message);
    return false;
  }
  await db.from("lead_history").insert({
    lead_id: leadId,
    company_id: getCurrentCompanyId(),
    action: "status_update",
    new_value: "Status atualizado para: Visita (visita registrada)",
    user_id: userId || null,
  });
  return true;
}
