import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, CheckCircle2, Clock, AlertTriangle, ListChecks, PlayCircle } from "lucide-react";
import { useTasks, TASK_CATEGORIES, type CompanyTask, type TaskFormData } from "@/hooks/useTasks";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskCard } from "./TaskCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AgendaTarefasTabProps {
  userId: string;
}

export function AgendaTarefasTab({ userId }: AgendaTarefasTabProps) {
  const { tasks, loading, createTask, updateTask, toggleComplete, updateStatus, deleteTask } = useTasks();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CompanyTask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterStatus === "pending" && t.status !== "pendente") return false;
      if (filterStatus === "in_progress" && t.status !== "em_andamento") return false;
      if (filterStatus === "completed" && t.status !== "concluida") return false;
      return true;
    });
  }, [tasks, filterCategory, filterStatus]);

  const pendingCount = tasks.filter((t) => t.status === "pendente").length;
  const inProgressCount = tasks.filter((t) => t.status === "em_andamento").length;
  const completedCount = tasks.filter((t) => t.status === "concluida").length;
  const overdueCount = tasks.filter((t) => {
    if (t.status === "concluida" || !t.due_date) return false;
    return new Date(t.due_date) < new Date(new Date().toDateString());
  }).length;

  const handleSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      createTask(data, userId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200/60 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800/40">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {overdueCount} tarefa{overdueCount > 1 ? "s" : ""} atrasada{overdueCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70">
              Revise e atualize o status das tarefas vencidas para manter a operação em dia.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400"
            onClick={() => setFilterStatus("pending")}
          >
            Ver atrasadas
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/30">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <PlayCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{inProgressCount}</p>
              <p className="text-[10px] text-muted-foreground">Em andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{completedCount}</p>
              <p className="text-[10px] text-muted-foreground">Concluídas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{overdueCount}</p>
              <p className="text-[10px] text-muted-foreground">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + add */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {TASK_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">⏳ Pendentes</SelectItem>
            <SelectItem value="in_progress">🔄 Em andamento</SelectItem>
            <SelectItem value="completed">✅ Concluídas</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setEditingTask(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {/* Task list */}
      <Card className="border-border/30">
        <CardContent className="p-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ListChecks className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">Nenhuma tarefa encontrada</p>
              <Button variant="outline" size="sm" onClick={() => { setEditingTask(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeira tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onStatusChange={updateStatus}
                  onEdit={(t) => { setEditingTask(t); setFormOpen(true); }}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingTask}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteTask(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
