import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Clock, Pencil, Trash2, Repeat, Link2, Calendar, FileText, AlertTriangle, CheckCircle2, PartyPopper } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, RECURRENCE_OPTIONS, WEEKDAYS, type CompanyTask, type TaskStatus } from "@/hooks/useTasks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: CompanyTask | null;
  onEdit: (task: CompanyTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function TaskDetailSheet({ open, onOpenChange, task, onEdit, onDelete, onStatusChange }: TaskDetailSheetProps) {
  const [linkedEvent, setLinkedEvent] = useState<{ id: string; title: string; event_date: string; start_time?: string } | null>(null);

  const taskAny = task as any;

  useEffect(() => {
    if (!open || !taskAny?.event_id) {
      setLinkedEvent(null);
      return;
    }
    supabase
      .from("company_events")
      .select("id, title, event_date, start_time")
      .eq("id", taskAny.event_id)
      .single()
      .then(({ data }) => setLinkedEvent(data || null));
  }, [open, taskAny?.event_id]);

  if (!task) return null;

  const cat = TASK_CATEGORIES.find((c) => c.value === task.category);
  const pri = TASK_PRIORITIES.find((p) => p.value === task.priority);
  const currentStatus = TASK_STATUSES.find((s) => s.value === task.status) || TASK_STATUSES[0];
  const recurrence = taskAny?.is_recurring ? RECURRENCE_OPTIONS.find(r => r.value === taskAny.recurrence_type) : null;

  const isOverdue = task.due_date && !task.completed && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  const recurrenceLabel = () => {
    if (!recurrence) return "";
    const interval = (taskAny.recurrence_interval || 1) > 1 ? `a cada ${taskAny.recurrence_interval} ` : "";
    switch (taskAny.recurrence_type) {
      case "diaria": return `Repete ${interval}dia${(taskAny.recurrence_interval || 1) > 1 ? "s" : ""}`;
      case "semanal": {
        const days = (taskAny.recurrence_days || []).map((d: number) => WEEKDAYS.find(w => w.value === d)?.label).filter(Boolean).join(", ");
        return `Repete ${interval}semana${(taskAny.recurrence_interval || 1) > 1 ? "s" : ""}${days ? ` (${days})` : ""}`;
      }
      case "mensal": return `Repete ${interval}mês${(taskAny.recurrence_interval || 1) > 1 ? "es" : ""}`;
      default: return "Recorrente";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-5 pb-3">
          <div>
            <SheetTitle className="text-lg font-bold leading-tight text-left">
              {task.title}
            </SheetTitle>
            {cat && (
              <p className="text-sm text-muted-foreground mt-1">
                {cat.emoji} {cat.label}
              </p>
            )}
          </div>
        </SheetHeader>

        <div className="px-5 space-y-5 pb-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 shrink-0">Status</span>
            <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}>
              <SelectTrigger className={cn("h-9 w-auto min-w-[160px] text-sm font-medium border", currentStatus.color)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.icon} {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          {pri && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">Prioridade</span>
              <Badge variant="outline" className={cn("text-xs px-2 py-0.5 border", pri.color)}>
                {pri.label}
              </Badge>
            </div>
          )}

          {/* Due date */}
          {task.due_date && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">Prazo</span>
              <div className={cn(
                "flex items-center gap-1.5 text-sm font-medium",
                isOverdue ? "text-red-600" : isDueToday ? "text-amber-600" : "text-foreground"
              )}>
                <Calendar className="h-4 w-4" />
                {format(parseISO(task.due_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                {task.due_time && (
                  <span className="text-muted-foreground ml-1">
                    <Clock className="h-3.5 w-3.5 inline mr-0.5" />
                    {task.due_time.slice(0, 5)}
                  </span>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px] ml-1">
                    <AlertTriangle className="h-3 w-3 mr-0.5" /> Atrasada
                  </Badge>
                )}
                {isDueToday && (
                  <Badge className="text-[10px] ml-1 bg-amber-100 text-amber-700 border-amber-200">
                    Hoje
                  </Badge>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Description */}
          {task.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Descrição</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-6">
                {task.description}
              </p>
            </div>
          )}

          {/* Recurrence */}
          {recurrence && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Tarefa Recorrente</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pl-6">
                {recurrenceLabel()}
                {taskAny.recurrence_end_date && ` · Até ${format(parseISO(taskAny.recurrence_end_date), "dd/MM/yyyy")}`}
              </p>
            </div>
          )}

          {/* Linked Event */}
          {linkedEvent && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Evento Vinculado</span>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/20 p-3 ml-6">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">{linkedEvent.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-6">
                    {format(parseISO(linkedEvent.event_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    {linkedEvent.start_time && ` · ${linkedEvent.start_time.slice(0, 5)}`}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onEdit(task);
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onDelete(task.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-[11px] text-muted-foreground/60 space-y-0.5">
            <p>Criada em {format(parseISO(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            {task.completed_at && (
              <p className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Concluída em {format(parseISO(task.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
