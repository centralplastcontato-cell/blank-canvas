import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, CheckCircle2, Clock, AlertTriangle, ListChecks, PlayCircle, Repeat, ChevronDown } from "lucide-react";
import { useTasks, TASK_CATEGORIES, type CompanyTask, type TaskFormData } from "@/hooks/useTasks";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyPeople } from "@/hooks/useCompanyPeople";
import { describeRecurrence, isSeriesActive, nextSeriesDate, withoutDuplicateSeries } from "@/lib/taskOccurrences";
import { cn } from "@/lib/utils";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskCard } from "./TaskCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TaskProductivityDashboard } from "./TaskProductivityDashboard";
// Modelos de tarefa por festa escondidos (out/2026): nunca criaram tarefas sozinhos
// import { EventTaskTemplateManager } from "./EventTaskTemplateManager";

interface AgendaTarefasTabProps {
  userId: string;
}

// Atrasada = venceu antes de hoje (a que vence hoje ainda está no prazo).
// Compara as datas como texto "aaaa-mm-dd": new Date("2026-10-09") é meia-noite UTC,
// que em Brasília ainda é o dia anterior.
function isOverdueTask(t: CompanyTask, todayYmd: string): boolean {
  return t.status !== "concluida" && !!t.due_date && t.due_date.slice(0, 10) < todayYmd;
}

export function AgendaTarefasTab({ userId }: AgendaTarefasTabProps) {
  const { tasks, loading, createTask, updateTask, toggleComplete, updateStatus, deleteTask, stopRecurring } = useTasks();
  const { currentCompany } = useCompany();
  const people = useCompanyPeople(currentCompany?.id);
  const names = useMemo(() => new Map(people.map((p) => [p.user_id, p.full_name || "Sem nome"])), [people]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CompanyTask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stopSeries, setStopSeries] = useState<CompanyTask | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in_progress" | "completed" | "overdue">("all");
  // "all" | "mine" | "none" | id da pessoa
  const [filterPerson, setFilterPerson] = useState("all");

  const todayYmd = format(new Date(), "yyyy-MM-dd");

  // Sem o modelo da tarefa que se repete quando o robô já criou a do mesmo dia
  const listed = useMemo(() => withoutDuplicateSeries(tasks), [tasks]);
  const activeSeries = useMemo(() => tasks.filter((t) => isSeriesActive(t, todayYmd)), [tasks, todayYmd]);

  const filtered = useMemo(() => {
    return listed.filter((t) => {
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterStatus === "overdue" && !isOverdueTask(t, todayYmd)) return false;
      if (filterStatus === "pending" && t.status !== "pendente") return false;
      if (filterStatus === "in_progress" && t.status !== "em_andamento") return false;
      if (filterStatus === "completed" && t.status !== "concluida") return false;
      if (filterPerson === "mine" && t.assigned_to !== userId) return false;
      if (filterPerson === "none" && t.assigned_to) return false;
      if (!["all", "mine", "none"].includes(filterPerson) && t.assigned_to !== filterPerson) return false;
      return true;
    });
  }, [listed, filterCategory, filterStatus, filterPerson, todayYmd, userId]);

  const pendingCount = listed.filter((t) => t.status === "pendente").length;
  const inProgressCount = listed.filter((t) => t.status === "em_andamento").length;
  const completedCount = listed.filter((t) => t.status === "concluida").length;
  const overdueCount = listed.filter((t) => isOverdueTask(t, todayYmd)).length;

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
            onClick={() => setFilterStatus("overdue")}
          >
            Ver atrasadas
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{pendingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <PlayCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{completedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Concluídas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{overdueCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarefas que se repetem: a regra de cada uma e o botão para parar */}
      {activeSeries.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] shadow-sm">
          <button
            type="button"
            onClick={() => setSeriesOpen((v) => !v)}
            className="w-full flex items-center gap-3 p-3 md:p-4 text-left"
            aria-expanded={seriesOpen}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Repeat className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                Tarefas que se repetem <span className="text-muted-foreground font-medium">· {activeSeries.length}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">O sistema cria cada vez sozinho, 7 dias antes. Aqui dá para parar.</p>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", seriesOpen && "rotate-180")} />
          </button>
          {seriesOpen && (
            <div className="px-3 pb-3 md:px-4 md:pb-4 space-y-2">
              {activeSeries.map((s) => {
                const next = nextSeriesDate(s, tasks, todayYmd);
                return (
                  <div key={s.id} className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {describeRecurrence(s)}
                        {next && ` · próxima ${format(new Date(next + "T12:00:00"), "dd/MM")}`}
                        {s.assigned_to && names.get(s.assigned_to) ? ` · ${names.get(s.assigned_to)}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 rounded-full shrink-0" onClick={() => setStopSeries(s)}>
                      Parar de repetir
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Productivity Dashboard */}
      <TaskProductivityDashboard tasks={listed} names={names} />

      {/* Filters + add */}
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="sm:w-[160px] h-9 text-xs rounded-xl bg-card">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Categorias</SelectItem>
            {TASK_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="sm:w-[160px] h-9 text-xs rounded-xl bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">⏳ Pendentes</SelectItem>
            <SelectItem value="in_progress">🔄 Em andamento</SelectItem>
            <SelectItem value="completed">✅ Concluídas</SelectItem>
            <SelectItem value="overdue">⚠️ Atrasadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPerson} onValueChange={setFilterPerson}>
          <SelectTrigger className="sm:w-[170px] h-9 text-xs rounded-xl bg-card">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pessoas</SelectItem>
            <SelectItem value="mine">👤 Minhas tarefas</SelectItem>
            <SelectItem value="none">Sem responsável</SelectItem>
            {people.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden sm:block flex-1" />
        <Button size="sm" className="col-span-3 h-10 rounded-full sm:h-9" onClick={() => { setEditingTask(null); setFormOpen(true); }}>
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
                  assigneeName={task.assigned_to ? names.get(task.assigned_to) : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Task Templates */}
      {/* <EventTaskTemplateManager /> — escondido (out/2026) */}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingTask}
      />

      <AlertDialog open={!!stopSeries} onOpenChange={(open) => { if (!open) setStopSeries(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Parar de repetir "{stopSeries?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O sistema não cria mais essa tarefa. As que já passaram e a de hoje continuam na lista; as próximas que ainda nem começaram saem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (stopSeries) { stopRecurring(stopSeries); setStopSeries(null); } }}>
              Parar de repetir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
              {deleteId && activeSeries.some((t) => t.id === deleteId) && " Ela também para de se repetir (as vezes já criadas continuam na lista)."}
            </AlertDialogDescription>
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
