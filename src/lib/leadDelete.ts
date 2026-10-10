// Excluir lead. O histórico sai junto (o banco apaga em cascata) e a conversa fica
// sem lead (o banco limpa o vínculo). Só o dono ou um administrador da empresa pode
// excluir: para os outros o banco não apaga e também não dá erro, por isso aqui se
// confere quantos foram apagados de verdade. Antes a tela dizia "excluído" e o
// histórico sumia mesmo quando o lead continuava lá.
import { supabase } from "@/integrations/supabase/client";

export interface LeadDeleteOutcome {
  ok: boolean;
  deleted: number;
  /** o que mostrar quando não apagou tudo */
  message?: string;
}

export const LEAD_DELETE_NOT_ALLOWED = "Só o dono ou um administrador da empresa pode excluir leads. Nada foi apagado.";

export function leadDeleteOutcome(
  requested: number,
  deletedRows: number,
  error: { code?: string; message: string } | null,
): LeadDeleteOutcome {
  if (error) {
    if (error.code === "23503") {
      return { ok: false, deleted: 0, message: "Esse lead tem contrato ou documento ligado a ele e não pode ser excluído." };
    }
    return { ok: false, deleted: 0, message: error.message };
  }
  if (deletedRows === 0) return { ok: false, deleted: 0, message: LEAD_DELETE_NOT_ALLOWED };
  if (deletedRows < requested) {
    return {
      ok: false,
      deleted: deletedRows,
      message: `${deletedRows} de ${requested} excluídos. Os outros só o dono ou um administrador pode excluir.`,
    };
  }
  return { ok: true, deleted: deletedRows };
}

export async function deleteLeads(ids: string[]): Promise<LeadDeleteOutcome> {
  if (ids.length === 0) return { ok: true, deleted: 0 };
  const { data, error } = await supabase.from("campaign_leads").delete().in("id", ids).select("id");
  return leadDeleteOutcome(ids.length, data?.length || 0, error);
}
