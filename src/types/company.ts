// Company Types for Multi-Tenant Architecture

export interface Company {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  logo_url: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompanyWithChildren extends Company {
  children?: Company[];
}

export type UserCompanyRole = 'owner' | 'admin' | 'member';

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  role: UserCompanyRole;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCompanyWithDetails extends UserCompany {
  company: Company;
}

export const USER_COMPANY_ROLE_LABELS: Record<UserCompanyRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
};

export const USER_COMPANY_ROLE_COLORS: Record<UserCompanyRole, string> = {
  owner: 'bg-amber-500',
  admin: 'bg-blue-500',
  member: 'bg-gray-500',
};
