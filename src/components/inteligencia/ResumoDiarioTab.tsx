import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, CalendarCheck, FileText, Trophy, Brain, Clock,
  MessageCircle, PauseCircle, Sparkles, Loader2, RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useDailySummary, type DailyMetrics, type TimelineEvent } from "@/hooks/useDailySummary";

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

function MetricsGrid({ metrics }: { metrics: DailyMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard icon={Users} label="Leads novos" value={metrics.novos} color="bg-blue-500/10 text-blue-500" />
      <MetricCard icon={CalendarCheck} label="Visitas agendadas" value={metrics.visitas} color="bg-green-500/10 text-green-500" />
      <MetricCard icon={FileText} label="Orçamentos" value={metrics.orcamentos} color="bg-purple-500/10 text-purple-500" />
      <MetricCard icon={PauseCircle} label="Vão pensar" value={metrics.querPensar} color="bg-yellow-500/10 text-yellow-500" />
      <MetricCard icon={MessageCircle} label="Querem humano" value={metrics.querHumano} color="bg-orange-500/10 text-orange-500" />
      <MetricCard icon={Trophy} label="Taxa conversão" value={`${metrics.taxaConversao}%`} color="bg-emerald-500/10 text-emerald-500" />
    </div>
  );
}

function formatAction(event: TimelineEvent): string {
  const { action, oldValue, newValue, userName } = event;
  if (action === "status_change" && oldValue && newValue) {
    return `mudou de ${oldValue} para ${newValue}${userName ? ` (por ${userName})` : ""}`;
  }
  if (action === "bot_invalid_reply") return "enviou resposta inválida ao bot";
  if (action.includes("follow")) return "recebeu follow-up";
  if (action === "transfer") return `foi transferido${newValue ? ` para ${newValue}` : ""}`;
  if (action === "next_step") return `escolheu próximo passo: ${newValue || "—"}`;
  return action.replace(/_/g, " ");
}

function getActionIcon(action: string) {
  if (action === "status_change") return "🔄";
  if (action === "bot_invalid_reply") return "⚠️";
  if (action.includes("follow")) return "📩";
  if (action === "transfer") return "↗️";
  if (action === "next_step") return "🎯";
  if (action.includes("return") || action.includes("retorn")) return "🔁";
  return "📌";
}

function TimelineSection({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum evento registrado hoje
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Timeline do Dia
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {events.length} evento{events.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {events.map((event) => (
          <div key={event.index} className="flex items-start gap-3 py-3 border-b last:border-b-0 border-border/50">
            {/* Number */}
            <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
              {event.index}
            </span>
            {/* Time */}
            <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5 w-11">
              {event.time}
            </span>
            {/* Icon */}
            <span className="text-sm shrink-0 mt-0.5">{getActionIcon(event.action)}</span>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <strong className="text-foreground">{event.leadName}</strong>{" "}
                <span className="text-muted-foreground">{formatAction(event)}</span>
              </p>
              {/* Bot step & próximo passo badges */}
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

export function ResumoDiarioTab() {
  const { data, isLoading, error, fetchSummary } = useDailySummary();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
      {/* Metrics */}
      {data?.metrics && <MetricsGrid metrics={data.metrics} />}

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
              onClick={fetchSummary}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
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
              Clique em "Atualizar" para gerar o resumo da IA
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {data?.timeline && <TimelineSection events={data.timeline} />}
    </div>
  );
}
