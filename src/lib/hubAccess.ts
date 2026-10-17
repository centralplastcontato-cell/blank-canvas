import { supabase } from "@/integrations/supabase/client";

/**
 * Quem entra no Hub (painel da Celebrei): admin da Celebrei ou dono/admin de
 * uma empresa principal que tem empresas filhas.
 */
export async function hasHubAccess(userId: string): Promise<boolean> {
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
  if (isAdmin === true) return true;

  const { data: uc } = await supabase
    .from("user_companies")
    .select("company_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);
  if (!uc || uc.length === 0) return false;

  const { data: parents } = await supabase
    .from("companies")
    .select("id")
    .in("id", uc.map((u) => u.company_id))
    .is("parent_id", null);
  if (!parents || parents.length === 0) return false;

  const { data: children } = await supabase
    .from("companies")
    .select("id")
    .in("parent_id", parents.map((p) => p.id))
    .limit(1);
  return !!children && children.length > 0;
}

/** O usuário faz parte de algum buffet (pode usar a plataforma de atendimento) */
export async function hasAnyCompany(userId: string): Promise<boolean> {
  const { data } = await supabase.from("user_companies").select("id").eq("user_id", userId).limit(1);
  return !!data && data.length > 0;
}
