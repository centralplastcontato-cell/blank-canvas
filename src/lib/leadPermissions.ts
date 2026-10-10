// Permissões de lead da Central de Atendimento (lista, CRM e chat), numa regra só.
// - Sem registro de permissão, o sistema libera (regra de sempre); só bloqueia o negado.
// - Enquanto as permissões carregam, nada fica liberado (antes ficava tudo liberado
//   nesse meio-tempo).
// - O papel "Visualização" nunca edita lead.
export interface LeadPermissionInput {
  /** papel e permissões já carregados */
  ready: boolean;
  isAdmin: boolean;
  /** papel admin, gestor ou comercial */
  roleCanEdit: boolean;
  /** papel "visualizacao" */
  isViewOnly: boolean;
  has: (code: string) => boolean;
}

export function leadPermissions({ ready, isAdmin, roleCanEdit, isViewOnly, has }: LeadPermissionInput) {
  const allow = (code: string) => isAdmin || (ready && has(code));
  const allowEdit = (code: string) => isAdmin || (ready && !isViewOnly && has(code));
  return {
    ready: ready || isAdmin,
    canEditLeads: isAdmin || (ready && !isViewOnly && (roleCanEdit || has("leads.edit"))),
    canEditName: allowEdit("leads.edit.name"),
    canEditDescription: allowEdit("leads.edit.description"),
    canViewContact: allow("leads.contact.view"),
    canDeleteLeads: allowEdit("leads.delete"),
    canDeleteFromChat: allowEdit("leads.delete.from_chat"),
    canExportLeads: allow("leads.export"),
    canAssignLeads: allowEdit("leads.assign"),
    canTransferLeads: allowEdit("leads.transfer"),
  };
}

export type LeadPermissions = ReturnType<typeof leadPermissions>;
