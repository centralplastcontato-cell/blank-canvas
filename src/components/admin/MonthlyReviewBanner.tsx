import { useState } from "react";
import { useMonthlyReview, type MonthlyMetrics } from "@/hooks/useMonthlyReview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, TrendingUp, TrendingDown, Users, PartyPopper,
  DollarSign, BarChart3, MessageSquare, CheckCircle2, Loader2, Sparkles
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

interface MonthlyReviewBannerProps {
  isAdmin?: boolean;
  unitSlug?: string;
  canViewRevenue?: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  previousValue,
  prefix = "",
  suffix = "",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  previousValue?: number;
  prefix?: string;
  suffix?: string;
}) {
  const diff = previousValue && previousValue > 0
    ? ((value - previousValue) / previousValue * 100)
    : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/40 hover:border-primary/20 hover:shadow-md transition-all duration-200 group">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="font-bold text-sm">
            {prefix}{typeof value === "number" ? value.toLocaleString("pt-BR") : value}{suffix}
          </p>
          {diff !== null && (
            <span className={`text-xs flex items-center gap-0.5 ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
              {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(diff).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MonthlyReviewBanner({ isAdmin = false, unitSlug, canViewRevenue = true }: MonthlyReviewBannerProps) {
  const { review, isLoading, isDismissed, dismiss, generateNow, showBanner } = useMonthlyReview(unitSlug);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) return null;

  // Show generate button for admin if no review exists
  if (!review && isAdmin) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Levantamento Mensal</p>
              <p className="text-xs text-muted-foreground">
                Gere o primeiro relatório automático do mês anterior
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              setIsGenerating(true);
              try {
                await generateNow();
                toast({ title: "Relatório gerado!", description: "O levantamento mensal foi criado com sucesso." });
              } catch {
                toast({ title: "Erro", description: "Falha ao gerar relatório.", variant: "destructive" });
              }
              setIsGenerating(false);
            }}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {isGenerating ? "Gerando..." : "Gerar Agora"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!showBanner || !review) return null;

  const metrics = review.metrics;
  const prev = review.previous_metrics;

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const reviewDate = new Date(review.review_month + "T12:00:00");
  const monthLabel = `${monthNames[reviewDate.getMonth()]}/${reviewDate.getFullYear()}`;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg shadow-primary/5 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">📊 Levantamento Mensal</h3>
                <Badge variant="secondary" className="text-xs">{monthLabel}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Resumo automático do desempenho do seu buffet
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MetricCard
              icon={Users}
              label="Leads Recebidos"
              value={metrics.total_leads}
              previousValue={prev?.total_leads}
            />
            <MetricCard
              icon={CheckCircle2}
              label="Vendas Fechadas"
              value={metrics.closed_leads}
              previousValue={prev?.closed_leads}
            />
            <MetricCard
              icon={BarChart3}
              label="Conversão"
              value={metrics.conversion_rate}
              previousValue={prev?.conversion_rate}
              suffix="%"
            />
            <MetricCard
              icon={PartyPopper}
              label="Festas"
              value={metrics.total_events}
              previousValue={prev?.total_events}
            />
            {canViewRevenue && (
              <MetricCard
                icon={DollarSign}
                label="Faturamento"
                value={metrics.total_revenue}
                previousValue={prev?.total_revenue}
                prefix="R$"
              />
            )}
            {canViewRevenue && (
              <MetricCard
                icon={DollarSign}
                label="Ticket Médio"
                value={metrics.avg_ticket}
                previousValue={prev?.avg_ticket}
                prefix="R$"
              />
            )}
            <MetricCard
              icon={MessageSquare}
              label="Conversas"
              value={metrics.total_conversations}
              previousValue={prev?.total_conversations}
            />
            <MetricCard
              icon={Users}
              label="Perdidos"
              value={metrics.lost_leads}
              previousValue={prev?.lost_leads}
            />
          </div>
        </div>

        {/* AI Summary - collapsible */}
        {review.ai_summary && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {showDetails ? "Ocultar análise da IA" : "Ver análise da IA"}
            </button>
            {showDetails && (
              <div className="mt-2 p-3 rounded-xl bg-background/80 border border-border/50 text-sm prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{review.ai_summary}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            O contexto da IA foi atualizado automaticamente com base nestes dados.
          </p>
          <Button size="sm" variant="outline" onClick={dismiss} className="shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Entendi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
