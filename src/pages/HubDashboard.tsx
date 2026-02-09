import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { HubCharts } from "@/components/admin/HubCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, MessageSquare, TrendingUp, UserPlus,
  CheckCircle, XCircle, Clock, BarChart3
} from "lucide-react";

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

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const { data: companies } = await supabase
          .from("companies").select("id, name, logo_url, parent_id").order("name");
        if (!companies) return;

        const childCompanies = companies.filter(c => c.parent_id !== null);
        const targetCompanies = childCompanies.length > 0 ? childCompanies : companies;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const metrics: CompanyMetrics[] = [];
        const allLeadsRecords: LeadRecord[] = [];

        for (const company of targetCompanies) {
          const { data: leads } = await supabase
            .from("campaign_leads").select("id, status, created_at").eq("company_id", company.id);

          const allLeads = leads || [];
          allLeadsRecords.push(...allLeads.map(l => ({
            company_id: company.id, company_name: company.name, status: l.status, created_at: l.created_at,
          })));

          const { data: convos } = await supabase
            .from("wapi_conversations").select("id, is_closed").eq("company_id", company.id);
          const allConvos = convos || [];

          const { count: messagesCount } = await supabase
            .from("wapi_messages").select("id", { count: "exact", head: true }).eq("company_id", company.id);

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
          });
        }
        setCompanyMetrics(metrics);
        setAllLeadRecords(allLeadsRecords);
      } catch (err) {
        console.error("Error fetching hub metrics:", err);
      }
      setIsLoadingMetrics(false);
    };
    fetchMetrics();
  }, [userId]);

  const totals = companyMetrics.reduce((acc, m) => ({
    leads: acc.leads + m.totalLeads,
    leadsToday: acc.leadsToday + m.leadsToday,
    closed: acc.closed + m.leadsClosed,
    lost: acc.lost + m.leadsLost,
    newLeads: acc.newLeads + m.leadsNew,
    conversations: acc.conversations + m.totalConversations,
    activeConversations: acc.activeConversations + m.activeConversations,
    messages: acc.messages + m.totalMessages,
  }), { leads: 0, leadsToday: 0, closed: 0, lost: 0, newLeads: 0, conversations: 0, activeConversations: 0, messages: 0 });

  const summaryCards = [
    { title: "Total de Leads", value: totals.leads, icon: Users, gradient: "from-primary/20 via-primary/10 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", borderColor: "border-primary/20" },
    { title: "Leads Hoje", value: totals.leadsToday, icon: UserPlus, gradient: "from-sky-500/20 via-sky-500/10 to-transparent", iconBg: "bg-sky-500/15", iconColor: "text-sky-600", borderColor: "border-sky-500/20" },
    { title: "Novos", value: totals.newLeads, icon: Clock, gradient: "from-amber-500/20 via-amber-500/10 to-transparent", iconBg: "bg-amber-500/15", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
    { title: "Fechados", value: totals.closed, icon: CheckCircle, gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
    { title: "Perdidos", value: totals.lost, icon: XCircle, gradient: "from-rose-500/20 via-rose-500/10 to-transparent", iconBg: "bg-rose-500/15", iconColor: "text-rose-600", borderColor: "border-rose-500/20" },
    { title: "Conversas Ativas", value: totals.activeConversations, icon: MessageSquare, gradient: "from-violet-500/20 via-violet-500/10 to-transparent", iconBg: "bg-violet-500/15", iconColor: "text-violet-600", borderColor: "border-violet-500/20" },
  ];

  return (
    <div className="space-y-6">
      {isLoadingMetrics ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50 overflow-hidden">
              <CardContent className="p-4"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-8 w-12" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      <HubCharts leads={allLeadRecords} isLoading={isLoadingMetrics} />

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
            {companyMetrics.map((m) => (
              <Card key={m.companyId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {m.logoUrl ? (
                      <img src={m.logoUrl} alt={m.companyName} className="h-10 w-10 rounded-lg object-contain bg-muted" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <CardTitle className="text-base">{m.companyName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Leads total</span>
                        <span className="font-semibold">{m.totalLeads}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Leads hoje</span>
                        <Badge variant="secondary" className="text-xs">{m.leadsToday}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Novos</span>
                        <span className="font-medium text-amber-600">{m.leadsNew}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fechados</span>
                        <span className="font-medium text-emerald-600">{m.leadsClosed}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Perdidos</span>
                        <span className="font-medium text-rose-600">{m.leadsLost}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Conversas</span>
                        <span className="font-semibold">{m.totalConversations}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> {m.totalMessages} mensagens
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> {m.activeConversations} ativas
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
