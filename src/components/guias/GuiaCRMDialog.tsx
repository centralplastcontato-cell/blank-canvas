import {
  MessageSquare, Bot, Users, Zap, Target, Filter, Phone,
  ArrowRight, CheckCircle, AlertTriangle, TrendingUp, Settings
} from "lucide-react";
import { GuiaDialogBase, SectionCard, FeatureItem, SmartTip, type GuiaTab } from "./GuiaDialogBase";

const tabs: GuiaTab[] = [
  {
    value: "chat",
    label: "Chat",
    icon: MessageSquare,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" /> Chat WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground">
            Central de conversas integrada ao WhatsApp com visão completa do lead.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={MessageSquare} iconColor="bg-emerald-100 text-emerald-600" title="Conversas em Tempo Real" description="Receba e envie mensagens diretamente pela plataforma" />
            <FeatureItem icon={Users} iconColor="bg-blue-100 text-blue-600" title="Card do Lead" description="Veja status, visitas, temperatura e histórico em um painel lateral" />
            <FeatureItem icon={Phone} iconColor="bg-amber-100 text-amber-600" title="Ações Rápidas" description="Agende visitas, envie orçamentos e mude status sem sair do chat" />
            <FeatureItem icon={Filter} iconColor="bg-primary/15 text-primary" title="Filtros Inteligentes" description="Filtre por status, temperatura, responsável e muito mais" />
          </div>
        </SectionCard>
        <SmartTip>Use os filtros para focar nos leads quentes e prioritários primeiro — eles têm maior chance de fechar.</SmartTip>
      </>
    ),
  },
  {
    value: "bot",
    label: "Bot/Fluxo",
    icon: Bot,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> Bot & Fluxo Comercial
          </h3>
          <p className="text-xs text-muted-foreground">
            Automação inteligente que qualifica leads e direciona para visitas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Bot} iconColor="bg-primary/15 text-primary" title="Bot de Qualificação" description="Coleta mês, convidados, nome e WhatsApp automaticamente" />
            <FeatureItem icon={ArrowRight} iconColor="bg-emerald-100 text-emerald-600" title="Fluxo Comercial V2" description="Direciona leads para agendamento de visita em 15 minutos" />
            <FeatureItem icon={Zap} iconColor="bg-amber-100 text-amber-600" title="Transferência Humana" description="Bot transfere para atendente quando lead avança no funil" />
            <FeatureItem icon={Settings} iconColor="bg-blue-100 text-blue-600" title="Configuração" description="Personalize mensagens, opções e comportamento do bot" />
          </div>
        </SectionCard>
        <SmartTip>O fluxo comercial prioriza visitas presenciais — o fator #1 de fechamento para buffets.</SmartTip>
      </>
    ),
  },
  {
    value: "status",
    label: "Status/Funil",
    icon: Target,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Funil de Status
          </h3>
          <p className="text-xs text-muted-foreground">
            Cada lead passa por estágios que refletem seu avanço na negociação.
          </p>
          <div className="space-y-2">
            <FeatureItem icon={Zap} iconColor="bg-blue-100 text-blue-600" title="Novo" description="Lead acabou de entrar, bot está qualificando" />
            <FeatureItem icon={MessageSquare} iconColor="bg-amber-100 text-amber-600" title="Em Contato / Visita" description="Atendente assumiu, lead pode ter visita agendada" />
            <FeatureItem icon={TrendingUp} iconColor="bg-primary/15 text-primary" title="Orçamento / Negociação" description="Proposta enviada, aguardando decisão do cliente" />
            <FeatureItem icon={CheckCircle} iconColor="bg-emerald-100 text-emerald-600" title="Fechado" description="Venda concluída, evento criado na agenda" />
            <FeatureItem icon={AlertTriangle} iconColor="bg-red-100 text-red-600" title="Perdido" description="Lead descartado manual ou automaticamente" />
          </div>
        </SectionCard>
        <SmartTip>Mantenha os status atualizados para que os relatórios de conversão e o score de temperatura sejam precisos.</SmartTip>
      </>
    ),
  },
  {
    value: "automacoes",
    label: "Automações",
    icon: Zap,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" /> Automações
          </h3>
          <p className="text-xs text-muted-foreground">
            Follow-ups automáticos e reativação de leads inativos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Zap} iconColor="bg-amber-100 text-amber-600" title="Follow-ups (FU1-FU4)" description="Régua de mensagens automáticas para leads sem resposta" />
            <FeatureItem icon={AlertTriangle} iconColor="bg-red-100 text-red-600" title="Auto-Lost" description="Descarte automático após último follow-up sem resposta" />
            <FeatureItem icon={TrendingUp} iconColor="bg-emerald-100 text-emerald-600" title="Reativação" description="Recupere leads antigos com mensagens personalizadas" />
            <FeatureItem icon={Bot} iconColor="bg-blue-100 text-blue-600" title="Recuperação de Bot" description="Retoma contato quando lead abandona o bot no meio" />
          </div>
        </SectionCard>
        <SmartTip>Configure os follow-ups para respeitar horários comerciais e intervalos mínimos entre mensagens.</SmartTip>
      </>
    ),
  },
];

export function GuiaCRMDialog() {
  return (
    <GuiaDialogBase
      title="Guia do CRM & Atendimento"
      subtitle="Chat WhatsApp, bot, funil de vendas e automações"
      icon={MessageSquare}
      tabs={tabs}
    />
  );
}
