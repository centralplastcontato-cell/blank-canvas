// CRM Types

export type AppRole = 'admin' | 'gestor' | 'comercial' | 'visualizacao';

export type LeadStatus = 'novo' | 'em_contato' | 'orcamento_enviado' | 'aguardando_resposta' | 'fechado' | 'perdido' | 'transferido' | 'trabalhe_conosco' | 'fornecedor' | 'cliente_retorno' | 'outros';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  em_contato: 'Visita',
  orcamento_enviado: 'Orçamento enviado',
  aguardando_resposta: 'Negociando',
  fechado: 'Fechado',
  perdido: 'Perdido',
  transferido: 'Transferência',
  trabalhe_conosco: 'Trabalhe Conosco',
  fornecedor: 'Fornecedor',
  cliente_retorno: 'Cliente Retorno',
  outros: 'Outros',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-500',
  em_contato: 'bg-yellow-500',
  orcamento_enviado: 'bg-purple-500',
  aguardando_resposta: 'bg-orange-500',
  fechado: 'bg-green-500',
  perdido: 'bg-red-500',
  transferido: 'bg-cyan-500',
  trabalhe_conosco: 'bg-teal-500',
  fornecedor: 'bg-indigo-500',
  cliente_retorno: 'bg-pink-500',
  outros: 'bg-gray-500',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin Global',
  gestor: 'Gestor',
  comercial: 'Comercial',
  visualizacao: 'Visualização',
};

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  unit: string | null;
  month: string | null;
  day_of_month: number | null;
  day_preference: string | null;
  guests: string | null;
  campaign_id: string;
  campaign_name: string | null;
  created_at: string;
  status: LeadStatus;
  responsavel_id: string | null;
  observacoes: string | null;
  has_scheduled_visit?: boolean; // From wapi_conversations link
  has_follow_up?: boolean; // From lead_history - follow-up automático enviado
  has_follow_up_2?: boolean; // From lead_history - second follow-up
  has_follow_up_3?: boolean; // From lead_history - third follow-up
  has_follow_up_4?: boolean; // From lead_history - fourth follow-up
  has_return?: boolean; // From lead_history - lead retornou pela LP
}

export interface LeadWithResponsavel extends Lead {
  responsavel?: {
    full_name: string;
  } | null;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserWithRole extends Profile {
  role?: AppRole;
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Permission Types
export type PermissionCode = 
  | 'leads.view'
  | 'leads.edit'
  | 'leads.delete'
  | 'leads.export'
  | 'leads.assign'
  | 'users.view'
  | 'users.manage'
  | 'permissions.manage';

export interface PermissionDefinition {
  id: string;
  code: PermissionCode;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: PermissionCode;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}
