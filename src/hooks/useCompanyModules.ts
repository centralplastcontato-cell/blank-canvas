import { useCompany } from '@/contexts/CompanyContext';
import { Json } from '@/integrations/supabase/types';

export interface CompanyModules {
  whatsapp: boolean;
  crm: boolean;
  dashboard: boolean;
  sales_materials: boolean;
  config: boolean;
}

const DEFAULT_MODULES: CompanyModules = {
  whatsapp: true,
  crm: true,
  dashboard: true,
  sales_materials: true,
  config: true,
};

export function parseModules(settings: Json | null | undefined): CompanyModules {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { ...DEFAULT_MODULES };
  }
  const s = settings as Record<string, Json | undefined>;
  const em = s.enabled_modules;
  if (!em || typeof em !== 'object' || Array.isArray(em)) {
    return { ...DEFAULT_MODULES };
  }
  const modules = em as Record<string, Json | undefined>;
  return {
    whatsapp: modules.whatsapp !== false,
    crm: modules.crm !== false,
    dashboard: modules.dashboard !== false,
    sales_materials: modules.sales_materials !== false,
    config: modules.config !== false,
  };
}

export function useCompanyModules(): CompanyModules {
  const { currentCompany } = useCompany();
  return parseModules(currentCompany?.settings as Json | null);
}

export const MODULE_LABELS: Record<keyof CompanyModules, { label: string; description: string }> = {
  whatsapp: { label: 'WhatsApp', description: 'Chat e automações de WhatsApp' },
  crm: { label: 'CRM / Leads', description: 'Kanban, lista e gestão de leads' },
  dashboard: { label: 'Dashboard', description: 'Métricas e gráficos de desempenho' },
  sales_materials: { label: 'Materiais de Venda', description: 'PDFs, fotos e vídeos de vendas' },
  config: { label: 'Configurações', description: 'Configurações do bot e templates' },
};
