import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  HelpCircle, Brain, BarChart3, Target, ShieldAlert, Search,
  TrendingUp, Thermometer, AlertTriangle, Flame, Snowflake,
  Sparkles, BookOpen, Zap, MessageSquare, ListChecks
} from "lucide-react";

const GUIDE_TABS = [
  { value: "relatorios", label: "Relatórios", icon: BarChart3 },
  { value: "resumo", label: "Resumo do Dia", icon: Brain },
  { value: "prioridades", label: "Prioridades", icon: Target },
  { value: "negociacoes", label: "Neg. Paradas", icon: ShieldAlert },
  { value: "followups", label: "Follow-ups", icon: MessageSquare },
  { value: "funil", label: "Funil", icon: BarChart3 },
  { value: "leads", label: "Leads do Dia", icon: TrendingUp },
  { value: "geral", label: "Conceitos", icon: BookOpen },
];

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/40 bg-muted/30 p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}

function FeatureItem({ icon: Icon, iconColor, title, description }: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
      <div className={`p-1.5 rounded-lg ${iconColor} shrink-0`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function GuiaInteligenciaDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Guia de Inteligência Comercial</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Entenda cada recurso do módulo de análise estratégica</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] px-6 py-4">
          <Tabs defaultValue="relatorios" className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1.5 rounded-xl bg-muted/60 border border-border/30 mb-4">
              {GUIDE_TABS.map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="text-xs px-3 py-1.5 rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Relatórios */}
            <TabsContent value="relatorios" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Relatórios Comerciais
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dashboard principal com KPIs do seu buffet: leads recebidos, fechados, taxa de conversão, visitas realizadas, comparecimento, faturamento vendido e ticket médio.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FeatureItem
                    icon={BarChart3}
                    iconColor="bg-blue-100 text-blue-600"
                    title="Funil de Conversão"
                    description="Novo → Visita → Orçamento → Negociando → Fechado/Perdido"
                  />
                  <FeatureItem
                    icon={Target}
                    iconColor="bg-green-100 text-green-600"
                    title="Prioridades de Venda"
                    description="Leads com maior chance de fechamento, ordenados por score"
                  />
                  <FeatureItem
                    icon={TrendingUp}
                    iconColor="bg-purple-100 text-purple-600"
                    title="Filtros Avançados"
                    description="Hoje, 7 dias, 30 dias, mês atual, personalizado e por unidade"
                  />
                  <FeatureItem
                    icon={Zap}
                    iconColor="bg-amber-100 text-amber-600"
                    title="Exportação"
                    description="Gere relatórios em PDF e Excel com dados detalhados"
                  />
                </div>
              </SectionCard>
            </TabsContent>

            {/* Resumo */}
            <TabsContent value="resumo" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Resumo do Dia
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Painel diário com métricas de leads (novos, atendidos, fechados, perdidos), timeline de eventos importantes e insights gerados pela IA. Selecione períodos de até 31 dias para análise comparativa.
                </p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-foreground flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong>Dica:</strong> Administradores podem personalizar o <strong>Contexto da IA</strong> com dados do buffet (ticket médio, nº de unidades, diferenciais) para insights mais precisos e personalizados.</span>
                  </p>
                </div>
              </SectionCard>
            </TabsContent>

            {/* Prioridades */}
            <TabsContent value="prioridades" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Prioridades de Venda
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Classifica seus leads em três níveis de urgência baseado no score e temperatura:
                </p>
                <div className="space-y-2">
                  <FeatureItem
                    icon={Flame}
                    iconColor="bg-green-100 text-green-600"
                    title="Atender Agora"
                    description="Score bom e temperatura acima de frio. Precisam de atenção imediata."
                  />
                  <FeatureItem
                    icon={AlertTriangle}
                    iconColor="bg-orange-100 text-orange-600"
                    title="Em Risco"
                    description="Pararam de responder (abandono detectado). Follow-up urgente necessário."
                  />
                  <FeatureItem
                    icon={Snowflake}
                    iconColor="bg-blue-100 text-blue-600"
                    title="Frios"
                    description="Score abaixo de 20. Podem ser reaquecidos com a automação de reativação."
                  />
                </div>
              </SectionCard>
            </TabsContent>

            {/* Negociações Paradas */}
            <TabsContent value="negociacoes" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Radar de Negociações Paradas
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Identifica leads em estágios críticos (Visita, Orçamento, Negociação) onde a interação humana parou ou o robô está inativo. Inclui score de prioridade (0-100), mês da festa e navegação direta para a conversa.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FeatureItem
                    icon={Target}
                    iconColor="bg-red-100 text-red-600"
                    title="Score de Prioridade"
                    description="0-100 baseado em visitas, recência e volume de mensagens"
                  />
                  <FeatureItem
                    icon={Zap}
                    iconColor="bg-purple-100 text-purple-600"
                    title="Indicador de Reativação"
                    description="🤖 indica leads que já receberam mensagem automática"
                  />
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-foreground flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong>Dica:</strong> Filtre por estágio ou mês da festa para focar nos leads mais relevantes para sua equipe.</span>
                  </p>
                </div>
              </SectionCard>
            </TabsContent>

            {/* Follow-ups */}
            <TabsContent value="followups" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Painel de Follow-ups
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Painel Kanban com 4 colunas (1º ao 4º Follow-up) que organiza os leads automaticamente com base na última ação de follow-up registrada. Os intervalos respeitam os delays configurados nas automações do WhatsApp.
                </p>
                <FeatureItem
                  icon={Zap}
                  iconColor="bg-green-100 text-green-600"
                  title="Ação Direta"
                  description="Envie mensagem pelo WhatsApp com um clique diretamente de cada card."
                />
              </SectionCard>
            </TabsContent>

            {/* Funil */}
            <TabsContent value="funil" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Funil de Conversão
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Distribuição dos leads por etapa do CRM (Novo → Visita → Orçamento → Negociando → Fechado/Perdido). O percentual indica a representação de cada etapa no total. O ícone de relógio mostra o tempo médio em cada etapa.
                </p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-foreground flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong>Dica:</strong> Use o funil para identificar gargalos — onde os leads ficam presos por mais tempo indica oportunidade de melhoria.</span>
                  </p>
                </div>
              </SectionCard>
            </TabsContent>

            {/* Leads do Dia */}
            <TabsContent value="leads" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Leads do Dia
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Lista todos os leads criados no dia atual com score, temperatura e status. Permite busca rápida por nome ou telefone e exportação para análise externa (com permissão de admin).
                </p>
              </SectionCard>
            </TabsContent>

            {/* Geral / Conceitos */}
            <TabsContent value="geral" className="mt-0 space-y-3">
              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Score (0–100)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pontuação automática que mede engajamento do lead: interações no WhatsApp, avanço de status e tempo sem resposta.
                </p>
              </SectionCard>

              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-primary" />
                  Temperatura
                </h3>
                <div className="space-y-2">
                  <FeatureItem icon={Snowflake} iconColor="bg-blue-100 text-blue-600" title="Frio" description="Baixo engajamento ou sem interação recente." />
                  <FeatureItem icon={TrendingUp} iconColor="bg-yellow-100 text-yellow-600" title="Morno" description="Respondeu mas não avançou para visita/orçamento." />
                  <FeatureItem icon={Flame} iconColor="bg-orange-100 text-orange-600" title="Quente" description="Pediu visita, orçamento ou demonstrou forte interesse." />
                  <FeatureItem icon={Target} iconColor="bg-green-100 text-green-600" title="Pronto" description="Score máximo, orçamento enviado ou visita agendada." />
                </div>
              </SectionCard>

              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Resumo IA por Lead
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Em cada card de lead, o botão "Resumo IA" gera um resumo da conversa, sugere próxima ação e cria mensagem pronta para enviar.
                </p>
              </SectionCard>

              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Alertas Inteligentes
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Alertas automáticos sobre negociações paradas, orçamentos sem resposta, queda de conversão, queda de leads, meses com baixa ocupação e tarefas atrasadas. Cada alerta possui ações diretas para resolver o problema com um clique.
                </p>
              </SectionCard>

              <SectionCard>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Tarefas na Agenda
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gerencie tarefas com status (Pendente, Em andamento, Concluída), prioridade e datas. Tarefas atrasadas geram alertas automáticos no painel de Inteligência Comercial.
                </p>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
