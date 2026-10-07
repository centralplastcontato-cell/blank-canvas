// Quem da empresa recebe avisos de um número (unidade): quem tem permissão de
// ver leads dessa unidade (ou de todas) e os administradores.

// deno-lint-ignore no-explicit-any
type Db = any;

export async function resolveUnitNotificationTargets(
  supabase: Db,
  companyId: string,
  unit: string | null,
): Promise<string[]> {
  const { data: companyUsers } = await supabase
    .from("user_companies")
    .select("user_id")
    .eq("company_id", companyId);
  const companyUserIds = (companyUsers || []).map((u: { user_id: string }) => u.user_id);
  if (companyUserIds.length === 0) return [];

  const unitLower = (unit || "all").toLowerCase();
  const unitPermission = `leads.unit.${unitLower}`;
  const { data: perms } = await supabase
    .from("user_permissions")
    .select("user_id")
    .or(`permission.eq.leads.unit.all,permission.eq.${unitPermission}`)
    .eq("granted", true)
    .in("user_id", companyUserIds);
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .in("user_id", companyUserIds);

  const ids = new Set<string>();
  (perms || []).forEach((p: { user_id: string }) => ids.add(p.user_id));
  (adminRoles || []).forEach((r: { user_id: string }) => ids.add(r.user_id));
  return Array.from(ids);
}
