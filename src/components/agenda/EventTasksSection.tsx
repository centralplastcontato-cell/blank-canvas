import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_STATUSES, TASK_PRIORITIES, type TaskStatus, type TaskFormData } from "@/hooks/useTasks";
import { TaskFormDialog } from "./TaskFormDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface EventTasksSectionProps {
  eventId: string;
  userId: string;
  companyId: string;
}

interface EventTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  completed: boolean;
}

export function EventTasksSection({ eventId, userId, companyId }: EventTasksSectionProps) {
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_tasks")
      .select("id, title, status, priority, due_date, due_time, completed")
      .eq("event_id", eventId)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: false });
    setTasks((data || []) as EventTask[]);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await supabase.from("company_tasks").update({ status: newStatus }).eq("id", taskId);
    fetchTasks();
  };

  const handleCreate = async (data: TaskFormData) => {
    const { error } = await supabase.from("company_tasks").insert({
      company_id: companyId,
      title: data.title,
      description: data.description || null,
      category: data.category,
      priority: data.priority,
      due_date: data.due_date || null,
      due_time: data.due_time || null,
      created_by: userId,
      status: "pendente",
      event_id: eventId,
      is_recurring: false,
    } as any);
    if (error) {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    } else {
      toast({ title: "Tarefa vinculada criada!" });
      fetchTasks();
    }
  };

  const pendingCount = tasks.filter(t => t.status !== "concluida").length;
  const completedCount = tasks.filter(t => t.status === "concluida").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Tarefas</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setFormOpen(true)}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhuma tarefa vinculada a este evento.</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const pri = TASK_PRIORITIES.find(p => p.value === task.priority);
            const currentStatus = TASK_STATUSES.find(s => s.value === task.status) || TASK_STATUSES[0];
            return (
              <div key={task.id} className={cn(
                "flex items-center gap-2 p-2 rounded-lg border text-xs transition-all",
                task.status === "concluida" ? "opacity-50 bg-muted/20" : "bg-card"
              )}>
                <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}>
                  <SelectTrigger className={cn("h-6 w-auto min-w-[100px] text-[10px] font-medium border shrink-0", currentStatus.color)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.icon} {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={cn("flex-1 truncate", task.status === "concluida" && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
                {pri && (
                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 shrink-0", pri.color)}>
                    {pri.label}
                  </Badge>
                )}
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(task.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {completedCount > 0 && pendingCount > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
          </div>
          {completedCount}/{tasks.length}
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        presetEventId={eventId}
      />
    </div>
  );
}
