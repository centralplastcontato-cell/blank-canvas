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
  agenda: boolean;
  operacoes: boolean;
  bot_festa: boolean;
  treinamento: boolean;
  onboarding_checklist: boolean;
}

export interface PartyControlModules {
  checklist: boolean;
  staff: boolean;
  maintenance: boolean;
  monitoring: boolean;
  attendance: boolean;
  info: boolean;
  prefesta: boolean;
  cardapio: boolean;
  avaliacao: boolean;
}

export const DEFAULT_PARTY_CONTROL_MODULES: PartyControlModules = {
  checklist: true,
  staff: true,
  maintenance: true,
  monitoring: true,
  attendance: true,
  info: true,
  prefesta: false,
  cardapio: false,
  avaliacao: false,
};

export function parsePartyControlModules(settings: Json | null | undefined): PartyControlModules {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { ...DEFAULT_PARTY_CONTROL_MODULES };
  }
  const s = settings as Record<string, Json | undefined>;
  const pcm = s.party_control_modules;
  if (!pcm || typeof pcm !== 'object' || Array.isArray(pcm)) {
    return { ...DEFAULT_PARTY_CONTROL_MODULES };
  }
  const m = pcm as Record<string, Json | undefined>;
  return {
    checklist: m.checklist !== false,
    staff: m.staff !== false,
    maintenance: m.maintenance !== false,
    monitoring: m.monitoring !== false,
    attendance: m.attendance !== false,
    info: m.info !== false,
    prefesta: m.prefesta === true,
    cardapio: m.cardapio === true,
    avaliacao: m.avaliacao === true,
  };
}

export const PARTY_CONTROL_MODULE_LABELS: Record<keyof PartyControlModules, { label: string; description: string }> = {
  checklist: { label: 'Checklist', description: 'Lista de verificação da festa' },
  staff: { label: 'Equipe / Financeiro', description: 'Gestão da equipe e pagamentos' },
  maintenance: { label: 'Manutenção', description: 'Checklist de manutenção pós-festa' },
  monitoring: { label: 'Acompanhamento', description: 'Monitoramento durante a festa' },
  attendance: { label: 'Lista de Presença', description: 'Controle de entrada de convidados' },
  info: { label: 'Informações', description: 'Orientações e informações da festa' },
  prefesta: { label: 'Pré-Festa', description: 'Formulário de pré-festa para o cliente' },
  cardapio: { label: 'Cardápio', description: 'Formulário de escolha de cardápio' },
  avaliacao: { label: 'Avaliação', description: 'Formulário de avaliação pós-festa' },
};

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
  agenda: false,
  operacoes: true,
  bot_festa: false,
  treinamento: true,
  onboarding_checklist: false,
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
    agenda: modules.agenda === true,
    operacoes: modules.operacoes !== false,
    bot_festa: modules.bot_festa === true,
    treinamento: modules.treinamento !== false,
    onboarding_checklist: modules.onboarding_checklist === true,
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
  agenda: { label: 'Agenda', description: 'Calendário de festas e eventos' },
  operacoes: { label: 'Operações', description: 'Formulários, checklists, pacotes e freelancers' },
  bot_festa: { label: 'Bot Festa', description: 'Mensagens automáticas para convidados em festas' },
  treinamento: { label: 'Treinamento', description: 'Videoaulas de treinamento da plataforma' },
  onboarding_checklist: { label: 'Onboarding Guiado', description: 'Checklist interativo de primeiros passos no painel' },
};
