import {
  CalendarDays, ListChecks, MapPin, Clock, Plus, Repeat, Eye,
  CheckCircle, AlertTriangle, Handshake, CalendarClock, FileText, Users
} from "lucide-react";
import { GuiaDialogBase, SectionCard, FeatureItem, SmartTip, type GuiaTab } from "./GuiaDialogBase";

const tabs: GuiaTab[] = [
  {
    value: "calendario",
    label: "Calendário",
    icon: CalendarDays,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Calendário de Eventos
          </h3>
          <p className="text-xs text-muted-foreground">
            Visualize todas as festas, visitas e compromissos em formato de calendário ou lista. 
            Use os filtros de período e unidade para focar no que importa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Eye} iconColor="bg-blue-100 text-blue-600" title="Visão Calendário" description="Navegue por mês com cores por status: verde (fechada), azul (agendada), âmbar (pré-reserva)" />
            <FeatureItem icon={ListChecks} iconColor="bg-emerald-100 text-emerald-600" title="Visão Lista" description="Veja todos os eventos em formato lista com detalhes rápidos e ações" />
            <FeatureItem icon={Plus} iconColor="bg-primary/15 text-primary" title="Novo Evento" description="Crie festas com pacotes, opcionais, valores e dados do cliente" />
            <FeatureItem icon={FileText} iconColor="bg-amber-100 text-amber-600" title="Relatórios" description="Exporte agenda e fichas de festa em PDF ou Excel" />
          </div>
        </SectionCard>
        <SmartTip>Clique em qualquer dia do calendário para criar um evento naquela data rapidamente.</SmartTip>
      </>
    ),
  },
  {
    value: "status",
    label: "Status",
    icon: CheckCircle,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" /> Status dos Eventos
          </h3>
          <p className="text-xs text-muted-foreground">
            Cada evento possui um status que reflete seu estágio no funil comercial.
          </p>
          <div className="space-y-2">
            <FeatureItem icon={Clock} iconColor="bg-blue-100 text-blue-600" title="Agendada" description="Festa com data confirmada, aguardando o dia do evento" />
            <FeatureItem icon={Handshake} iconColor="bg-emerald-100 text-emerald-600" title="Fechada" description="Venda concluída com contrato e/ou pagamento confirmado" />
            <FeatureItem icon={CalendarClock} iconColor="bg-amber-100 text-amber-600" title="Pré-reserva" description="Data bloqueada provisoriamente, com prazo de expiração automático" />
            <FeatureItem icon={AlertTriangle} iconColor="bg-red-100 text-red-600" title="Cancelada" description="Evento cancelado, removido da agenda ativa" />
          </div>
        </SectionCard>
        <SmartTip>Pré-reservas expiram automaticamente. Configure o prazo nas configurações da empresa.</SmartTip>
      </>
    ),
  },
  {
    value: "tarefas",
    label: "Tarefas",
    icon: ListChecks,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Gestão de Tarefas
          </h3>
          <p className="text-xs text-muted-foreground">
            Organize a operação do buffet com tarefas categorizadas e prioridades claras.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={CheckCircle} iconColor="bg-emerald-100 text-emerald-600" title="3 Status" description="Pendente → Em andamento → Concluída, com transição visual por select" />
            <FeatureItem icon={AlertTriangle} iconColor="bg-red-100 text-red-600" title="Alertas de Atraso" description="Banner automático para tarefas vencidas com contagem" />
            <FeatureItem icon={Repeat} iconColor="bg-primary/15 text-primary" title="Tarefas Recorrentes" description="Configure rotinas diárias, semanais ou mensais automaticamente" />
            <FeatureItem icon={Users} iconColor="bg-blue-100 text-blue-600" title="Categorias" description="11 categorias: Compras, Manutenção, Financeiro, Equipe e mais" />
          </div>
        </SectionCard>
        <SmartTip>Use tarefas recorrentes para rotinas como limpeza semanal, compras mensais ou reuniões de equipe.</SmartTip>
      </>
    ),
  },
  {
    value: "visitas",
    label: "Visitas",
    icon: MapPin,
    content: (
      <>
        <SectionCard>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Gestão de Visitas
          </h3>
          <p className="text-xs text-muted-foreground">
            Acompanhe visitas presenciais — o fator decisivo para fechar vendas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem icon={Plus} iconColor="bg-primary/15 text-primary" title="Agendar Visita" description="Registre visitas com data, horário, canal de origem e nível de interesse" />
            <FeatureItem icon={CheckCircle} iconColor="bg-emerald-100 text-emerald-600" title="Fechou na Visita 🎉" description="Converta lead, registre venda e notas em uma ação" />
            <FeatureItem icon={Eye} iconColor="bg-blue-100 text-blue-600" title="Status de Visita" description="Agendada, Realizada, Cancelada ou Não compareceu" />
            <FeatureItem icon={CalendarDays} iconColor="bg-amber-100 text-amber-600" title="Integração CRM" description="Visitas sincronizam com o chat do WhatsApp automaticamente" />
          </div>
        </SectionCard>
        <SmartTip>A funcionalidade "Fechou na Visita" economiza tempo convertendo o lead direto do card da visita.</SmartTip>
      </>
    ),
  },
];

export function GuiaAgendaDialog() {
  return (
    <GuiaDialogBase
      title="Guia da Central de Agenda"
      subtitle="Eventos, tarefas, visitas e pré-reservas em um só lugar"
      icon={CalendarDays}
      tabs={tabs}
    />
  );
}
