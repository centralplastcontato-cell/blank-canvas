import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { leadPermissions } from "@/lib/leadPermissions";

/** Permissões de lead da pessoa (regras em src/lib/leadPermissions.ts) */
export function useLeadPermissions(userId: string | undefined) {
  const { hasPermission, isLoading: permsLoading } = usePermissions(userId);
  const { isAdmin, canEdit, isVisualizacao, isLoading: roleLoading } = useUserRole(userId);
  return {
    ...leadPermissions({
      ready: !!userId && !permsLoading && !roleLoading,
      isAdmin,
      roleCanEdit: canEdit,
      isViewOnly: isVisualizacao,
      has: hasPermission,
    }),
    /** para outras permissões (whatsapp.*): também espera carregar */
    allow: (code: string) => isAdmin || (!!userId && !permsLoading && !roleLoading && hasPermission(code)),
  };
}
