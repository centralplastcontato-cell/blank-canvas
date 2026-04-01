import { useCompany } from '@/contexts/CompanyContext';
import { Json } from '@/integrations/supabase/types';

export interface CompanyModules {
  // --- Atendimento & CRM ---
  whatsapp: boolean;
  crm: boolean;
  central_atendimento: boolean;
  contatos: boolean;
  // --- Comercial ---
  visitas: boolean;
  campanhas: boolean;
  sales_materials: boolean;
  landing_page: boolean;
  comercial_b2b: boolean;
  // --- Gestão ---
  dashboard: boolean;
  inteligencia: boolean;
  agenda: boolean;
  operacoes: boolean;
  // --- Automações & Bot ---
  automations: boolean;
  flow_builder: boolean;
  bot_festa: boolean;
  visit_confirmation: boolean;
  messages: boolean;
  // --- Configuração & Dados ---
  config: boolean;
  data_import: boolean;
  advanced: boolean;
  contrato: boolean;
  financeiro: boolean;
  // --- Outros ---
  treinamento: boolean;
  onboarding_checklist: boolean;
  empresa_parceira: boolean;
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
  // --- Atendimento & CRM ---
  whatsapp: true,
  crm: true,
  central_atendimento: true,
  contatos: true,
  // --- Comercial ---
  visitas: true,
  campanhas: false,
  sales_materials: true,
  landing_page: false,
  comercial_b2b: true,
  // --- Gestão ---
  dashboard: true,
  inteligencia: false,
  agenda: false,
  operacoes: true,
  // --- Automações & Bot ---
  automations: true,
  flow_builder: false,
  bot_festa: false,
  visit_confirmation: false,
  messages: true,
  // --- Configuração & Dados ---
  config: true,
  data_import: true,
  advanced: true,
  contrato: false,
  financeiro: false,
  // --- Outros ---
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
    // --- Atendimento & CRM ---
    whatsapp: modules.whatsapp !== false,
    crm: modules.crm !== false,
    central_atendimento: modules.central_atendimento !== false,
    contatos: modules.contatos !== false,
    // --- Comercial ---
    visitas: modules.visitas !== false,
    campanhas: modules.campanhas === true,
    sales_materials: modules.sales_materials !== false,
    landing_page: modules.landing_page === true,
    comercial_b2b: modules.comercial_b2b !== false,
    // --- Gestão ---
    dashboard: modules.dashboard !== false,
    inteligencia: modules.inteligencia === true,
    agenda: modules.agenda === true,
    operacoes: modules.operacoes !== false,
    // --- Automações & Bot ---
    automations: modules.automations !== false,
    flow_builder: modules.flow_builder === true,
    bot_festa: modules.bot_festa === true,
    visit_confirmation: modules.visit_confirmation === true,
    messages: modules.messages !== false,
    // --- Configuração & Dados ---
    config: modules.config !== false,
    data_import: modules.data_import !== false,
    advanced: modules.advanced !== false,
    contrato: modules.contrato === true,
    financeiro: modules.financeiro === true,
    // --- Outros ---
    treinamento: modules.treinamento !== false,
    onboarding_checklist: modules.onboarding_checklist === true,
  };
}

export function useCompanyModules(): CompanyModules {
  const { currentCompany } = useCompany();
  return parseModules(currentCompany?.settings as Json | null);
}

export const MODULE_LABELS: Record<keyof CompanyModules, { label: string; description: string }> = {
  // --- Atendimento & CRM ---
  whatsapp: { label: 'WhatsApp', description: 'Chat e automações de WhatsApp' },
  crm: { label: 'CRM / Leads', description: 'Kanban, lista e gestão de leads' },
  central_atendimento: { label: 'Central de Atendimento', description: 'Painel principal de atendimento ao cliente' },
  contatos: { label: 'Contatos', description: 'Agenda de contatos da empresa' },
  // --- Comercial ---
  visitas: { label: 'Visitas', description: 'Agenda de visitas comerciais ao buffet' },
  campanhas: { label: 'Campanhas', description: 'Disparos de marketing em massa via WhatsApp' },
  sales_materials: { label: 'Materiais de Venda', description: 'PDFs, fotos e vídeos de vendas' },
  landing_page: { label: 'Landing Page', description: 'Página de captura personalizada do buffet' },
  comercial_b2b: { label: 'Comercial B2B', description: 'Gestão comercial e prospecção B2B' },
  // --- Gestão ---
  dashboard: { label: 'Dashboard', description: 'Métricas e gráficos de desempenho' },
  inteligencia: { label: 'Inteligência', description: 'Score de leads, priorização e análise de funil' },
  agenda: { label: 'Agenda', description: 'Calendário de festas e eventos' },
  operacoes: { label: 'Operações', description: 'Formulários, checklists, pacotes e freelancers' },
  // --- Automações & Bot ---
  automations: { label: 'Automações', description: 'Automações do bot e follow-ups' },
  flow_builder: { label: 'Flow Builder', description: 'Editor visual de fluxos de conversa' },
  bot_festa: { label: 'Bot Festa', description: 'Mensagens automáticas para convidados em festas' },
  visit_confirmation: { label: 'Confirmação de Visita', description: 'Mensagens automáticas para confirmar visitas agendadas' },
  messages: { label: 'Mensagens', description: 'Templates e configurações de mensagens' },
  // --- Configuração & Dados ---
  config: { label: 'Configurações', description: 'Configurações gerais e templates' },
  data_import: { label: 'Importar Dados', description: 'Importação de leads, conversas e mensagens' },
  advanced: { label: 'Avançado', description: 'Configurações avançadas do WhatsApp' },
  contrato: { label: 'Contrato', description: 'Templates de contrato digital para clientes' },
  financeiro: { label: 'Financeiro', description: 'Controle financeiro integrado aos eventos' },
  // --- Outros ---
  treinamento: { label: 'Treinamento', description: 'Videoaulas de treinamento da plataforma' },
  onboarding_checklist: { label: 'Onboarding Guiado', description: 'Checklist interativo de primeiros passos no painel' },
};
