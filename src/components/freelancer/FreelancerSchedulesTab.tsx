import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Copy, ChevronDown, ChevronUp, Users, FileDown, Trash2, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { generateSchedulePDF } from "./SchedulePDFGenerator";

interface Schedule {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  slug: string | null;
  is_active: boolean;
  created_at: string;
}

interface EventData {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  package_name: string | null;
  event_type: string | null;
}

interface Availability {
  id: string;
  schedule_id: string;
  freelancer_name: string;
  freelancer_phone: string;
  available_event_ids: string[];
}

interface Assignment {
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

  const loadScheduleDetails = async (schedule: Schedule) => {
    if (expandedId === schedule.id) { setExpandedId(null); return; }
    setExpandedId(schedule.id);

    // Fetch events for this schedule
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

    // Fetch availability
    const { data: avData } = await supabase
      .from("freelancer_availability")
      .select("*")
      .eq("schedule_id", schedule.id);
    setAvailability((avData as any[]) || []);

    // Fetch assignments
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Escalas de Freelancer</h2>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Escala
        </Button>
      </div>

      {schedules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma escala criada ainda.</p>
            <p className="text-sm text-muted-foreground">Crie uma escala para que freelancers informem disponibilidade.</p>
          </CardContent>
        </Card>
      )}

      {schedules.map(schedule => {
        const isExpanded = expandedId === schedule.id;
        const startStr = format(parseISO(schedule.start_date), "dd/MM", { locale: ptBR });
        const endStr = format(parseISO(schedule.end_date), "dd/MM", { locale: ptBR });
        const availCount = availability.filter(a => a.schedule_id === schedule.id).length;
        const assignCount = assignments.filter(a => a.schedule_id === schedule.id).length;

        return (
          <Card key={schedule.id}>
            <CardHeader className="cursor-pointer pb-3" onClick={() => loadScheduleDetails(schedule)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    {schedule.title}
                    {schedule.is_active && <Badge variant="secondary" className="text-xs">Ativa</Badge>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {startStr} a {endStr} · {schedule.event_ids.length} festa(s)
                    {isExpanded && availCount > 0 && ` · ${availCount} resposta(s)`}
                    {isExpanded && assignCount > 0 && ` · ${assignCount} escalado(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); copyLink(schedule); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); handleGeneratePDF(schedule); }}>
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); deleteSchedule(schedule.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {schedule.event_ids.map(eventId => {
                  const ev = events[eventId];
                  if (!ev) return null;

                  const dateObj = parseISO(ev.event_date);
                  const dayName = format(dateObj, "EEE", { locale: ptBR });
                  const availForEvent = availability.filter(a => a.schedule_id === schedule.id && a.available_event_ids.includes(eventId));
                  const assignedForEvent = assignments.filter(a => a.schedule_id === schedule.id && a.event_id === eventId);

                  return (
                    <div key={eventId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayName} {format(dateObj, "dd/MM")}
                            {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                            {ev.package_name && ` · ${ev.package_name}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {availForEvent.length} disponível(is)
                        </Badge>
                      </div>

                      {availForEvent.length > 0 && (
                        <div className="space-y-2">
                          {availForEvent.map(av => {
                            const assigned = assignedForEvent.find(a => a.freelancer_name === av.freelancer_name);
                            return (
                              <div key={av.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                                <Checkbox
                                  checked={!!assigned}
                                  onCheckedChange={() => toggleAssignment(schedule.id, eventId, av.freelancer_name, assigned?.role || "")}
                                  disabled={savingAssignment}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{av.freelancer_name}</p>
                                  <p className="text-xs text-muted-foreground">{av.freelancer_phone}</p>
                                </div>
                                {assigned && (
                                  <Select value={assigned.role || "none"} onValueChange={v => updateRole(assigned.id, v === "none" ? "" : v)}>
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue placeholder="Função" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sem função</SelectItem>
                                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                                {assigned && <Check className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {availForEvent.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum freelancer disponível ainda.</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      <CreateScheduleDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetchSchedules} />
    </div>
  );
}
