import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Copy, ChevronDown, ChevronUp, Users, FileDown, Trash2, Check, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval, areIntervalsOverlapping, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { generateSchedulePDF } from "./SchedulePDFGenerator";
import { ScheduleCard } from "./ScheduleCard";

interface Schedule {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  slug: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
}

export interface EventData {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  package_name: string | null;
  event_type: string | null;
}

export interface Availability {
  id: string;
  schedule_id: string;
  freelancer_name: string;
  freelancer_phone: string;
  available_event_ids: string[];
}

export interface Assignment {
  id: string;
  schedule_id: string;
  event_id: string;
  freelancer_name: string;
  role: string;
}

const ROLES = ["Garçom", "Monitor", "Cozinheiro", "Decorador", "DJ", "Fotógrafo", "Segurança", "Recepcionista", "Outro"];

export function FreelancerSchedulesTab() {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, EventData>>({});
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchSchedules = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("freelancer_schedules")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setSchedules((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
    if (companyId) {
      supabase.from("companies").select("name, logo_url").eq("id", companyId).single().then(({ data }) => {
        if (data) { setCompanyName(data.name); setCompanyLogo(data.logo_url); }
      });
    }
  }, [companyId]);

  // Weekly grouping
  const weeksWithSchedules = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

    return weeks.map((weekStart, index) => {
      const wStart = startOfWeek(weekStart, { weekStartsOn: 0 });
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

      const weekSchedules = schedules.filter(s => {
        try {
          return areIntervalsOverlapping(
            { start: parseISO(s.start_date), end: parseISO(s.end_date) },
            { start: wStart, end: wEnd }
          );
        } catch { return false; }
      });

      return { weekNumber: index + 1, start: wStart, end: wEnd, schedules: weekSchedules };
    });
  }, [schedules, currentMonth]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthSchedules = schedules.filter(s => {
      try {
        return areIntervalsOverlapping(
          { start: parseISO(s.start_date), end: parseISO(s.end_date) },
          { start: monthStart, end: monthEnd }
        );
      } catch { return false; }
    });
    const totalEvents = monthSchedules.reduce((sum, s) => sum + s.event_ids.length, 0);
    const assignedNames = new Set(
      assignments.filter(a => monthSchedules.some(s => s.id === a.schedule_id)).map(a => a.freelancer_name)
    );
    return { scales: monthSchedules.length, events: totalEvents, assigned: assignedNames.size };
  }, [schedules, assignments, currentMonth]);

  const loadScheduleDetails = async (schedule: Schedule) => {
    if (expandedId === schedule.id) { setExpandedId(null); return; }
    setExpandedId(schedule.id);

    if (schedule.event_ids.length > 0) {
      const { data: evData } = await supabase
        .from("company_events")
        .select("id, title, event_date, start_time, end_time, package_name, event_type")
        .in("id", schedule.event_ids)
        .order("event_date", { ascending: true });
      const evMap: Record<string, EventData> = {};
      (evData || []).forEach(e => { evMap[e.id] = e; });
      setEvents(prev => ({ ...prev, ...evMap }));
    }

    const { data: avData } = await supabase
      .from("freelancer_availability")
      .select("*")
      .eq("schedule_id", schedule.id);
    setAvailability((avData as any[]) || []);

    const { data: asData } = await supabase
      .from("freelancer_assignments")
      .select("*")
      .eq("schedule_id", schedule.id);
    setAssignments((asData as any[]) || []);
  };

  const copyLink = (schedule: Schedule) => {
    let domain: string;
    if (currentCompany?.custom_domain) {
      domain = currentCompany.custom_domain;
    } else {
      domain = window.location.origin;
    }
    const slug = schedule.slug || schedule.id;
    const path = currentCompany?.slug
      ? `/escala/${currentCompany.slug}/${slug}`
      : `/escala/${schedule.id}`;
    const fullUrl = `${domain}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiado!" });
  };

  const toggleAssignment = async (scheduleId: string, eventId: string, freelancerName: string, role: string) => {
    if (!companyId) return;
    setSavingAssignment(true);
    const existing = assignments.find(a => a.schedule_id === scheduleId && a.event_id === eventId && a.freelancer_name === freelancerName);
    if (existing) {
      await supabase.from("freelancer_assignments").delete().eq("id", existing.id);
      setAssignments(prev => prev.filter(a => a.id !== existing.id));
    } else {
      const { data } = await supabase.from("freelancer_assignments").insert({
        schedule_id: scheduleId,
        event_id: eventId,
        company_id: companyId,
        freelancer_name: freelancerName,
        role,
      } as any).select().single();
      if (data) setAssignments(prev => [...prev, data as any]);
    }
    setSavingAssignment(false);
  };

  const updateRole = async (assignmentId: string, newRole: string) => {
    await supabase.from("freelancer_assignments").update({ role: newRole } as any).eq("id", assignmentId);
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, role: newRole } : a));
  };

  const handleGeneratePDF = (schedule: Schedule) => {
    const scheduleEvents = schedule.event_ids.map(id => events[id]).filter(Boolean);
    const scheduleAssignments = assignments.filter(a => a.schedule_id === schedule.id);

    if (scheduleAssignments.length === 0) {
      toast({ title: "Nenhum freelancer escalado", description: "Selecione os freelancers antes de gerar o PDF.", variant: "destructive" });
      return;
    }

    generateSchedulePDF({
      title: schedule.title,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      company_name: companyName,
      company_logo: companyLogo,
      events: scheduleEvents,
      assignments: scheduleAssignments,
    });
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta escala?")) return;
    await supabase.from("freelancer_schedules").delete().eq("id", id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast({ title: "Escala excluída" });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Escala
        </Button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Escalas", value: monthlySummary.scales, color: "text-primary", bg: "bg-primary/10" },
          { label: "Festas", value: monthlySummary.events, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Escalados", value: monthlySummary.assigned, color: "text-emerald-600", bg: "bg-emerald-500/10" },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border/40 p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${c.bg}`}>
              <span className={`text-lg font-bold ${c.color}`}>{c.value}</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Weekly Groups */}
      {weeksWithSchedules.map(week => (
        <div key={week.weekNumber} className="space-y-2">
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Semana {week.weekNumber}
            </span>
            <span className="text-xs text-muted-foreground">
              · {format(week.start, "dd/MM")} - {format(week.end, "dd/MM")}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {week.schedules.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 pl-1 py-2">Nenhuma escala nesta semana</p>
          ) : (
            week.schedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                isExpanded={expandedId === schedule.id}
                events={events}
                availability={availability}
                assignments={assignments}
                savingAssignment={savingAssignment}
                onToggleExpand={() => loadScheduleDetails(schedule)}
                onCopyLink={() => copyLink(schedule)}
                onGeneratePDF={() => handleGeneratePDF(schedule)}
                onDelete={() => deleteSchedule(schedule.id)}
                onToggleAssignment={toggleAssignment}
                onUpdateRole={updateRole}
                onUpdateNotes={async (id, notes) => {
                  await supabase.from("freelancer_schedules").update({ notes: notes || null } as any).eq("id", id);
                  setSchedules(prev => prev.map(s => s.id === id ? { ...s, notes: notes || null } : s));
                  toast({ title: "Observações atualizadas" });
                }}
                roles={ROLES}
              />
            ))
          )}
        </div>
      ))}

      {/* Global empty state */}
      {schedules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma escala criada ainda.</p>
            <p className="text-sm text-muted-foreground">Crie uma escala para que freelancers informem disponibilidade.</p>
          </CardContent>
        </Card>
      )}

      <CreateScheduleDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetchSchedules} />
    </div>
  );
}
