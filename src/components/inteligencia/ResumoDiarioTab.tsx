import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, CalendarCheck, FileText, Trophy, Clock,
  MessageCircle, PauseCircle, Sparkles, Loader2, RefreshCw,
  AlertTriangle, Phone, CalendarIcon,
} from "lucide-react";
import { useDailySummary, type DailyMetrics, type TimelineEvent, type IncompleteLead } from "@/hooks/useDailySummary";

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricsGrid({ metrics, incompleteCount }: { metrics: DailyMetrics; incompleteCount: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <MetricCard icon={Users} label="Leads novos" value={metrics.novos} color="bg-blue-500/10 text-blue-500" />
      <MetricCard icon={CalendarCheck} label="Visitas agendadas" value={metrics.visitas} color="bg-green-500/10 text-green-500" />
      <MetricCard icon={FileText} label="Orçamentos" value={metrics.orcamentos} color="bg-purple-500/10 text-purple-500" />
      <MetricCard icon={PauseCircle} label="Vão pensar" value={metrics.querPensar} color="bg-yellow-500/10 text-yellow-500" />
      <MetricCard icon={MessageCircle} label="Querem humano" value={metrics.querHumano} color="bg-orange-500/10 text-orange-500" />
      <MetricCard icon={Trophy} label="Taxa conversão" value={`${metrics.taxaConversao}%`} color="bg-emerald-500/10 text-emerald-500" />
      <MetricCard icon={AlertTriangle} label="Não completaram" value={incompleteCount} color="bg-destructive/10 text-destructive" />
    </div>
  );
}

function formatAction(event: TimelineEvent): string {
  const { action, oldValue, newValue, userName } = event;
  if (action === "status_change" && oldValue && newValue) {
    return `mudou de ${oldValue} para ${newValue}${userName ? ` (por ${userName})` : ""}`;
  }
  if (action === "bot_invalid_reply") return "enviou resposta inválida ao bot";
  if (action.includes("alerta") && action.includes("reminded")) return "sem resposta há mais de 2h — requer atenção";
  if (action.includes("follow")) return "recebeu follow-up";
  if (action === "transfer") return `foi transferido${newValue ? ` para ${newValue}` : ""}`;
  if (action === "next_step") return `escolheu próximo passo: ${newValue || "—"}`;
  return action.replace(/_/g, " ");
}

function getActionIcon(action: string) {
  if (action === "status_change") return "🔄";
  if (action === "bot_invalid_reply") return "⚠️";
  if (action.includes("alerta")) return "🚨";
  if (action.includes("follow")) return "📩";
  if (action === "transfer") return "↗️";
  if (action === "next_step") return "🎯";
  if (action.includes("return") || action.includes("retorn")) return "🔁";
  return "📌";
}

function isAlertEvent(action: string): boolean {
  return action.includes("alerta") || action === "bot_invalid_reply" || action.includes("follow");
}

function TimelineSection({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<"all" | "alerts">("all");

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum evento registrado neste dia
        </CardContent>
      </Card>
    );
  }

  const filteredEvents = filter === "all" ? events.filter(e => !isAlertEvent(e.action)) : events.filter(e => isAlertEvent(e.action));
  const alertCount = events.filter(e => isAlertEvent(e.action)).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Timeline do Dia
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 items-center rounded-md bg-muted p-0.5 text-muted-foreground">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-2.5 py-1 text-xs font-medium transition-all",
                  filter === "all" && "bg-background text-foreground shadow-sm"
                )}
              >
                Eventos ({events.filter(e => !isAlertEvent(e.action)).length})
              </button>
              <button
                onClick={() => setFilter("alerts")}
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-2.5 py-1 text-xs font-medium transition-all",
                  filter === "alerts" && "bg-background text-foreground shadow-sm"
                )}
              >
                Alertas ({alertCount})
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta neste dia</p>
        ) : filteredEvents.map((event) => (
          <div key={event.index} className="flex items-start gap-3 py-3 border-b last:border-b-0 border-border/50">
            <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
              {event.index}
            </span>
            <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5 w-11">
              {event.time}
            </span>
            <span className="text-sm shrink-0 mt-0.5">{getActionIcon(event.action)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <strong className="text-foreground">{event.leadName}</strong>{" "}
                <span className="text-muted-foreground">{formatAction(event)}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {event.botStep && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Etapa: {event.botStep}
                  </span>
                )}
                {event.proximoPasso && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    Escolheu: {event.proximoPasso}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        </CardContent>
    </Card>
  );
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

function IncompleteLeadsSection({ leads }: { leads: IncompleteLead[] }) {
  const navigate = useNavigate();

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          🎉 Todos os leads completaram o fluxo!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{lead.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {lead.botStep}
                </span>
                {lead.isReminded && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    Lembrete enviado
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {formatTimeAgo(lead.lastMessageAt)}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/atendimento?phone=${lead.whatsapp}`)}
              className="shrink-0 p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
            >
              <Phone className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ResumoDiarioTab() {
  const { data, isLoading, error, fetchSummary } = useDailySummary();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchSummary(selectedDate);
  }, [fetchSummary, selectedDate]);

  const incompleteCount = data?.incompleteLeads?.length || 0;
  const isViewingToday = isToday(selectedDate);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Picker Header */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2 font-medium", !isViewingToday && "border-primary text-primary")}>
              <CalendarIcon className="h-4 w-4" />
              {isViewingToday ? "Hoje" : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        {!isViewingToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())} className="text-xs">
            Voltar para hoje
          </Button>
        )}
        {data?.noData && (
          <Badge variant="secondary" className="text-xs">Sem dados para esta data</Badge>
        )}
        {data?.isHistorical && !data?.noData && (
          <Badge variant="outline" className="text-xs">Histórico salvo</Badge>
        )}
      </div>

      {data?.metrics && <MetricsGrid metrics={data.metrics} incompleteCount={incompleteCount} />}

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="nao-completaram">
            Não Completaram {incompleteCount > 0 && `(${incompleteCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          {/* AI Insight */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Insight da IA
                </CardTitle>
                {isViewingToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSummary(selectedDate)}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Atualizar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : data?.aiSummary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {data.aiSummary.split("\n").map((line, i) => (
                    <p key={i} className={line.trim() === "" ? "hidden" : "text-sm text-muted-foreground leading-relaxed"}>
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isViewingToday ? 'Clique em "Atualizar" para gerar o resumo da IA' : "Nenhum insight salvo para esta data"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          {data?.timeline && <TimelineSection events={data.timeline} />}
        </TabsContent>

        <TabsContent value="nao-completaram">
          <IncompleteLeadsSection leads={data?.incompleteLeads || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
