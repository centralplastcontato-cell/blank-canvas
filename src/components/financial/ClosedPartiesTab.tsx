import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, Clock, MapPin, Users, Handshake, ArrowUpDown, Phone, DollarSign, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";


interface ClosedEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  total_value: number | null;
  is_permuta: boolean;
  data_fechamento_venda: string | null;
  payment_details: any;
  lead_id: string | null;
  lead_name?: string;
  lead_phone?: string;
  paid_total?: number;
  pending_total?: number;
}

interface ClosedPartiesTabProps {
  from: string;
  to: string;
  unitFilter: string;
  onOpenEvent: (eventId: string) => void;
}

const PAGE_SIZE = 20;
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ClosedPartiesTab({ from, to, unitFilter, onOpenEvent }: ClosedPartiesTabProps) {
  const { currentCompany } = useCompany();
  const [events, setEvents] = useState<ClosedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"fechamento" | "event_date">("fechamento");
  const [page, setPage] = useState(1);
  const fetchClosed = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoading(true);

    let query = supabase
      .from("company_events")
      .select("*")
      .eq("company_id", currentCompany.id)
      .gte("data_fechamento_venda", from)
      .lte("data_fechamento_venda", to)
      .order("data_fechamento_venda", { ascending: false });

    if (unitFilter && unitFilter !== "all") {
      query = query.eq("unit", unitFilter);
    }

    const { data: eventsData } = await query;
    const evts = (eventsData || []) as any[];

    // Enrich with lead name/phone
    const leadIds = [...new Set(evts.map(e => e.lead_id).filter(Boolean))] as string[];
    let leadMap = new Map<string, { name: string; whatsapp: string }>();
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp")
        .in("id", leadIds);
      (leads || []).forEach((l: any) => leadMap.set(l.id, l));
    }

    // Fetch payment status for each event
    const eventIds = evts.map(e => e.id);
    let paymentMap = new Map<string, { paid: number; pending: number }>();
    if (eventIds.length > 0) {
      const { data: payments } = await supabase
        .from("event_payments")
        .select("event_id, amount, status")
        .in("event_id", eventIds);
      (payments || []).forEach((p: any) => {
        const current = paymentMap.get(p.event_id) || { paid: 0, pending: 0 };
        if (p.status === "paid") {
          current.paid += Number(p.amount) || 0;
        } else {
          current.pending += Number(p.amount) || 0;
        }
        paymentMap.set(p.event_id, current);
      });
    }

    const enriched: ClosedEvent[] = evts.map(ev => {
      const lead = ev.lead_id ? leadMap.get(ev.lead_id) : undefined;
      const payInfo = paymentMap.get(ev.id) || { paid: 0, pending: 0 };
      return {
        ...ev,
        lead_name: lead?.name,
        lead_phone: lead?.whatsapp,
        paid_total: payInfo.paid,
        pending_total: payInfo.pending,
      };
    });

    setEvents(enriched);
    setLoading(false);
  }, [currentCompany?.id, from, to, unitFilter]);

  useEffect(() => {
    fetchClosed();
  }, [fetchClosed]);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      if (sortBy === "fechamento") {
        return (b.data_fechamento_venda || "").localeCompare(a.data_fechamento_venda || "");
      }
      return a.event_date.localeCompare(b.event_date);
    });
  }, [events, sortBy]);

  const totalRevenue = useMemo(() =>
    events.filter(e => !e.is_permuta).reduce((sum, e) => sum + (e.total_value || 0), 0),
    [events]
  );

  const totalPaid = useMemo(() =>
    events.reduce((sum, e) => sum + (e.paid_total || 0), 0),
    [events]
  );

  const totalPending = useMemo(() =>
    events.reduce((sum, e) => sum + (e.pending_total || 0), 0),
    [events]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Handshake className="h-3.5 w-3.5 text-violet-500" /> Festas Fechadas
          </div>
          <p className="text-lg font-bold text-foreground">{events.length}</p>
        </Card>
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5 text-primary" /> Valor Total
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(totalRevenue)}</p>
        </Card>
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Recebido
          </div>
          <p className="text-lg font-bold text-emerald-500">{fmt(totalPaid)}</p>
        </Card>
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Pendente
          </div>
          <p className="text-lg font-bold text-amber-500">{fmt(totalPending)}</p>
        </Card>
      </div>

      {/* Sort toggle + header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {events.length} festa{events.length !== 1 ? "s" : ""} no período
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs rounded-full px-3 gap-1.5"
          onClick={() => setSortBy(prev => prev === "event_date" ? "fechamento" : "event_date")}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === "event_date" ? "Data festa" : "Data fechamento"}
        </Button>
      </div>

      {/* Event list */}
      {sorted.length === 0 ? (
        <Card className="p-8 text-center">
          <Handshake className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma festa fechada neste período.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((ev) => {
            const paidPct = ev.total_value && ev.total_value > 0
              ? Math.min(100, Math.round(((ev.paid_total || 0) / ev.total_value) * 100))
              : 0;

            return (
              <button
                key={ev.id}
                onClick={() => onOpenEvent(ev.id)}
                className="w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] border-l-violet-500 bg-violet-500/[0.02] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-sm truncate">{ev.title}</span>
                  <Badge
                    variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 shrink-0"
                  >
                    {ev.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                  </span>
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ev.start_time.slice(0, 5)}
                    </span>
                  )}
                  {ev.unit && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ev.unit}
                    </span>
                  )}
                  {ev.guest_count && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {ev.guest_count}
                    </span>
                  )}
                  {ev.package_name && (
                    <span className="text-primary/70 font-medium">{ev.package_name}</span>
                  )}
                </div>

                {(ev.lead_name || ev.lead_phone) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1.5 text-primary/80">
                    {ev.lead_name && (
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="h-3 w-3" />
                        {ev.lead_name}
                      </span>
                    )}
                    {ev.lead_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {ev.lead_phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Financial summary row */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    {ev.total_value != null && ev.total_value > 0 && (
                      <span className="text-sm font-bold text-foreground">{fmt(ev.total_value)}</span>
                    )}
                    {ev.is_permuta && (
                      <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-600">Permuta</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.total_value != null && ev.total_value > 0 && (
                      <>
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">{paidPct}%</span>
                      </>
                    )}
                  </div>
                </div>

                {ev.data_fechamento_venda && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Handshake className="h-3 w-3" />
                    Fechado em {format(new Date(ev.data_fechamento_venda + "T12:00:00"), "dd/MM/yyyy")}
                  </span>
                )}
              </button>
            );
          })}

          {/* Total footer */}
          <div className="pt-3 border-t border-border/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Total faturado:</span>
              <span className="font-bold text-foreground">{fmt(totalRevenue)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
