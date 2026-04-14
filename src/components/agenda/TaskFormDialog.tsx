import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Repeat, Info, Link2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES, TASK_PRIORITIES, RECURRENCE_OPTIONS, WEEKDAYS, type TaskFormData, type CompanyTask, type RecurrenceType } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: CompanyTask | null;
  presetEventId?: string | null;
  presetLeadId?: string | null;
}

export function TaskFormDialog({ open, onOpenChange, onSubmit, initialData, presetEventId, presetLeadId }: TaskFormDialogProps) {
  const { currentCompany } = useCompany();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("outros");
  const [priority, setPriority] = useState("media");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("semanal");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string; child_name?: string; parent_names?: string; lead_phone?: string }>>([]);
  const [eventPopoverOpen, setEventPopoverOpen] = useState(false);

  // Fetch events for linking (with lead info for search)
  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    supabase
      .from("company_events")
      .select("id, title, event_date, child_name, parent_names, lead_id, campaign_leads(name, whatsapp)")
      .eq("company_id", currentCompany.id)
      .neq("status", "cancelado")
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        setEvents((data || []).map((ev: any) => ({
          id: ev.id,
          title: ev.title,
          event_date: ev.event_date,
          child_name: ev.child_name || undefined,
          parent_names: ev.parent_names || ev.campaign_leads?.name || undefined,
          lead_phone: ev.campaign_leads?.whatsapp || undefined,
        })));
      });
  }, [open, currentCompany?.id]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setCategory(initialData.category);
        setPriority(initialData.priority);
        setDueDate(initialData.due_date || "");
        setDueTime(initialData.due_time || "");
        const taskAny = initialData as any;
        setIsRecurring(taskAny.is_recurring || false);
        setRecurrenceType(taskAny.recurrence_type || "semanal");
        setRecurrenceInterval(taskAny.recurrence_interval || 1);
        setRecurrenceDays(taskAny.recurrence_days || []);
        setRecurrenceEndDate(taskAny.recurrence_end_date || "");
        setEventId(taskAny.event_id || null);
      } else {
        setTitle("");
        setDescription("");
        setCategory("outros");
        setPriority("media");
        setDueDate("");
        setDueTime("");
        setIsRecurring(false);
        setRecurrenceType("semanal");
        setRecurrenceInterval(1);
        setRecurrenceDays([]);
        setRecurrenceEndDate("");
        setEventId(presetEventId || null);
      }
    }
  }, [open, initialData, presetEventId]);

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      due_date: dueDate || undefined,
      due_time: dueTime || undefined,
      is_recurring: isRecurring,
      recurrence_type: isRecurring ? recurrenceType : null,
      recurrence_interval: isRecurring ? recurrenceInterval : 1,
      recurrence_days: isRecurring && recurrenceType === "semanal" ? recurrenceDays : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      event_id: eventId || null,
      lead_id: presetLeadId || null,
    });
    onOpenChange(false);
  };

  const recurrenceLabel = () => {
    if (!isRecurring) return "";
    const interval = recurrenceInterval > 1 ? `a cada ${recurrenceInterval} ` : "";
    switch (recurrenceType) {
      case "diaria": return `Repete ${interval}dia${recurrenceInterval > 1 ? "s" : ""}`;
      case "semanal": {
        const days = recurrenceDays.map(d => WEEKDAYS.find(w => w.value === d)?.label).filter(Boolean).join(", ");
        return `Repete ${interval}semana${recurrenceInterval > 1 ? "s" : ""}${days ? ` (${days})` : ""}`;
      }
      case "mensal": return `Repete ${interval}mês${recurrenceInterval > 1 ? "es" : ""}`;
      default: return "Recorrente";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Comprar decoração para festa" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={3} className="bg-white dark:bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label>Data limite</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-10" />
            </div>
            <div className="min-w-0">
              <Label>Horário</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="w-full h-10" />
            </div>
          </div>

          {/* Event Link Section */}
          {!presetEventId && (
            <div>
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                Vincular a evento (opcional)
              </Label>
              <Popover open={eventPopoverOpen} onOpenChange={setEventPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full mt-1 justify-between font-normal h-10 text-sm">
                    {eventId
                      ? (() => {
                          const ev = events.find((e) => e.id === eventId);
                          return ev ? `🎉 ${ev.title} — ${new Date(ev.event_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : "Evento selecionado";
                        })()
                      : "Buscar evento..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por criança, pais ou telefone..." />
                    <CommandList>
                      <CommandEmpty>Nenhum evento encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => { setEventId(null); setEventPopoverOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !eventId ? "opacity-100" : "opacity-0")} />
                          Nenhum
                        </CommandItem>
                        {events.map((ev) => {
                          const searchValue = [ev.title, ev.child_name, ev.parent_names, ev.lead_phone].filter(Boolean).join(" ");
                          return (
                            <CommandItem
                              key={ev.id}
                              value={searchValue}
                              onSelect={() => { setEventId(ev.id); setEventPopoverOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", eventId === ev.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">🎉 {ev.title} — {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                {(ev.child_name || ev.parent_names || ev.lead_phone) && (
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {[ev.child_name, ev.parent_names, ev.lead_phone].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Recurrence Section */}
          <div className={cn(
            "rounded-xl border-2 p-4 space-y-3 transition-all",
            isRecurring 
              ? "border-primary/40 bg-primary/5" 
              : "border-primary/25 bg-primary/[0.03]"
          )}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/15">
                  <Repeat className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Tarefa recorrente</span>
                  <span className="text-[11px] text-muted-foreground">Repetir automaticamente</span>
                </div>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </label>

            {isRecurring && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs">Frequência</Label>
                    <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-xs">
                            {r.icon} {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs">A cada X {recurrenceType === "diaria" ? "dias" : recurrenceType === "semanal" ? "semanas" : "meses"}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {recurrenceType === "semanal" && (
                  <div>
                    <Label className="text-xs">Dias da semana</Label>
                    <div className="flex gap-1 mt-1">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-medium rounded-lg border transition-all",
                            recurrenceDays.includes(day.value)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 text-muted-foreground border-border/40 hover:border-border"
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Repetir até (opcional)</Label>
                  <Input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {recurrenceLabel()}
                    {recurrenceEndDate && ` até ${new Date(recurrenceEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={handleSubmit} disabled={!title.trim()} className="w-full sm:w-auto">
            {initialData ? "Salvar" : isRecurring ? "Criar Recorrente" : "Criar"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}