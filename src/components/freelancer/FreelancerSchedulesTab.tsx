import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval, areIntervalsOverlapping, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { generateSchedulePDF } from "./SchedulePDFGenerator";
import { ScheduleCard } from "./ScheduleCard";
import { SendScheduleToGroupsDialog } from "./SendScheduleToGroupsDialog";
import { SendAssignmentsToGroupsDialog } from "./SendAssignmentsToGroupsDialog";

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
  event_display_names?: Record<string, string>;
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
  const [sendToGroupsSchedule, setSendToGroupsSchedule] = useState<Schedule | null>(null);
  const [sendAssignmentsSchedule, setSendAssignmentsSchedule] = useState<Schedule | null>(null);
  const [freelancerRoles, setFreelancerRoles] = useState<Record<string, string[]>>({});

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
    const avList = (avData as any[]) || [];
    setAvailability(avList);

    const { data: asData } = await supabase
      .from("freelancer_assignments")
      .select("*")
      .eq("schedule_id", schedule.id);
    setAssignments((asData as any[]) || []);

    // Fetch freelancer registered roles from freelancer_responses
    const uniqueNames = [...new Set(avList.map((a: any) => a.freelancer_name))];
    if (uniqueNames.length > 0 && companyId) {
      const { data: frData } = await supabase
        .from("freelancer_responses")
        .select("respondent_name, answers")
        .eq("company_id", companyId)
        .eq("approval_status", "aprovado")
        .in("respondent_name", uniqueNames);
      const rolesMap: Record<string, string[]> = {};
      (frData || []).forEach((fr: any) => {
        const name = fr.respondent_name;
        if (!name) return;
        const answers = Array.isArray(fr.answers) ? fr.answers : [];
        const funcaoAnswer = answers.find((a: any) => a.questionId === "funcao");
        const roles = Array.isArray(funcaoAnswer?.value) ? funcaoAnswer.value as string[] : [];
        if (roles.length > 0) {
          // Merge if multiple registrations
          const existing = rolesMap[name] || [];
          rolesMap[name] = [...new Set([...existing, ...roles])];
        }
      });
      setFreelancerRoles(rolesMap);
    }
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
    await supabase.from("freelancer_assignments").delete().eq("schedule_id", id);
    await supabase.from("freelancer_availability").delete().eq("schedule_id", id);
    await supabase.from("freelancer_schedules").delete().eq("id", id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast({ title: "Escala excluída" });
  };

  const removeEventFromSchedule = async (scheduleId: string, eventId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const newEventIds = schedule.event_ids.filter(id => id !== eventId);

    // Remove availability references for this event
    const relatedAvail = availability.filter(a => a.schedule_id === scheduleId);
    for (const av of relatedAvail) {
      const newAvailIds = av.available_event_ids.filter(id => id !== eventId);
      if (newAvailIds.length === 0) {
        await supabase.from("freelancer_availability").delete().eq("id", av.id);
      } else {
        await supabase.from("freelancer_availability").update({ available_event_ids: newAvailIds } as any).eq("id", av.id);
      }
    }

    // Remove assignments for this event
    await supabase.from("freelancer_assignments").delete().eq("schedule_id", scheduleId).eq("event_id", eventId);

    // Remove display name entry
    const newDisplayNames = { ...(schedule.event_display_names || {}) };
    delete newDisplayNames[eventId];

    // Update schedule
    await supabase.from("freelancer_schedules").update({
      event_ids: newEventIds,
      event_display_names: newDisplayNames,
    } as any).eq("id", scheduleId);

    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, event_ids: newEventIds, event_display_names: newDisplayNames } : s));
    setAvailability(prev => prev.filter(a => !(a.schedule_id === scheduleId && a.available_event_ids.length === 1 && a.available_event_ids[0] === eventId)).map(a => a.schedule_id === scheduleId ? { ...a, available_event_ids: a.available_event_ids.filter(id => id !== eventId) } : a));
    setAssignments(prev => prev.filter(a => !(a.schedule_id === scheduleId && a.event_id === eventId)));
    toast({ title: "Festa removida da escala" });
  };

  const updateDisplayName = async (scheduleId: string, eventId: string, displayName: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const newDisplayNames = { ...(schedule.event_display_names || {}) };
    if (displayName) {
      newDisplayNames[eventId] = displayName;
    } else {
      delete newDisplayNames[eventId];
    }

    await supabase.from("freelancer_schedules").update({
      event_display_names: newDisplayNames,
    } as any).eq("id", scheduleId);

    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, event_display_names: newDisplayNames } : s));
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold capitalize tracking-tight">{monthLabel}</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-10 px-5 rounded-xl shadow-md font-semibold">
          <Plus className="h-4 w-4 mr-1.5" /> Nova Escala
        </Button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Escalas", value: monthlySummary.scales, color: "text-primary", bg: "bg-primary/8", border: "border-primary/15" },
          { label: "Festas", value: monthlySummary.events, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200/60" },
          { label: "Escalados", value: monthlySummary.assigned, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200/60" },
        ].map(c => (
          <Card key={c.label} className={`border ${c.border} shadow-none min-w-0`}>
            <CardContent className="p-2.5 sm:p-4 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4">
              <span className={`text-xl font-extrabold ${c.color}`}>{c.value}</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.1em] sm:tracking-[0.15em] truncate max-w-full text-center">{c.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Groups */}
      <div className="space-y-6">
        {weeksWithSchedules.map(week => (
          <div key={week.weekNumber} className="space-y-3">
            {/* Week header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-[0.15em]">
                  Semana {week.weekNumber}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {format(week.start, "dd/MM")} — {format(week.end, "dd/MM")}
              </span>
              <div className="flex-1 h-px bg-border/30" />
              {week.schedules.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {week.schedules.length} escala(s)
                </Badge>
              )}
            </div>

            {week.schedules.length === 0 ? (
              <div className="pl-4 py-1">
                <p className="text-xs text-muted-foreground/50 italic">Nenhuma escala nesta semana</p>
              </div>
            ) : (
              <div className="space-y-3 pl-1">
                {week.schedules.map(schedule => (
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
                    freelancerRoles={freelancerRoles}
                    onUpdateNotes={async (id, notes) => {
                      await supabase.from("freelancer_schedules").update({ notes: notes || null } as any).eq("id", id);
                      setSchedules(prev => prev.map(s => s.id === id ? { ...s, notes: notes || null } : s));
                      toast({ title: "Observações atualizadas" });
                    }}
                    onRemoveEvent={removeEventFromSchedule}
                    onUpdateDisplayName={updateDisplayName}
                    onSendToGroups={() => setSendToGroupsSchedule(schedule)}
                    onSendAssignmentsToGroups={() => setSendAssignmentsSchedule(schedule)}
                    scheduleAssignmentCount={assignments.filter(a => a.schedule_id === schedule.id).length}
                    roles={ROLES}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Global empty state */}
      {schedules.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhuma escala criada ainda.</p>
            <p className="text-sm text-muted-foreground/70">Crie uma escala para que freelancers informem disponibilidade.</p>
          </CardContent>
        </Card>
      )}

      <CreateScheduleDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetchSchedules} />

      {sendToGroupsSchedule && companyId && (
        <SendScheduleToGroupsDialog
          open={!!sendToGroupsSchedule}
          onOpenChange={(v) => { if (!v) setSendToGroupsSchedule(null); }}
          schedule={sendToGroupsSchedule}
          companyId={companyId}
          companySlug={currentCompany?.slug}
          customDomain={currentCompany?.custom_domain}
        />
      )}

      {sendAssignmentsSchedule && companyId && (
        <SendAssignmentsToGroupsDialog
          open={!!sendAssignmentsSchedule}
          onOpenChange={(v) => { if (!v) setSendAssignmentsSchedule(null); }}
          schedule={sendAssignmentsSchedule}
          companyId={companyId}
          events={events}
          assignments={assignments}
        />
      )}
    </div>
  );
}
