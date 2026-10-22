import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { HubLayout } from "@/components/hub/HubLayout";
import { HubCharts } from "@/components/admin/HubCharts";
import { HubDashboardFilters, DashboardFilters, getDefaultFilters } from "@/components/hub/HubDashboardFilters";
import { HubSalesFunnel } from "@/components/hub/HubSalesFunnel";
import { HubUnitRanking } from "@/components/hub/HubUnitRanking";
import { HubKpiCard, HubStatTile, type KpiDelta } from "@/components/hub/HubKpiCard";
import { HubCompanyCard } from "@/components/hub/HubCompanyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, MessageSquare, UserPlus,
  CheckCircle, XCircle, BarChart3, Percent, Timer,
  Send, ArrowUpRight, ArrowDownLeft, AlertTriangle, ChevronDown, Loader2,
} from "lucide-react";
import { HubDashboardMissingFunctionError, useHubDashboard } from "@/hooks/useHubDashboard";
import {
  countByStatus, formatMinutes, isIdle, percentDelta, pointsDelta, sumTotals,
} from "@/lib/hubDashboardMetrics";

export default function HubDashboard() {
  return (
    <HubLayout
      currentPage="hub"
      header={
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0" />
            <span className="truncate">Painel Celebrei</span>
          </h1>
          <p className="text-xs text-muted-foreground truncate">Visão consolidada de todas as empresas</p>
        </div>
      }
    >
      {() => <HubDashboardContent />}
    </HubLayout>
  );
}

function HubDashboardContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const empresaParam = searchParams.get("empresa");
  const [showIdle, setShowIdle] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    ...getDefaultFilters(),
    companyId: empresaParam,
  }));

  // ?empresa=<id> (vindo da busca rápida) controla o filtro de empresa
  useEffect(() => {
    setFilters(f => (f.companyId === empresaParam ? f : { ...f, companyId: empresaParam }));
  }, [empresaParam]);

  const handleFiltersChange = useCallback((next: DashboardFilters) => {
    setFilters(next);
    if (next.companyId !== empresaParam) {
      const params = new URLSearchParams(searchParams);
      if (next.companyId) params.set("empresa", next.companyId);
      else params.delete("empresa");
      setSearchParams(params, { replace: true });
    }
  }, [empresaParam, searchParams, setSearchParams]);

  const { data, error, isLoading, isFetching } = useHubDashboard(filters);

  const companies = useMemo(() => data?.companies ?? [], [data]);
  const totals = useMemo(() => sumTotals(companies), [companies]);
  const statusCounts = useMemo(() => countByStatus(data?.leadBuckets ?? []), [data]);
  const companyNames = useMemo(() => new Map(companies.map(c => [c.companyId, c.companyName])), [companies]);
  const activeCompanies = useMemo(
    () => companies.filter(c => !isIdle(c)).sort((a, b) => b.totalLeads - a.totalLeads),
    [companies]
  );
  const idleCompanies = useMemo(() => companies.filter(isIdle), [companies]);
  const followUpsByCompany = useMemo(() => new Map(companies.map(c => [c.companyId, c.followUps])), [companies]);
  const closedByCompany = useMemo(() => new Map(companies.map(c => [c.companyId, c.leadsClosed])), [companies]);

  if (error instanceof HubDashboardMissingFunctionError) {
    return (
      <Card className="max-w-xl mx-auto mt-8 border-amber-500/40">
        <CardContent className="p-6 space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Falta atualizar o banco
          </p>
          <p className="text-sm text-muted-foreground">
            O Painel agora faz as contas direto no banco. Rode no SQL Editor do Supabase o arquivo{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">supabase/migrations/20261022030000_hub_painel_metricas.sql</code>{" "}
            e recarregue esta página.
          </p>
        </CardContent>
      </Card>
    );
  }

  const previous = data?.previous ?? { leads: 0, closed: 0 };
  const conversion = totals.leads > 0 ? (totals.closed / totals.leads) * 100 : 0;
  const previousConversion = previous.leads > 0 ? (previous.closed / previous.leads) * 100 : null;
  const response = data?.response ?? { medianMinutes: null, samples: 0 };

  const periodDays = Math.max(1, Math.round((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / 86400000));
  const comparisonCaption = `vs. ${periodDays} dias anteriores`;
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  const heroCards: { title: string; value: string | number; icon: typeof Users; accent: string; delta?: KpiDelta | null; caption?: string; hint?: string }[] = [
    {
      title: "Leads no período",
      value: fmt(totals.leads),
      icon: Users,
      accent: "bg-primary/10 text-primary",
      delta: percentDelta(totals.leads, previous.leads),
      caption: comparisonCaption,
    },
    {
      title: "Festas fechadas",
      value: fmt(totals.closed),
      icon: CheckCircle,
      accent: "bg-emerald-500/10 text-emerald-600",
      delta: percentDelta(totals.closed, previous.closed),
      caption: comparisonCaption,
      hint: "Eventos com data de fechamento da venda dentro do período.",
    },
    {
      title: "Conversão",
      value: `${conversion.toFixed(1).replace(".", ",")}%`,
      icon: Percent,
      accent: "bg-violet-500/10 text-violet-600",
      delta: previousConversion === null ? null : pointsDelta(conversion, previousConversion),
      caption: comparisonCaption,
      hint: "Festas fechadas ÷ leads que chegaram no período.",
    },
    {
      title: "1ª resposta da equipe",
      value: response.medianMinutes === null ? "—" : formatMinutes(response.medianMinutes),
      icon: Timer,
      accent: "bg-amber-500/10 text-amber-600",
      caption: response.samples > 0 ? `mediana de ${fmt(response.samples)} conversas` : "sem respostas da equipe",
      hint: "Tempo entre a abertura da conversa e a primeira mensagem enviada por uma pessoa da equipe (pela plataforma ou pelo celular). Robô, IA e lembretes automáticos não contam. Usa as 100 conversas mais recentes do período de cada empresa.",
    },
  ];

  const secondaryStats = [
    { label: "Leads hoje", value: fmt(totals.leadsToday), icon: UserPlus },
    { label: "Perdidos", value: fmt(totals.lost), icon: XCircle },
    { label: "Conversas ativas", value: fmt(totals.activeConversations), icon: MessageSquare },
    { label: "Follow-ups", value: fmt(totals.followUps), icon: Send },
    { label: "Msgs enviadas", value: fmt(totals.messagesSent), icon: ArrowUpRight },
    { label: "Msgs recebidas", value: fmt(totals.messagesReceived), icon: ArrowDownLeft },
  ];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <HubDashboardFilters
            companies={data?.companiesAll ?? []}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
        {isFetching && !isLoading && <Loader2 className="h-4 w-4 mt-2 animate-spin text-muted-foreground shrink-0" />}
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Não foi possível carregar o Painel agora. Tente de novo em instantes.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-4" /><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-4 w-28" /></CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[62px] rounded-xl" />)}
          </div>
        </>
      ) : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {heroCards.map(card => <HubKpiCard key={card.title} {...card} />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {secondaryStats.map(s => <HubStatTile key={s.label} {...s} />)}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <HubSalesFunnel statusCounts={statusCounts} />
            <HubUnitRanking
              metrics={activeCompanies}
              followUpsByCompany={followUpsByCompany}
              closedByCompany={closedByCompany}
            />
          </div>

          <HubCharts buckets={data.leadBuckets} companyNames={companyNames} isLoading={false} />
        </>
      )}

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Por Empresa
          <span className="text-xs font-normal text-muted-foreground">· números do período</span>
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map(i => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeCompanies.map(m => <HubCompanyCard key={m.companyId} metrics={m} />)}
            </div>
            {idleCompanies.length > 0 && (
              <div className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowIdle(v => !v)}
                >
                  <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showIdle ? "rotate-180" : ""}`} />
                  {idleCompanies.length} {idleCompanies.length === 1 ? "empresa" : "empresas"} sem movimento no período
                </Button>
                {showIdle && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {idleCompanies.map(c => (
                      <span key={c.companyId} className="text-xs rounded-full border px-3 py-1 text-muted-foreground">
                        {c.companyName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
