import { useState } from "react";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Info, Link2, Star, Bot, Check, CheckCheck, Clock, 
  AlertCircle, Bell, BellOff, Trash2,
  ChevronLeft, ChevronRight, ExternalLink,
  ArrowRightLeft, GripVertical, Flame, Snowflake, Thermometer,
  Calendar, ClipboardCheck, Eye, EyeOff, Users, Shield, Crown,
  MessageSquare, Image, FileText, Video, Mic, Send, Paperclip,
  GitBranch, Filter, Download, RefreshCw, Settings,
  BarChart3, TrendingUp, Package, Briefcase, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface GuideSection {
  title: string;
  items: GuideItem[];
}

interface GuideTab {
  id: string;
  label: string;
  sections: GuideSection[];
}

export function VisualGuideSection() {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const { units } = useCompanyUnits();

  const dynamicUnitItems: GuideItem[] = [
    ...units.map((unit) => ({
      icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: unit.color || '#3b82f6' }} />,
      label: unit.name,
      description: `Unidade ${unit.name}.`,
    })),
    { icon: <Badge variant="outline" className="text-[10px] h-4 px-1">Todas</Badge>, label: "Todas as Unidades", description: "Visualização consolidada de todas as unidades." },
  ];

  const tabs: GuideTab[] = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      sections: [
        {
          title: "Status de Mensagens",
          items: [
            { icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />, label: "Pendente", description: "A mensagem está sendo enviada ao servidor." },
            { icon: <Check className="w-3.5 h-3.5 text-muted-foreground" />, label: "Enviada", description: "Entregue ao servidor do WhatsApp." },
            { icon: <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />, label: "Entregue", description: "Chegou ao dispositivo do destinatário." },
            { icon: <CheckCheck className="w-3.5 h-3.5 text-primary" />, label: "Lida", description: "Visualizada pelo destinatário (ticks azuis)." },
          ]
        },
        {
          title: "Tipos de Mídia",
          items: [
            { icon: <Image className="w-3.5 h-3.5 text-emerald-500" />, label: "Foto", description: "Imagem enviada ou recebida na conversa." },
            { icon: <Video className="w-3.5 h-3.5 text-purple-500" />, label: "Vídeo", description: "Vídeo enviado ou recebido." },
            { icon: <Mic className="w-3.5 h-3.5 text-primary" />, label: "Áudio", description: "Mensagem de voz gravada." },
            { icon: <FileText className="w-3.5 h-3.5 text-orange-500" />, label: "Documento", description: "PDF, planilha ou outro arquivo." },
            { icon: <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />, label: "Anexo", description: "Arquivo genérico anexado à mensagem." },
          ]
        },
        {
          title: "Conversas e Contatos",
          items: [
            { icon: <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />, label: "Favorito", description: "Conversa marcada como favorita para acesso rápido." },
            { icon: <Bot className="w-3.5 h-3.5 text-primary" />, label: "Bot Ativo", description: "O chatbot automático está respondendo esta conversa." },
            { icon: <Bot className="w-3.5 h-3.5 text-muted-foreground" />, label: "Bot Desativado", description: "O chatbot foi pausado para esta conversa." },
            { icon: <Badge variant="secondary" className="text-[10px] h-4 px-1">3</Badge>, label: "Não Lidas", description: "Número de mensagens não lidas na conversa." },
            { icon: <Send className="w-3.5 h-3.5 text-primary" />, label: "Enviar Mensagem", description: "Envia a mensagem digitada ou material selecionado." },
            { icon: <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />, label: "Conversa Fechada", description: "Conversa arquivada/fechada manualmente." },
          ]
        },
        {
          title: "Notificações",
          items: [
            { icon: <Bell className="w-3.5 h-3.5 text-primary" />, label: "Notificações Ativas", description: "Alertas sonoros habilitados para novas mensagens." },
            { icon: <BellOff className="w-3.5 h-3.5 text-muted-foreground" />, label: "Silenciado", description: "Alertas sonoros desativados." },
          ]
        },
      ]
    },
    {
      id: "leads",
      label: "Leads & CRM",
      sections: [
        {
          title: "Status do Lead",
          items: [
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />, label: "Novo", description: "Lead recém-chegado, aguardando primeiro contato." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-yellow-500" />, label: "Visita (Em Contato)", description: "Lead em atendimento ativo, visita agendada ou em andamento." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-purple-500" />, label: "Orçamento Enviado", description: "Proposta/orçamento foi enviado ao lead." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-orange-500" />, label: "Negociando", description: "Em fase de negociação, aguardando resposta do lead." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-green-500" />, label: "Fechado", description: "Negócio concluído com sucesso!" },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-red-500" />, label: "Perdido", description: "Lead não convertido." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-cyan-500" />, label: "Transferência", description: "Lead transferido para outro responsável." },
            { icon: <Briefcase className="w-3.5 h-3.5 text-amber-600" />, label: "Trabalhe Conosco", description: "Contato interessado em trabalhar na empresa." },
            { icon: <Package className="w-3.5 h-3.5 text-indigo-500" />, label: "Fornecedor", description: "Contato identificado como fornecedor." },
          ]
        },
        {
          title: "Indicadores do Lead",
          items: [
            { icon: <Info className="w-3.5 h-3.5 text-primary" />, label: "Lead Vinculado (Azul)", description: "Contato vinculado a um lead no CRM." },
            { icon: <Info className="w-3.5 h-3.5 text-destructive" />, label: "Não Qualificado (Vermelho)", description: "Contato ainda não qualificado como lead." },
            { icon: <Link2 className="w-3.5 h-3.5 text-primary" />, label: "Vinculação", description: "Indica que o contato tem um lead associado." },
            { icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />, label: "Lead Incompleto", description: "Faltam dados importantes (unidade, data ou convidados)." },
          ]
        },
        {
          title: "Ações do Kanban",
          items: [
            { icon: <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />, label: "Arrastar Card", description: "Segure e arraste para mover entre colunas." },
            { icon: <div className="flex gap-0.5"><ChevronLeft className="w-3.5 h-3.5" /><ChevronRight className="w-3.5 h-3.5" /></div>, label: "Mover Status", description: "Avançar ou retroceder o status rapidamente." },
            { icon: <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />, label: "Abrir WhatsApp", description: "Abre conversa direta com o lead." },
            { icon: <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />, label: "Transferir Lead", description: "Transfere para outro responsável." },
            { icon: <Trash2 className="w-3.5 h-3.5 text-destructive" />, label: "Excluir Lead", description: "Remove permanentemente o lead (apenas admins)." },
            { icon: <Download className="w-3.5 h-3.5 text-muted-foreground" />, label: "Exportar Leads", description: "Baixa planilha CSV com os leads filtrados." },
          ]
        },
      ]
    },
    {
      id: "inteligencia",
      label: "Inteligência",
      sections: [
        {
          title: "Temperatura do Lead",
          items: [
            { icon: <Flame className="w-3.5 h-3.5 text-red-500" />, label: "Quente", description: "Lead com alta intenção de compra, engajamento recente." },
            { icon: <Thermometer className="w-3.5 h-3.5 text-yellow-500" />, label: "Morno", description: "Lead com interesse moderado, precisa de follow-up." },
            { icon: <Snowflake className="w-3.5 h-3.5 text-blue-400" />, label: "Frio", description: "Lead sem interação recente, baixo engajamento." },
          ]
        },
        {
          title: "Score e Prioridade",
          items: [
            { icon: <TrendingUp className="w-3.5 h-3.5 text-green-500" />, label: "Score Alto", description: "Pontuação calculada por IA baseada em engajamento e dados." },
            { icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />, label: "Prioridade", description: "Lead marcado como prioritário pela IA." },
            { icon: <BarChart3 className="w-3.5 h-3.5 text-primary" />, label: "Funil de Conversão", description: "Gráfico mostrando leads por etapa do funil." },
          ]
        },
        {
          title: "Resumo Diário",
          items: [
            { icon: <MessageSquare className="w-3.5 h-3.5 text-primary" />, label: "Resumo IA", description: "Resumo automático gerado por IA das atividades do dia." },
            { icon: <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />, label: "Atualizar Resumo", description: "Regenera o resumo com dados mais recentes." },
          ]
        },
      ]
    },
    {
      id: "agenda",
      label: "Agenda",
      sections: [
        {
          title: "Status de Eventos",
          items: [
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />, label: "Confirmado", description: "Evento confirmado e agendado." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-yellow-500" />, label: "Pendente", description: "Evento aguardando confirmação." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-red-500" />, label: "Cancelado", description: "Evento foi cancelado." },
            { icon: <div className="w-3.5 h-3.5 rounded-full bg-green-500" />, label: "Realizado", description: "Evento já foi realizado com sucesso." },
          ]
        },
        {
          title: "Checklist de Eventos",
          items: [
            { icon: <ClipboardCheck className="w-3.5 h-3.5 text-primary" />, label: "Checklist", description: "Lista de tarefas operacionais vinculadas ao evento." },
            { icon: <Badge variant="outline" className="text-[10px] h-4 px-1">📋</Badge>, label: "Indicador no Calendário", description: "Aparece em eventos com tarefas pendentes no checklist." },
            { icon: <Check className="w-3.5 h-3.5 text-green-500" />, label: "Tarefa Concluída", description: "Item do checklist marcado como feito." },
          ]
        },
        {
          title: "Navegação",
          items: [
            { icon: <Calendar className="w-3.5 h-3.5 text-primary" />, label: "Visão Calendário", description: "Visualização mensal dos eventos." },
            { icon: <Filter className="w-3.5 h-3.5 text-muted-foreground" />, label: "Filtrar por Unidade", description: "Filtra eventos por unidade específica." },
          ]
        },
      ]
    },
    {
      id: "config",
      label: "Configurações",
      sections: [
        {
          title: "Automações",
          items: [
            { icon: <Bot className="w-3.5 h-3.5 text-primary" />, label: "Chatbot", description: "Respostas automáticas para leads no WhatsApp." },
            { icon: <GitBranch className="w-3.5 h-3.5 text-purple-500" />, label: "Fluxos", description: "Editor visual de fluxos de conversa do bot." },
            { icon: <Settings className="w-3.5 h-3.5 text-muted-foreground" />, label: "Modo Teste", description: "Testa o bot enviando mensagens apenas para seu número." },
          ]
        },
        {
          title: "Permissões e Usuários",
          items: [
            { icon: <Crown className="w-3.5 h-3.5 text-yellow-500" />, label: "Admin", description: "Acesso total a todas as funcionalidades." },
            { icon: <Shield className="w-3.5 h-3.5 text-primary" />, label: "Gerente", description: "Pode gerenciar leads, relatórios e configurações." },
            { icon: <Users className="w-3.5 h-3.5 text-muted-foreground" />, label: "Atendente", description: "Acesso ao chat e CRM com permissões limitadas." },
            { icon: <UserCheck className="w-3.5 h-3.5 text-green-500" />, label: "Ativo", description: "Usuário ativo no sistema." },
            { icon: <Eye className="w-3.5 h-3.5 text-muted-foreground" />, label: "Permissão Granular", description: "Controle fino de acesso por módulo (CRM, Chat, Config, etc.)." },
          ]
        },
        {
          title: "Unidades",
          items: dynamicUnitItems,
        },
      ]
    },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Guia de Ícones e Indicadores</CardTitle>
          <CardDescription>
            Referência rápida para entender os elementos visuais do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sub-tabs */}
          <div className="overflow-x-auto">
            <div className="flex gap-1 bg-muted/40 rounded-lg p-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {activeTabData && (
            <div className="space-y-5">
              {activeTabData.sections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {sectionIndex > 0 && <div className="border-t mb-4" />}
                  <h3 className="font-medium text-sm mb-3 text-foreground">{section.title}</h3>
                  <div className="grid gap-2">
                    {section.items.map((item, itemIndex) => (
                      <div 
                        key={itemIndex}
                        className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
