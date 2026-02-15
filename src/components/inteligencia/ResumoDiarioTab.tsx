import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, CalendarCheck, FileText, Trophy, Clock,
  MessageCircle, PauseCircle, Sparkles, Loader2, RefreshCw,
  AlertTriangle, Phone, CalendarIcon, MessageSquarePlus, Save, Pencil,
  Timer,
} from "lucide-react";
import { useDailySummary, type DailyMetrics, type TimelineEvent, type IncompleteLead, type FollowUpLead } from "@/hooks/useDailySummary";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

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

function MetricsGrid({ metrics, incompleteCount, followUpLabels }: { metrics: DailyMetrics; incompleteCount: number; followUpLabels?: { fu1: string; fu2: string } }) {
  const fu1Label = followUpLabels?.fu1 || "24h";
  const fu2Label = followUpLabels?.fu2 || "48h";
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
      <MetricCard icon={Users} label="Leads novos" value={metrics.novos} color="bg-blue-500/10 text-blue-500" />
      <MetricCard icon={CalendarCheck} label="Visitas agendadas" value={metrics.visitas} color="bg-green-500/10 text-green-500" />
      <MetricCard icon={FileText} label="Orçamentos" value={metrics.orcamentos} color="bg-purple-500/10 text-purple-500" />
      <MetricCard icon={PauseCircle} label="Vão pensar" value={metrics.querPensar} color="bg-yellow-500/10 text-yellow-500" />
      <MetricCard icon={MessageCircle} label="Querem humano" value={metrics.querHumano} color="bg-orange-500/10 text-orange-500" />
      <MetricCard icon={Trophy} label="Taxa conversão" value={`${metrics.taxaConversao}%`} color="bg-emerald-500/10 text-emerald-500" />
      <MetricCard icon={AlertTriangle} label="Não completaram" value={incompleteCount} color="bg-destructive/10 text-destructive" />
      <MetricCard icon={Timer} label={`Follow-up ${fu1Label}`} value={metrics.followUp24h || 0} color="bg-sky-500/10 text-sky-500" />
      <MetricCard icon={Timer} label={`Follow-up ${fu2Label}`} value={metrics.followUp48h || 0} color="bg-indigo-500/10 text-indigo-500" />
    </div>
  );
}

function formatAction(event: TimelineEvent): string {
  const { action, oldValue, newValue, userName } = event;
  if (action === "lead_created") return "novo lead recebido";
  if (action === "status_change" && oldValue && newValue) {
    return `mudou de ${oldValue} para ${newValue}${userName ? ` (por ${userName})` : ""}`;
  }
  if (action === "bot_invalid_reply") return "enviou resposta inválida ao bot";
  if (action.includes("alerta") && action.includes("reminded")) return "sem resposta há mais de 2h — requer atenção";
  if (action.includes("follow")) return "recebeu follow-up";
  if (action === "transfer") return `foi transferido${newValue ? ` para ${newValue}` : ""}`;
  if (action === "next_step") return `escolheu próximo passo: ${newValue || "—"}`;
  if (action === "Próximo passo escolhido" || action === "Proximo passo escolhido") return `escolheu próximo passo: ${newValue || "—"}`;
  return action.replace(/_/g, " ");
}

function getActionIcon(action: string) {
  if (action === "lead_created") return "🆕";
  if (action === "status_change") return "🔄";
  if (action === "bot_invalid_reply") return "⚠️";
  if (action.includes("alerta")) return "🚨";
  if (action.includes("follow")) return "📩";
  if (action === "transfer") return "↗️";
  if (action === "next_step" || action.toLowerCase().includes("próximo passo") || action.toLowerCase().includes("proximo passo")) return "🎯";
  if (action.includes("return") || action.includes("retorn")) return "🔁";
  return "📌";
}

function isAlertEvent(action: string): boolean {
  return action.includes("alerta") || action === "bot_invalid_reply" || action.includes("follow") || (action.includes("reminded") && !action.includes("proximo_passo"));
}

function TimelineSection({ events }: { events: TimelineEvent[] }) {
  const navigate = useNavigate();
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
        ) : filteredEvents.map((event, idx) => (
          <div key={`${event.leadId}-${idx}`} className="flex items-start gap-3 py-3 border-b last:border-b-0 border-border/50">
            <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5 w-11">
              {event.time}
            </span>
            <span className="text-sm shrink-0 mt-0.5">{getActionIcon(event.action)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <a
                  href={`/atendimento?leadId=${event.leadId}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/atendimento?leadId=${event.leadId}`); }}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  {event.leadName}
                </a>{" "}
                <span className="text-muted-foreground">{formatAction(event)}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {event.botStep && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Etapa: {event.botStep === 'proximo_passo_reminded' ? 'Aguardando resposta' : event.botStep === 'proximo_passo' ? 'Escolhendo próximo passo' : event.botStep}
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
                {lead.isReminded && !lead.botStep.toLowerCase().includes('lembrete') && !lead.botStep.toLowerCase().includes('reminded') && !lead.botStep.toLowerCase().includes('aguardando resposta') && (
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

function FollowUpLeadsSection({ leads }: { leads: FollowUpLead[] }) {
  const navigate = useNavigate();


  // Group leads by tipo dynamically
  const groupedByTipo = new Map<string, FollowUpLead[]>();
  for (const lead of leads) {
    const existing = groupedByTipo.get(lead.tipo) || [];
    existing.push(lead);
    groupedByTipo.set(lead.tipo, existing);
  }

  const badgeColors: Record<number, string> = {
    0: "bg-sky-500/10 text-sky-600 border-sky-200",
    1: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    2: "bg-violet-500/10 text-violet-600 border-violet-200",
  };

  const renderGroup = (title: string, groupLeads: FollowUpLead[], badgeColor: string) => {
    if (groupLeads.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{title} ({groupLeads.length})</h3>
        {groupLeads.map((lead, i) => (
          <Card key={`${lead.leadId}-${i}`}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                <Timer className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{lead.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge className={badgeColor}>{lead.tipo}</Badge>
                  <span className="text-[11px] text-muted-foreground">às {lead.time}</span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/atendimento?leadId=${lead.leadId}`)}
                className="shrink-0 p-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
              >
                <Phone className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum follow-up enviado neste dia
        </CardContent>
      </Card>
    );
  }

  // Sort groups by numeric value of the tipo label
  const sortedGroups = [...groupedByTipo.entries()].sort((a, b) => {
    const numA = parseInt(a[0]) || 999;
    const numB = parseInt(b[0]) || 999;
    return numA - numB;
  });

  return (
    <div className="space-y-6">
      {sortedGroups.map(([tipo, groupLeads], idx) => 
        renderGroup(`Follow-up ${tipo}`, groupLeads, badgeColors[idx] || badgeColors[2])
      )}
    </div>
  );
}

function TeamNoteSection({ note, summaryDate, companyId, onSaved }: {
  note: string | null | undefined;
  summaryDate: string;
  companyId: string;
  onSaved: (text: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(note || "");
  }, [note]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("daily_summaries")
        .upsert(
          { company_id: companyId, summary_date: summaryDate, user_note: text.trim() || null } as any,
          { onConflict: "company_id,summary_date" }
        );
      if (error) throw error;
      toast.success("Observação salva!");
      onSaved(text.trim());
      setIsEditing(false);
    } catch (e) {
      toast.error("Erro ao salvar observação");
    } finally {
      setIsSaving(false);
    }
  };

  const hasNote = !!note?.trim();

  if (!isEditing && !hasNote) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center justify-center">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setIsEditing(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            Adicionar observação do time
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isEditing && hasNote) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <MessageSquarePlus className="h-4 w-4" />
              Observação do Time
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{note}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <MessageSquarePlus className="h-4 w-4" />
          Observação do Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Ex: Hoje por ser sábado o atendimento foi até o meio dia..."
          className="resize-none text-sm"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{text.length}/500</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setText(note || ""); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResumoDiarioTab() {
  const { currentCompany } = useCompany();
  const { data, isLoading, error, fetchSummary } = useDailySummary();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localNote, setLocalNote] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary(selectedDate);
  }, [fetchSummary, selectedDate]);

  useEffect(() => {
    setLocalNote(data?.userNote || null);
  }, [data?.userNote]);

  const incompleteCount = data?.incompleteLeads?.length || 0;
  const isViewingToday = isToday(selectedDate);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
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

      {data?.metrics && <MetricsGrid metrics={data.metrics} incompleteCount={incompleteCount} followUpLabels={data?.followUpLabels} />}

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="nao-completaram">
            Não Completaram {incompleteCount > 0 && `(${incompleteCount})`}
          </TabsTrigger>
          <TabsTrigger value="follow-ups">
            Follow-ups {((data?.metrics?.followUp24h || 0) + (data?.metrics?.followUp48h || 0)) > 0 && `(${(data?.metrics?.followUp24h || 0) + (data?.metrics?.followUp48h || 0)})`}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSummary(selectedDate, true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {isViewingToday ? "Atualizar" : "Regerar"}
                </Button>
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

          {/* Team Note */}
          {currentCompany?.id && (
            <TeamNoteSection
              note={localNote}
              summaryDate={format(selectedDate, "yyyy-MM-dd")}
              companyId={currentCompany.id}
              onSaved={(text) => setLocalNote(text || null)}
            />
          )}

          {/* Timeline */}
          {data?.timeline && <TimelineSection events={data.timeline} />}
        </TabsContent>

        <TabsContent value="nao-completaram">
          <IncompleteLeadsSection leads={data?.incompleteLeads || []} />
        </TabsContent>

        <TabsContent value="follow-ups">
          <FollowUpLeadsSection leads={data?.followUpLeads || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
