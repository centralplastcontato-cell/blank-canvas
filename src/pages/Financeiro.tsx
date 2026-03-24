import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, AlertTriangle, CalendarDays, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface PaymentRow {
  id: string;
  event_id: string;
  amount: number;
  due_date: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  event_title?: string;
  lead_name?: string;
}

export default function Financeiro() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(() => format(new Date(), "yyyy-MM"));

  useEffect(() => {
    if (!companyId) return;
    const fetchPayments = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("event_payments")
        .select("*")
        .eq("company_id", companyId)
        .order("due_date");

      // Enrich with event info
      const eventIds = [...new Set((data || []).map(p => p.event_id))];
      let eventsMap: Record<string, { title: string; lead_name: string }> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from("company_events")
          .select("id, title, lead_id")
          .in("id", eventIds);
        
        if (events) {
          const leadIds = events.filter(e => e.lead_id).map(e => e.lead_id!);
          let leadsMap: Record<string, string> = {};
          if (leadIds.length > 0) {
            const { data: leads } = await supabase
              .from("campaign_leads")
              .select("id, name")
              .in("id", leadIds);
            if (leads) leadsMap = Object.fromEntries(leads.map(l => [l.id, l.name]));
          }
          eventsMap = Object.fromEntries(events.map(e => [e.id, {
            title: e.title,
            lead_name: e.lead_id ? leadsMap[e.lead_id] || "" : "",
          }]));
        }
      }

      const now = new Date().toISOString().split("T")[0];
      setPayments((data || []).map(p => ({
        ...p,
        amount: Number(p.amount),
        status: p.status === "pending" && p.due_date < now ? "late" : p.status,
        event_title: eventsMap[p.event_id]?.title || "",
        lead_name: eventsMap[p.event_id]?.lead_name || "",
      })));
      setIsLoading(false);
    };
    fetchPayments();
  }, [companyId]);

  const monthStart = startOfMonth(new Date(monthFilter + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");

  const paidThisMonth = payments.filter(p => p.status === "paid" && p.paid_at && p.paid_at.slice(0, 7) === monthFilter);
  const totalReceivedMonth = paidThisMonth.reduce((s, p) => s + p.amount, 0);

  const pendingPayments = payments.filter(p => p.status === "pending" && p.due_date >= monthStartStr && p.due_date <= monthEndStr);
  const totalPendingMonth = pendingPayments.reduce((s, p) => s + p.amount, 0);

  const latePayments = payments.filter(p => p.status === "late").sort((a, b) => a.due_date.localeCompare(b.due_date));
  const totalLate = latePayments.reduce((s, p) => s + p.amount, 0);

  const upcomingPayments = payments
    .filter(p => p.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 20);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: ptBR }) };
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar canManageUsers={false} currentUserName="" onRefresh={() => {}} onLogout={() => navigate("/auth")} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-primary" /> Financeiro
                </h1>
                <p className="text-sm text-muted-foreground">Visão consolidada dos pagamentos</p>
              </div>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" /> Recebido no mês
                </div>
                <p className="text-2xl font-bold text-emerald-400">{fmt(totalReceivedMonth)}</p>
              </Card>
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CalendarDays className="h-4 w-4 text-amber-400" /> A receber no mês
                </div>
                <p className="text-2xl font-bold text-amber-400">{fmt(totalPendingMonth)}</p>
              </Card>
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" /> Total em atraso
                </div>
                <p className="text-2xl font-bold text-red-400">{fmt(totalLate)}</p>
              </Card>
            </div>

            {/* Late Payments */}
            {latePayments.length > 0 && (
              <Card className="p-5 bg-card border-border">
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" /> Pagamentos em Atraso
                </h2>
                <div className="space-y-2">
                  {latePayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.lead_name || p.event_title}</p>
                        <p className="text-xs text-muted-foreground">{p.event_title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">{fmt(p.amount)}</p>
                        <p className="text-xs text-red-400">
                          {differenceInDays(new Date(), new Date(p.due_date))} dias de atraso
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Upcoming Payments */}
            <Card className="p-5 bg-card border-border">
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Próximos Vencimentos
              </h2>
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum vencimento pendente</p>
              ) : (
                <div className="space-y-2">
                  {upcomingPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.lead_name || p.event_title}</p>
                        <p className="text-xs text-muted-foreground">{p.event_title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{fmt(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
