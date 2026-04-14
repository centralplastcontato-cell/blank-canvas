import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Clock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, RECURRENCE_OPTIONS, type CompanyTask, type TaskStatus } from "@/hooks/useTasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskCardProps {
  task: CompanyTask;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: CompanyTask) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onToggle, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const cat = TASK_CATEGORIES.find((c) => c.value === task.category);
  const pri = TASK_PRIORITIES.find((p) => p.value === task.priority);
  const currentStatus = TASK_STATUSES.find((s) => s.value === task.status) || TASK_STATUSES[0];
  const taskAny = task as any;
  const recurrence = taskAny.is_recurring ? RECURRENCE_OPTIONS.find(r => r.value === taskAny.recurrence_type) : null;

  const isOverdue = task.due_date && !task.completed && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus as TaskStatus);
    } else {
      onToggle(task.id, newStatus === "concluida");
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 group",
        task.status === "concluida"
          ? "bg-muted/30 border-border/20 opacity-60"
          : task.status === "em_andamento"
            ? "bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30"
            : isOverdue
              ? "bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30"
              : "bg-card border-border/40 hover:shadow-sm hover:border-border/60"
      )}
    >
      <Select value={task.status} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(
          "h-7 w-[120px] text-[10px] font-medium border shrink-0 mt-0.5",
          currentStatus.color
        )}>
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
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-tight", task.status === "concluida" && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {cat && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {cat.emoji} {cat.label}
            </Badge>
          )}
          {recurrence && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border border-primary/30 text-primary bg-primary/5">
              <Repeat className="h-2.5 w-2.5 mr-0.5" />
              {recurrence.label}
            </Badge>
          )}
          {pri && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-normal border", pri.color)}>
              {pri.label}
            </Badge>
          )}
          {task.due_date && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px]",
              isOverdue ? "text-red-600 font-semibold" : isDueToday ? "text-amber-600 font-semibold" : "text-muted-foreground"
            )}>
              <Clock className="h-3 w-3" />
              {format(parseISO(task.due_date), "dd/MM", { locale: ptBR })}
              {task.due_time && ` ${task.due_time.slice(0, 5)}`}
              {isOverdue && " (atrasada)"}
              {isDueToday && " (hoje)"}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(task.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
