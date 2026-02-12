import { useCompany } from '@/contexts/CompanyContext';
import { Json } from '@/integrations/supabase/types';

export interface CompanyModules {
  whatsapp: boolean;
  crm: boolean;
  dashboard: boolean;
  sales_materials: boolean;
  config: boolean;
  automations: boolean;
  data_import: boolean;
  advanced: boolean;
  messages: boolean;
  comercial_b2b: boolean;
  flow_builder: boolean;
  inteligencia: boolean;
}

const DEFAULT_MODULES: CompanyModules = {
  whatsapp: true,
  crm: true,
  dashboard: true,
  sales_materials: true,
  config: true,
  automations: true,
  data_import: true,
  advanced: true,
  messages: true,
  comercial_b2b: true,
  flow_builder: false,
  inteligencia: false,
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
    automations: modules.automations !== false,
    data_import: modules.data_import !== false,
    advanced: modules.advanced !== false,
    messages: modules.messages !== false,
    comercial_b2b: modules.comercial_b2b !== false,
    flow_builder: modules.flow_builder === true,
    inteligencia: modules.inteligencia === true,
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
  config: { label: 'Configurações', description: 'Configurações gerais e templates' },
  automations: { label: 'Automações', description: 'Automações do bot e follow-ups' },
  data_import: { label: 'Importar Dados', description: 'Importação de leads, conversas e mensagens' },
  advanced: { label: 'Avançado', description: 'Configurações avançadas do WhatsApp' },
  messages: { label: 'Mensagens', description: 'Templates e configurações de mensagens' },
  comercial_b2b: { label: 'Comercial B2B', description: 'Gestão comercial e prospecção B2B' },
  flow_builder: { label: 'Flow Builder', description: 'Editor visual de fluxos de conversa' },
  inteligencia: { label: 'Inteligência', description: 'Score de leads, priorização e análise de funil' },
};
