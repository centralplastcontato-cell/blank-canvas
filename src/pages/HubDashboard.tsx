import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Building2, Menu, Users, MessageSquare, TrendingUp, UserPlus,
  CheckCircle, XCircle, Clock, Loader2, BarChart3
} from "lucide-react";

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

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
}

export default function HubDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics[]>([]);

  const { canManageUsers, isAdmin } = useUserRole(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canAccessB2B = isAdmin || hasPermission('b2b.view');

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [isLoading, user, navigate]);

  // Profile
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) setCurrentUserProfile(data as Profile); });
    }
  }, [user]);

  // Access check
  useEffect(() => {
    const check = async () => {
      if (!user?.id) return;
      const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (data === true) {
        setCanAccess(true);
        return;
      }
      // Check if owner of a parent company
      const { data: uc } = await supabase
        .from("user_companies").select("company_id, role")
        .eq("user_id", user.id).in("role", ["owner", "admin"]);
      if (uc && uc.length > 0) {
        const { data: parents } = await supabase
          .from("companies").select("id")
          .in("id", uc.map(u => u.company_id)).is("parent_id", null);
        if (parents && parents.length > 0) {
          const { data: children } = await supabase
            .from("companies").select("id")
            .in("parent_id", parents.map(p => p.id)).limit(1);
          if (children && children.length > 0) {
            setCanAccess(true);
            return;
          }
        }
      }
      setCanAccess(false);
    };
    if (user?.id) { setCanAccess(null); check(); }
  }, [user?.id]);

  // Redirect if no access
  useEffect(() => {
    if (canAccess === false) {
      toast({ title: "Acesso negado", variant: "destructive" });
      navigate("/atendimento");
    }
  }, [canAccess, navigate]);

  // Fetch metrics
  useEffect(() => {
    if (canAccess !== true || !user?.id) return;
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        // Get all companies
        const { data: companies } = await supabase
          .from("companies").select("id, name, logo_url, parent_id").order("name");
        if (!companies) return;

        // Get child companies (skip parent companies themselves from metrics)
        const childCompanies = companies.filter(c => c.parent_id !== null);
        const targetCompanies = childCompanies.length > 0 ? childCompanies : companies;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const metrics: CompanyMetrics[] = [];
        for (const company of targetCompanies) {
          // Leads
          const { data: leads } = await supabase
            .from("campaign_leads")
            .select("id, status, created_at")
            .eq("company_id", company.id);

          const allLeads = leads || [];
          const leadsToday = allLeads.filter(l => l.created_at >= todayISO).length;
          const leadsClosed = allLeads.filter(l => l.status === "fechado").length;
          const leadsLost = allLeads.filter(l => l.status === "perdido").length;
          const leadsNew = allLeads.filter(l => l.status === "novo").length;

          // Conversations
          const { data: convos } = await supabase
            .from("wapi_conversations")
            .select("id, is_closed")
            .eq("company_id", company.id);

          const allConvos = convos || [];
          const activeConvos = allConvos.filter(c => !c.is_closed).length;

          // Messages count
          const { count: messagesCount } = await supabase
            .from("wapi_messages")
            .select("id", { count: "exact", head: true })
            .eq("company_id", company.id);

          metrics.push({
            companyId: company.id,
            companyName: company.name,
            logoUrl: company.logo_url,
            totalLeads: allLeads.length,
            leadsToday,
            leadsClosed,
            leadsLost,
            leadsNew,
            totalConversations: allConvos.length,
            activeConversations: activeConvos,
            totalMessages: messagesCount || 0,
          });
        }
        setCompanyMetrics(metrics);
      } catch (err) {
        console.error("Error fetching hub metrics:", err);
      }
      setIsLoadingMetrics(false);
    };
    fetchMetrics();
  }, [canAccess, user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading || canAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || canAccess !== true) return null;

  // Totals
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

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const summaryCards = [
    { title: "Total de Leads", value: totals.leads, icon: Users, gradient: "from-primary/20 via-primary/10 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", borderColor: "border-primary/20" },
    { title: "Leads Hoje", value: totals.leadsToday, icon: UserPlus, gradient: "from-sky-500/20 via-sky-500/10 to-transparent", iconBg: "bg-sky-500/15", iconColor: "text-sky-600", borderColor: "border-sky-500/20" },
    { title: "Novos", value: totals.newLeads, icon: Clock, gradient: "from-amber-500/20 via-amber-500/10 to-transparent", iconBg: "bg-amber-500/15", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
    { title: "Fechados", value: totals.closed, icon: CheckCircle, gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
    { title: "Perdidos", value: totals.lost, icon: XCircle, gradient: "from-rose-500/20 via-rose-500/10 to-transparent", iconBg: "bg-rose-500/15", iconColor: "text-rose-600", borderColor: "border-rose-500/20" },
    { title: "Conversas Ativas", value: totals.activeConversations, icon: MessageSquare, gradient: "from-violet-500/20 via-violet-500/10 to-transparent", iconBg: "bg-violet-500/15", iconColor: "text-violet-600", borderColor: "border-violet-500/20" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!isMobile && (
          <AdminSidebar
            canManageUsers={canManageUsers}
            canAccessB2B={canAccessB2B}
            currentUserName={currentUserProfile?.full_name || ""}
            onRefresh={() => window.location.reload()}
            onLogout={handleLogout}
          />
        )}

        <SidebarInset className="flex-1">
          <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isMobile ? (
                <MobileMenu
                  isOpen={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                  trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                  currentPage="hub"
                  userName={currentUserProfile?.full_name || ""}
                  userEmail={user.email || ""}
                  userAvatar={currentUserProfile?.avatar_url}
                  canManageUsers={canManageUsers}
                  canAccessB2B={canAccessB2B}
                  onLogout={handleLogout}
                />
              ) : (
                <SidebarTrigger />
              )}
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Painel Hub
                </h1>
                <p className="text-xs text-muted-foreground">
                  Visão consolidada de todas as empresas
                </p>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6">
            {/* Summary Cards */}
            {isLoadingMetrics ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-border/50 overflow-hidden">
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-20 mb-3" />
                      <Skeleton className="h-8 w-12" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {summaryCards.map((metric) => (
                  <Card
                    key={metric.title}
                    className={`relative border ${metric.borderColor} overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-card`}
                  >
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

            {/* Per-Company Breakdown */}
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Por Empresa
              </h2>

              {isLoadingMetrics ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map(i => (
                    <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                  ))}
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
                            <MessageSquare className="h-3.5 w-3.5" />
                            {m.totalMessages} mensagens
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {m.activeConversations} ativas
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
