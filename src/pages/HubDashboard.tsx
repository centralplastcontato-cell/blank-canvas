import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { HubCharts } from "@/components/admin/HubCharts";
import { HubDashboardFilters, DashboardFilters, getDefaultFilters } from "@/components/hub/HubDashboardFilters";
import { HubSalesFunnel } from "@/components/hub/HubSalesFunnel";
import { HubUnitRanking } from "@/components/hub/HubUnitRanking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, MessageSquare, UserPlus,
  CheckCircle, XCircle, BarChart3, Percent, Timer,
  Phone
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadRecord {
  company_id: string;
  company_name: string;
  status: string;
  created_at: string;
}

interface CompanyMetrics {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  totalLeads: number;
  leadsToday: number;
  leadsClosed: number;
  leadsLost: number;
  leadsNew: number;
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  lastLeadAt: string | null;
  whatsappStatus: 'connected' | 'disconnected' | 'unknown';
  whatsappPhone: string | null;
}

interface ConversationTiming {
  company_id: string;
  created_at: string;
  first_message_at: string | null;
}

export default function HubDashboard() {
  return (
    <HubLayout
      currentPage="hub"
      header={
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Painel Hub
          </h1>
          <p className="text-xs text-muted-foreground">Visão consolidada de todas as empresas</p>
        </div>
      }
    >
      {({ user }) => <HubDashboardContent userId={user.id} />}
    </HubLayout>
  );
}

function HubDashboardContent({ userId }: { userId: string }) {
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics[]>([]);
  const [allLeadRecords, setAllLeadRecords] = useState<LeadRecord[]>([]);
  const [conversationTimings, setConversationTimings] = useState<ConversationTiming[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(getDefaultFilters);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const { data: allCompanies } = await supabase
          .from("companies").select("id, name, logo_url, parent_id").order("name");
        if (!allCompanies) return;

        const childCompanies = allCompanies.filter(c => c.parent_id !== null);
        const targetCompanies = childCompanies.length > 0 ? childCompanies : allCompanies;
        setCompanies(targetCompanies.map(c => ({ id: c.id, name: c.name })));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const metrics: CompanyMetrics[] = [];
        const allLeadsRecords: LeadRecord[] = [];
        const timings: ConversationTiming[] = [];

        for (const company of targetCompanies) {
          const { data: leads } = await supabase
            .from("campaign_leads").select("id, status, created_at").eq("company_id", company.id);

          const allLeads = leads || [];
          allLeadsRecords.push(...allLeads.map(l => ({
            company_id: company.id, company_name: company.name, status: l.status, created_at: l.created_at,
          })));

          const { data: convos } = await supabase
            .from("wapi_conversations").select("id, is_closed, created_at").eq("company_id", company.id);
          const allConvos = convos || [];

          // Get first message timing for response time calc
          for (const convo of allConvos.slice(0, 50)) {
            const { data: firstMsg } = await supabase
              .from("wapi_messages")
              .select("created_at")
              .eq("conversation_id", convo.id)
              .eq("from_me", true)
              .order("created_at", { ascending: true })
              .limit(1);

            timings.push({
              company_id: company.id,
              created_at: convo.created_at,
              first_message_at: firstMsg?.[0]?.created_at || null,
            });
          }

          const { count: messagesCount } = await supabase
            .from("wapi_messages").select("id", { count: "exact", head: true }).eq("company_id", company.id);

          // Fetch WhatsApp instance for this company
          const { data: instances } = await supabase
            .from("wapi_instances")
            .select("status, phone_number")
            .eq("company_id", company.id)
            .order("connected_at", { ascending: false })
            .limit(1);

          const instance = instances?.[0];
          const lastLead = allLeads.length > 0
            ? allLeads.reduce((latest, l) => l.created_at > latest ? l.created_at : latest, allLeads[0].created_at)
            : null;

          metrics.push({
            companyId: company.id, companyName: company.name, logoUrl: company.logo_url,
            totalLeads: allLeads.length,
            leadsToday: allLeads.filter(l => l.created_at >= todayISO).length,
            leadsClosed: allLeads.filter(l => l.status === "fechado").length,
            leadsLost: allLeads.filter(l => l.status === "perdido").length,
            leadsNew: allLeads.filter(l => l.status === "novo").length,
            totalConversations: allConvos.length,
            activeConversations: allConvos.filter(c => !c.is_closed).length,
            totalMessages: messagesCount || 0,
            lastLeadAt: lastLead,
            whatsappStatus: instance?.status === 'open' || instance?.status === 'connected' ? 'connected' : instance ? 'disconnected' : 'unknown',
            whatsappPhone: instance?.phone_number || null,
          });
        }
        setCompanyMetrics(metrics);
        setAllLeadRecords(allLeadsRecords);
        setConversationTimings(timings);
      } catch (err) {
        console.error("Error fetching hub metrics:", err);
      }
      setIsLoadingMetrics(false);
    };
    fetchMetrics();
  }, [userId]);

  // Apply filters
  const filteredLeads = useMemo(() => {
    let result = allLeadRecords;
    const fromISO = filters.dateRange.from.toISOString();
    const toISO = filters.dateRange.to.toISOString();
    result = result.filter(l => l.created_at >= fromISO && l.created_at <= toISO);
    if (filters.companyId) result = result.filter(l => l.company_id === filters.companyId);
    if (filters.status) result = result.filter(l => l.status === filters.status);
    return result;
  }, [allLeadRecords, filters]);

  const filteredMetrics = useMemo(() => {
    if (!filters.companyId) return companyMetrics;
    return companyMetrics.filter(m => m.companyId === filters.companyId);
  }, [companyMetrics, filters.companyId]);

  // KPIs
  const totals = useMemo(() => {
    const m = filteredMetrics;
    return m.reduce((acc, item) => ({
      leads: acc.leads + item.totalLeads,
      leadsToday: acc.leadsToday + item.leadsToday,
      closed: acc.closed + item.leadsClosed,
      lost: acc.lost + item.leadsLost,
      newLeads: acc.newLeads + item.leadsNew,
      conversations: acc.conversations + item.totalConversations,
      activeConversations: acc.activeConversations + item.activeConversations,
      messages: acc.messages + item.totalMessages,
    }), { leads: 0, leadsToday: 0, closed: 0, lost: 0, newLeads: 0, conversations: 0, activeConversations: 0, messages: 0 });
  }, [filteredMetrics]);

  const conversionRate = totals.leads > 0 ? ((totals.closed / totals.leads) * 100).toFixed(1) : "0";

  const avgResponseTime = useMemo(() => {
    const relevant = conversationTimings.filter(t => {
      if (!t.first_message_at) return false;
      if (filters.companyId && t.company_id !== filters.companyId) return false;
      return true;
    });
    if (!relevant.length) return null;
    const totalMinutes = relevant.reduce((sum, t) => {
      const diff = new Date(t.first_message_at!).getTime() - new Date(t.created_at).getTime();
      return sum + Math.max(0, diff / 60000);
    }, 0);
    const avg = totalMinutes / relevant.length;
    if (avg < 60) return `${Math.round(avg)}min`;
    if (avg < 1440) return `${(avg / 60).toFixed(1)}h`;
    return `${(avg / 1440).toFixed(1)}d`;
  }, [conversationTimings, filters.companyId]);

  const summaryCards = [
    { title: "Total de Leads", value: totals.leads, icon: Users, gradient: "from-primary/20 via-primary/10 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", borderColor: "border-primary/20" },
    { title: "Leads Hoje", value: totals.leadsToday, icon: UserPlus, gradient: "from-sky-500/20 via-sky-500/10 to-transparent", iconBg: "bg-sky-500/15", iconColor: "text-sky-600", borderColor: "border-sky-500/20" },
    { title: "Conversão", value: `${conversionRate}%`, icon: Percent, gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
    { title: "Tempo Resposta", value: avgResponseTime || "—", icon: Timer, gradient: "from-violet-500/20 via-violet-500/10 to-transparent", iconBg: "bg-violet-500/15", iconColor: "text-violet-600", borderColor: "border-violet-500/20" },
    { title: "Fechados", value: totals.closed, icon: CheckCircle, gradient: "from-teal-500/20 via-teal-500/10 to-transparent", iconBg: "bg-teal-500/15", iconColor: "text-teal-600", borderColor: "border-teal-500/20" },
    { title: "Perdidos", value: totals.lost, icon: XCircle, gradient: "from-rose-500/20 via-rose-500/10 to-transparent", iconBg: "bg-rose-500/15", iconColor: "text-rose-600", borderColor: "border-rose-500/20" },
    { title: "Conversas Ativas", value: totals.activeConversations, icon: MessageSquare, gradient: "from-amber-500/20 via-amber-500/10 to-transparent", iconBg: "bg-amber-500/15", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <HubDashboardFilters companies={companies} filters={filters} onFiltersChange={setFilters} />

      {/* Summary Cards */}
      {isLoadingMetrics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="border-border/50 overflow-hidden">
              <CardContent className="p-4"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-8 w-12" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {summaryCards.map((metric) => (
            <Card key={metric.title} className={`relative border ${metric.borderColor} overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-card`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} pointer-events-none`} />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`p-2 rounded-lg ${metric.iconBg} shadow-sm`}>
                    <metric.icon className={`w-4 h-4 ${metric.iconColor}`} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium truncate">{metric.title}</span>
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Funnel + Ranking */}
      {!isLoadingMetrics && (
        <div className="grid gap-4 md:grid-cols-2">
          <HubSalesFunnel leads={filteredLeads} />
          <HubUnitRanking metrics={filteredMetrics} />
        </div>
      )}

      {/* Charts */}
      <HubCharts leads={filteredLeads} isLoading={isLoadingMetrics} />

      {/* Per Company */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Por Empresa
        </h2>
        {isLoadingMetrics ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMetrics.map((m) => {
              const companyConvRate = m.totalLeads > 0 ? ((m.leadsClosed / m.totalLeads) * 100).toFixed(1) : "0";
              const companyTimings = conversationTimings.filter(t => t.company_id === m.companyId && t.first_message_at);
              let companyAvgResponse = "—";
              if (companyTimings.length > 0) {
                const totalMin = companyTimings.reduce((sum, t) => {
                  const diff = new Date(t.first_message_at!).getTime() - new Date(t.created_at).getTime();
                  return sum + Math.max(0, diff / 60000);
                }, 0);
                const avg = totalMin / companyTimings.length;
                companyAvgResponse = avg < 60 ? `${Math.round(avg)}min` : avg < 1440 ? `${(avg / 60).toFixed(1)}h` : `${(avg / 1440).toFixed(1)}d`;
              }

              return (
                <Card key={m.companyId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {m.logoUrl ? (
                          <img src={m.logoUrl} alt={m.companyName} className="h-10 w-10 rounded-lg object-contain bg-muted" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{m.companyName}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`h-2 w-2 rounded-full ${m.whatsappStatus === 'connected' ? 'bg-emerald-500' : m.whatsappStatus === 'disconnected' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                            <span className="text-xs text-muted-foreground">
                              {m.whatsappStatus === 'connected' ? 'WhatsApp conectado' : m.whatsappStatus === 'disconnected' ? 'WhatsApp desconectado' : 'Sem instância'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {m.whatsappPhone && (
                        <a
                          href={`https://wa.me/${m.whatsappPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* KPIs row */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{m.totalLeads}</p>
                        <p className="text-[10px] text-muted-foreground">Leads</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-emerald-600">{companyConvRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Conversão</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{companyAvgResponse}</p>
                        <p className="text-[10px] text-muted-foreground">T. Resposta</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{m.leadsToday}</p>
                        <p className="text-[10px] text-muted-foreground">Hoje</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Novos</span>
                          <span className="font-medium text-amber-600">{m.leadsNew}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Fechados</span>
                          <span className="font-medium text-emerald-600">{m.leadsClosed}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Perdidos</span>
                          <span className="font-medium text-destructive">{m.leadsLost}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Conversas</span>
                          <span className="font-semibold">{m.totalConversations}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ativas</span>
                          <span className="font-medium text-primary">{m.activeConversations}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Mensagens</span>
                          <span className="font-semibold">{m.totalMessages}</span>
                        </div>
                      </div>
                    </div>

                    {/* Last lead + footer */}
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Timer className="h-3 w-3" />
                        {m.lastLeadAt
                          ? `Último lead: ${formatDistanceToNow(new Date(m.lastLeadAt), { addSuffix: true, locale: ptBR })}`
                          : 'Sem leads'}
                      </span>
                      {m.whatsappPhone && (
                        <span className="font-mono text-[10px]">
                          {m.whatsappPhone}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
