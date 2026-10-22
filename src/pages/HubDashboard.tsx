import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { HubCharts } from "@/components/admin/HubCharts";
import { HubDashboardFilters, DashboardFilters, getDefaultFilters } from "@/components/hub/HubDashboardFilters";
import { HubSalesFunnel } from "@/components/hub/HubSalesFunnel";
import { HubUnitRanking } from "@/components/hub/HubUnitRanking";
import { HubKpiCard, HubStatTile, type KpiDelta } from "@/components/hub/HubKpiCard";
import { HubCompanyCard } from "@/components/hub/HubCompanyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, MessageSquare, UserPlus,
  CheckCircle, XCircle, BarChart3, Percent, Timer,
  Send, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import {
  buildPeriodMetrics, computePreviousRange, type CompanyPeriodMetrics, formatMinutes, inRange, median, percentDelta, pointsDelta,
} from "@/lib/hubDashboardMetrics";

interface LeadRecord {
  company_id: string;
  company_name: string;
  status: string;
  created_at: string;
}

interface ConvoRecord {
  id: string;
  company_id: string;
  created_at: string;
  is_closed: boolean;
}

interface FollowUpRecord {
  company_id: string;
  created_at: string;
}

interface ClosedEventRecord {
  company_id: string;
  data_fechamento_venda: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  whatsappStatus: "connected" | "disconnected" | "unknown";
  whatsappPhone: string | null;
}

interface ResponseSample {
  company_id: string;
  minutes: number;
}

// Batch loader: busca todas as linhas em blocos de 1000
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(query: any): Promise<T[]> {
  const results: T[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await query.range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return results;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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
      {({ user }) => <HubDashboardContent userId={user.id} />}
    </HubLayout>
  );
}

function HubDashboardContent({ userId }: { userId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const empresaParam = searchParams.get("empresa");

  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [allLeadRecords, setAllLeadRecords] = useState<LeadRecord[]>([]);
  const [allConvoRecords, setAllConvoRecords] = useState<ConvoRecord[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<FollowUpRecord[]>([]);
  const [allClosedEvents, setAllClosedEvents] = useState<ClosedEventRecord[]>([]);
  const [messagesSent, setMessagesSent] = useState<number | null>(null);
  const [messagesReceived, setMessagesReceived] = useState<number | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [responseSamples, setResponseSamples] = useState<ResponseSample[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
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

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const { data: allCompanies } = await supabase
          .from("companies").select("id, name, logo_url, parent_id").order("name");
        if (!allCompanies) return;

        const childCompanies = allCompanies.filter(c => c.parent_id !== null);
        const targetCompanies = childCompanies.length > 0 ? childCompanies : allCompanies;
        const companyIds = targetCompanies.map(c => c.id);
        const nameById = new Map(targetCompanies.map(c => [c.id, c.name]));

        const [allLeads, allConvos, followUpsRaw, closedEventsRaw, { data: allInstances }] = await Promise.all([
          fetchAll<{ status: string; created_at: string; company_id: string }>(supabase.from("campaign_leads").select("id, status, created_at, company_id").in("company_id", companyIds)),
          fetchAll<{ id: string; is_closed: boolean | null; created_at: string; company_id: string }>(supabase.from("wapi_conversations").select("id, is_closed, created_at, company_id").in("company_id", companyIds)),
          fetchAll<FollowUpRecord>(
            supabase.from("lead_history").select("company_id, created_at")
              .ilike("action", "Follow-up%").in("company_id", companyIds)
          ),
          fetchAll<ClosedEventRecord>(
            supabase.from("company_events").select("company_id, data_fechamento_venda")
              .in("company_id", companyIds).not("data_fechamento_venda", "is", null)
          ),
          supabase.from("wapi_instances").select("status, phone_number, company_id, connected_at")
            .in("company_id", companyIds).order("connected_at", { ascending: false }),
        ]);

        // Instância mais recente por empresa
        const instanceMap = new Map<string, { status: string; phone_number: string | null }>();
        (allInstances || []).forEach(inst => {
          if (!instanceMap.has(inst.company_id)) {
            instanceMap.set(inst.company_id, { status: inst.status, phone_number: inst.phone_number });
          }
        });

        setCompanies(targetCompanies.map(c => {
          const instance = instanceMap.get(c.id);
          return {
            id: c.id,
            name: c.name,
            logoUrl: c.logo_url,
            whatsappStatus: instance?.status === "open" || instance?.status === "connected"
              ? "connected" : instance ? "disconnected" : "unknown",
            whatsappPhone: instance?.phone_number || null,
          };
        }));
        setAllLeadRecords(allLeads.map(l => ({
          company_id: l.company_id, company_name: nameById.get(l.company_id) || "", status: l.status, created_at: l.created_at,
        })));
        setAllConvoRecords(allConvos.map(c => ({
          id: c.id, company_id: c.company_id, created_at: c.created_at, is_closed: !!c.is_closed,
        })));
        setAllFollowUps(followUpsRaw.filter(f => f.company_id));
        setAllClosedEvents(closedEventsRaw.filter(e => e.company_id && e.data_fechamento_venda));
      } catch (err) {
        console.error("Error fetching hub metrics:", err);
      }
      setIsLoadingMetrics(false);
    };
    fetchMetrics();
  }, [userId]);

  const companyIdsInScope = useMemo(
    () => (filters.companyId ? [filters.companyId] : companies.map(c => c.id)),
    [filters.companyId, companies]
  );

  // Mensagens enviadas/recebidas: uma contagem por empresa (consultas menores não estouram o tempo
  // limite do banco). Se alguma falhar, mostramos "—" em vez de um 0 enganoso.
  useEffect(() => {
    if (companyIdsInScope.length === 0) return;
    let cancelled = false;
    const fetchMessageCounts = async () => {
      setIsLoadingMessages(true);
      const fromISO = filters.dateRange.from.toISOString();
      const toISO = filters.dateRange.to.toISOString();
      const countFor = (companyId: string, fromMe: boolean) =>
        supabase
          .from("wapi_messages")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("from_me", fromMe)
          .gte("created_at", fromISO)
          .lte("created_at", toISO)
          .then(({ count, error }) => (error || count === null ? null : count));

      const sum = (values: (number | null)[]) =>
        values.some(v => v === null) ? null : values.reduce<number>((a, v) => a + (v as number), 0);

      const [sent, received] = await Promise.all([
        Promise.all(companyIdsInScope.map(id => countFor(id, true))),
        Promise.all(companyIdsInScope.map(id => countFor(id, false))),
      ]);
      if (cancelled) return;
      setMessagesSent(sum(sent));
      setMessagesReceived(sum(received));
      setIsLoadingMessages(false);
    };
    fetchMessageCounts();
    return () => { cancelled = true; };
  }, [companyIdsInScope, filters.dateRange.from, filters.dateRange.to]);

  // Conversas filtradas por data + empresa (status não se aplica a conversas)
  const filteredConvos = useMemo(() => {
    return allConvoRecords.filter(c =>
      inRange(c.created_at, filters.dateRange) &&
      (!filters.companyId || c.company_id === filters.companyId)
    );
  }, [allConvoRecords, filters.dateRange, filters.companyId]);

  // Tempo de resposta: amostra das conversas mais recentes do período (até 30 por empresa),
  // da criação da conversa até a primeira mensagem enviada por nós.
  useEffect(() => {
    if (isLoadingMetrics) return;
    let cancelled = false;
    const fetchResponseTimes = async () => {
      setIsLoadingResponse(true);
      const byCompany = new Map<string, ConvoRecord[]>();
      [...filteredConvos]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .forEach(c => {
          const arr = byCompany.get(c.company_id) || [];
          if (arr.length < 30) arr.push(c);
          byCompany.set(c.company_id, arr);
        });
      const sample = [...byCompany.values()].flat();
      const createdById = new Map(sample.map(c => [c.id, c]));

      const firstReply = new Map<string, string>();
      await Promise.all(chunk(sample, 10).map(async group => {
        const { data } = await supabase
          .from("wapi_messages")
          .select("conversation_id, timestamp, created_at")
          .in("conversation_id", group.map(c => c.id))
          .eq("from_me", true)
          .order("timestamp", { ascending: true })
          .limit(1000);
        (data || []).forEach(m => {
          if (!firstReply.has(m.conversation_id)) firstReply.set(m.conversation_id, m.timestamp || m.created_at);
        });
      }));
      if (cancelled) return;

      const samples: ResponseSample[] = [];
      firstReply.forEach((replyAt, convoId) => {
        const convo = createdById.get(convoId);
        if (!convo) return;
        const minutes = (new Date(replyAt).getTime() - new Date(convo.created_at).getTime()) / 60000;
        // Descarta anomalias (negativo ou mais de 30 dias)
        if (minutes >= 0 && minutes < 30 * 24 * 60) samples.push({ company_id: convo.company_id, minutes });
      });
      setResponseSamples(samples);
      setIsLoadingResponse(false);
    };
    fetchResponseTimes();
    return () => { cancelled = true; };
  }, [filteredConvos, isLoadingMetrics]);

  const previousRange = useMemo(() => computePreviousRange(filters.dateRange), [filters.dateRange]);

  const matchesScope = useCallback(
    (r: { company_id: string }) => !filters.companyId || r.company_id === filters.companyId,
    [filters.companyId]
  );

  const filteredLeads = useMemo(() => allLeadRecords.filter(l =>
    inRange(l.created_at, filters.dateRange) && matchesScope(l) && (!filters.status || l.status === filters.status)
  ), [allLeadRecords, filters, matchesScope]);

  const previousLeads = useMemo(() => allLeadRecords.filter(l =>
    inRange(l.created_at, previousRange) && matchesScope(l) && (!filters.status || l.status === filters.status)
  ), [allLeadRecords, previousRange, filters.status, matchesScope]);

  const filteredFollowUps = useMemo(
    () => allFollowUps.filter(f => inRange(f.created_at, filters.dateRange) && matchesScope(f)),
    [allFollowUps, filters.dateRange, matchesScope]
  );

  // Festas fechadas (data_fechamento_venda é uma data, sem hora)
  const closedIn = useCallback((range: { from: Date; to: Date }) => {
    const fromYMD = range.from.toISOString().slice(0, 10);
    const toYMD = range.to.toISOString().slice(0, 10);
    return allClosedEvents.filter(e => {
      const ymd = e.data_fechamento_venda.slice(0, 10);
      return ymd >= fromYMD && ymd <= toYMD && matchesScope(e);
    });
  }, [allClosedEvents, matchesScope]);

  const filteredClosedEvents = useMemo(() => closedIn(filters.dateRange), [closedIn, filters.dateRange]);
  const previousClosedEvents = useMemo(() => closedIn(previousRange), [closedIn, previousRange]);

  const todayISO = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toISOString();
  }, []);

  const scopedCompanies = useMemo(
    () => companies.filter(c => !filters.companyId || c.id === filters.companyId),
    [companies, filters.companyId]
  );

  // Métricas por empresa, sempre dentro do período selecionado
  const periodMetrics: CompanyPeriodMetrics[] = useMemo(() => buildPeriodMetrics({
    companies: scopedCompanies,
    leads: filteredLeads,
    convos: filteredConvos,
    followUps: filteredFollowUps,
    closedEvents: filteredClosedEvents,
    responseSamples,
    todayISO,
  }), [scopedCompanies, filteredLeads, filteredConvos, filteredFollowUps, filteredClosedEvents, responseSamples, todayISO]);

  const followUpsByCompany = useMemo(
    () => new Map(periodMetrics.map(m => [m.companyId, m.followUps])),
    [periodMetrics]
  );
  const closedByCompany = useMemo(
    () => new Map(periodMetrics.map(m => [m.companyId, m.leadsClosed])),
    [periodMetrics]
  );

  const totals = useMemo(() => ({
    leads: filteredLeads.length,
    leadsToday: filteredLeads.filter(l => l.created_at >= todayISO).length,
    closed: filteredClosedEvents.length,
    lost: filteredLeads.filter(l => l.status === "perdido").length,
    activeConversations: filteredConvos.filter(c => !c.is_closed).length,
  }), [filteredLeads, filteredConvos, filteredClosedEvents, todayISO]);

  const conversion = totals.leads > 0 ? (totals.closed / totals.leads) * 100 : 0;
  const previousConversion = previousLeads.length > 0 ? (previousClosedEvents.length / previousLeads.length) * 100 : null;

  const responseMedian = useMemo(() => median(responseSamples.map(s => s.minutes)), [responseSamples]);

  const periodDays = Math.max(1, Math.round((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / 86400000));
  const comparisonCaption = `vs. ${periodDays} dias anteriores`;

  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR"));

  const heroCards: { title: string; value: string | number; icon: typeof Users; accent: string; delta?: KpiDelta | null; caption?: string; hint?: string }[] = [
    {
      title: "Leads no período",
      value: totals.leads.toLocaleString("pt-BR"),
      icon: Users,
      accent: "bg-primary/10 text-primary",
      delta: percentDelta(totals.leads, previousLeads.length),
      caption: comparisonCaption,
    },
    {
      title: "Festas fechadas",
      value: totals.closed.toLocaleString("pt-BR"),
      icon: CheckCircle,
      accent: "bg-emerald-500/10 text-emerald-600",
      delta: percentDelta(totals.closed, previousClosedEvents.length),
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
      title: "1ª resposta",
      value: isLoadingResponse ? "…" : responseMedian === null ? "—" : formatMinutes(responseMedian),
      icon: Timer,
      accent: "bg-amber-500/10 text-amber-600",
      caption: responseSamples.length > 0 ? `mediana de ${responseSamples.length} conversas` : "sem conversas respondidas",
      hint: "Tempo entre a abertura da conversa e a primeira mensagem enviada pelo buffet (inclui o robô). Usa as conversas mais recentes do período, até 30 por empresa.",
    },
  ];

  const secondaryStats = [
    { label: "Leads hoje", value: totals.leadsToday.toLocaleString("pt-BR"), icon: UserPlus },
    { label: "Perdidos", value: totals.lost.toLocaleString("pt-BR"), icon: XCircle },
    { label: "Conversas ativas", value: totals.activeConversations.toLocaleString("pt-BR"), icon: MessageSquare },
    { label: "Follow-ups", value: filteredFollowUps.length.toLocaleString("pt-BR"), icon: Send },
    {
      label: "Msgs enviadas",
      value: isLoadingMessages ? "…" : fmt(messagesSent),
      icon: ArrowUpRight,
      hint: messagesSent === null ? "Não foi possível contar agora. Tente um período menor." : undefined,
    },
    {
      label: "Msgs recebidas",
      value: isLoadingMessages ? "…" : fmt(messagesReceived),
      icon: ArrowDownLeft,
      hint: messagesReceived === null ? "Não foi possível contar agora. Tente um período menor." : undefined,
    },
  ];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <HubDashboardFilters
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {isLoadingMetrics ? (
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
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {heroCards.map(card => <HubKpiCard key={card.title} {...card} />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {secondaryStats.map(s => <HubStatTile key={s.label} {...s} />)}
          </div>
        </>
      )}

      {!isLoadingMetrics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <HubSalesFunnel leads={filteredLeads} />
          <HubUnitRanking
            metrics={periodMetrics}
            followUpsByCompany={followUpsByCompany}
            closedByCompany={closedByCompany}
          />
        </div>
      )}

      <HubCharts leads={filteredLeads} isLoading={isLoadingMetrics} />

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Por Empresa
          <span className="text-xs font-normal text-muted-foreground">· números do período</span>
        </h2>
        {isLoadingMetrics ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map(i => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {periodMetrics.map(m => <HubCompanyCard key={m.companyId} metrics={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
