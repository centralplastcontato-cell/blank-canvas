import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Type, CheckCircle2, Loader2, MessageSquare, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  package_name: string | null;
  event_type: string | null;
}

interface WeekOption {
  weekNumber: number;
  start: Date;
  end: Date;
  label: string;
}

export function CreateScheduleDialog({ open, onOpenChange, onCreated }: Props) {
  const companyId = useCurrentCompanyId();
  const [title, setTitle] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate weeks for current month
  const weeks = useMemo<WeekOption[]>(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weekStarts = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 0 }
    );

    return weekStarts.map((ws, i) => {
      const wStart = startOfWeek(ws, { weekStartsOn: 0 });
      const wEnd = endOfWeek(ws, { weekStartsOn: 0 });
      // Clamp to month boundaries
      const clampedStart = wStart < monthStart ? monthStart : wStart;
      const clampedEnd = wEnd > monthEnd ? monthEnd : wEnd;
      return {
        weekNumber: i + 1,
        start: clampedStart,
        end: clampedEnd,
        label: `${format(clampedStart, "dd/MM")} - ${format(clampedEnd, "dd/MM")}`,
      };
    });
  }, [currentMonth]);

  const startDate = selectedWeek !== null ? weeks[selectedWeek]?.start : undefined;
  const endDate = selectedWeek !== null ? weeks[selectedWeek]?.end : undefined;

  // Fetch events when week changes
  useEffect(() => {
    if (!startDate || !endDate || !companyId) { setEvents([]); return; }
    const fetchEvents = async () => {
      setLoadingEvents(true);
      const { data } = await supabase
        .from("company_events")
        .select("id, title, event_date, start_time, end_time, package_name, event_type")
        .eq("company_id", companyId)
        .gte("event_date", format(startDate, "yyyy-MM-dd"))
        .lte("event_date", format(endDate, "yyyy-MM-dd"))
        .order("event_date", { ascending: true });
      setEvents(data || []);
      setSelectedEventIds((data || []).map(e => e.id));
      setLoadingEvents(false);
    };
    fetchEvents();
  }, [startDate, endDate, companyId]);

  // Auto-suggest title when week is selected
  useEffect(() => {
    if (selectedWeek !== null && !title) {
      const monthName = format(currentMonth, "MMMM", { locale: ptBR });
      setTitle(`Escala Semana ${selectedWeek + 1} ${monthName}`);
    }
  }, [selectedWeek]);

  const handleSelectWeek = (index: number) => {
    if (selectedWeek === index) {
      setSelectedWeek(null);
      setTitle("");
    } else {
      setSelectedWeek(index);
      const monthName = format(currentMonth, "MMMM", { locale: ptBR });
      setTitle(`Escala Semana ${index + 1} ${monthName}`);
    }
  };

  const toggleEvent = (id: string) => {
    setSelectedEventIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allSelected = events.length > 0 && selectedEventIds.length === events.length;
  const toggleAll = () => {
    setSelectedEventIds(allSelected ? [] : events.map(e => e.id));
  };

  const handleSubmit = async () => {
    if (!companyId || !startDate || !endDate || selectedEventIds.length === 0) return;
    setSubmitting(true);

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;

    const { error } = await supabase.from("freelancer_schedules").insert({
      company_id: companyId,
      title,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      event_ids: selectedEventIds,
      slug,
      notes: notes.trim() || null,
    } as any);

    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao criar escala", variant: "destructive" });
    } else {
      toast({ title: "Escala criada com sucesso!" });
      onOpenChange(false);
      setTitle(""); setNotes(""); setSelectedWeek(null); setEvents([]); setSelectedEventIds([]);
      onCreated();
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth(prev => direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1));
    setSelectedWeek(null);
    setTitle("");
    setEvents([]);
    setSelectedEventIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Nova Escala
          </DialogTitle>
          <DialogDescription>
            Selecione a semana e as festas para a escala.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Título */}
          <div>
            <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Título
            </label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Escala Semana 3" className="h-12" />
          </div>

          {/* Month navigator + Week selector */}
          <div>
            <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Semana
            </label>
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 min-h-[160px]">
              {weeks.map((w, i) => (
                <Button
                  key={i}
                  type="button"
                  variant={selectedWeek === i ? "default" : "outline"}
                  className="h-auto py-2.5 px-3 flex flex-col items-start text-left"
                  onClick={() => handleSelectWeek(i)}
                >
                  <span className="text-xs font-semibold">Semana {w.weekNumber}</span>
                  <span className={`text-[10px] ${selectedWeek === i ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {w.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loadingEvents && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

          {/* Festas do período */}
          {events.length > 0 && (
            <div className="border-l-4 border-l-primary/40 pl-4 rounded-r-xl bg-primary/5 py-3 pr-3">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Festas do período ({events.length})
                </label>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={toggleAll}>
                  {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {events.map(ev => {
                  const dateObj = parseISO(ev.event_date);
                  const dayName = format(dateObj, "EEE", { locale: ptBR });
                  const isSelected = selectedEventIds.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-card border-primary/30 shadow-sm"
                          : "bg-card/50 border-border hover:bg-accent/30"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEvent(ev.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayName} {format(dateObj, "dd/MM")}
                          {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                          {ev.end_time && `-${ev.end_time.slice(0, 5)}`}
                        </p>
                      </div>
                      {ev.event_type && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {ev.event_type}
                        </Badge>
                      )}
                      {ev.package_name && !ev.event_type && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ev.package_name}
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {selectedWeek !== null && !loadingEvents && events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma festa encontrada nesta semana.</p>
          )}

          {/* Observações */}
          <div>
            <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Observações / Instruções
            </label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Chegar 30min antes, usar camiseta preta, trazer documento..."
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{notes.length}/500</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !title || selectedEventIds.length === 0} className="h-12 shadow-md">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Criar Escala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
