import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLog";

export type TaskStatus = "pendente" | "em_andamento" | "concluida";

export interface CompanyTask {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: TaskStatus;
}

export type RecurrenceType = "diaria" | "semanal" | "mensal" | "personalizada";

export const RECURRENCE_OPTIONS = [
  { value: "diaria" as RecurrenceType, label: "Diária", icon: "📅" },
  { value: "semanal" as RecurrenceType, label: "Semanal", icon: "🗓️" },
  { value: "mensal" as RecurrenceType, label: "Mensal", icon: "📆" },
];

export const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export type TaskFormData = {
  title: string;
  description?: string;
  category: string;
  priority: string;
  due_date?: string;
  due_time?: string;
  assigned_to?: string | null;
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType | null;
  recurrence_interval?: number;
  recurrence_days?: number[] | null;
  recurrence_end_date?: string | null;
  event_id?: string | null;
  lead_id?: string | null;
};

export const TASK_CATEGORIES = [
  { value: "compras", label: "Compras", emoji: "🛒" },
  { value: "manutencao", label: "Manutenção", emoji: "🔧" },
  { value: "administrativo", label: "Administrativo", emoji: "📋" },
  { value: "financeiro", label: "Financeiro", emoji: "💰" },
  { value: "equipe", label: "Equipe", emoji: "👥" },
  { value: "evento", label: "Evento", emoji: "🎉" },
  { value: "limpeza", label: "Limpeza", emoji: "🧹" },
  { value: "marketing", label: "Marketing", emoji: "📣" },
  { value: "estoque", label: "Estoque", emoji: "📦" },
  { value: "fornecedores", label: "Fornecedores", emoji: "🤝" },
  { value: "outros", label: "Outros", emoji: "📌" },
];

export const TASK_PRIORITIES = [
  { value: "baixa", label: "Baixa", color: "text-blue-600 bg-blue-100 border-blue-200" },
  { value: "media", label: "Média", color: "text-amber-600 bg-amber-100 border-amber-200" },
  { value: "alta", label: "Alta", color: "text-orange-600 bg-orange-100 border-orange-200" },
  { value: "urgente", label: "Urgente", color: "text-red-600 bg-red-100 border-red-200" },
];

export const TASK_STATUSES = [
  { value: "pendente" as TaskStatus, label: "Pendente", icon: "⏳", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "em_andamento" as TaskStatus, label: "Em andamento", icon: "🔄", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "concluida" as TaskStatus, label: "Concluída", icon: "✅", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

export function useTasks() {
  const { currentCompany } = useCompany();
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("company_tasks")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast({ title: "Erro ao carregar tarefas", variant: "destructive" });
    } else {
      setTasks((data || []).map(d => ({ ...d, status: (d as any).status || (d.completed ? 'concluida' : 'pendente') })) as CompanyTask[]);
    }
    setLoading(false);
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data: TaskFormData, userId: string) => {
    if (!currentCompany?.id) return;
    const { error } = await supabase.from("company_tasks").insert({
      company_id: currentCompany.id,
      title: data.title,
      description: data.description || null,
      category: data.category,
      priority: data.priority,
      due_date: data.due_date || null,
      due_time: data.due_time || null,
      assigned_to: data.assigned_to || null,
      created_by: userId,
      status: "pendente",
      is_recurring: data.is_recurring || false,
      recurrence_type: data.recurrence_type || null,
      recurrence_interval: data.recurrence_interval || 1,
      recurrence_days: data.recurrence_days || null,
      recurrence_end_date: data.recurrence_end_date || null,
      event_id: data.event_id || null,
      lead_id: data.lead_id || null,
    } as any);
    if (error) {
      toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: data.is_recurring ? "Tarefa recorrente criada!" : "Tarefa criada!" });
      logActivity({ companyId: currentCompany.id, action: 'create', module: 'agenda', entityType: 'task', entityName: data.title, details: { category: data.category, priority: data.priority, is_recurring: data.is_recurring } });
      fetchTasks();
    }
  };

  const updateTask = async (id: string, data: Partial<TaskFormData>) => {
    const { error } = await supabase.from("company_tasks").update(data).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
    } else {
      if (currentCompany?.id) logActivity({ companyId: currentCompany.id, action: 'update', module: 'agenda', entityType: 'task', entityId: id });
      fetchTasks();
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    const newStatus: TaskStatus = completed ? "concluida" : "pendente";
    const { error } = await supabase
      .from("company_tasks")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      if (currentCompany?.id) logActivity({ companyId: currentCompany.id, action: 'status_change', module: 'agenda', entityType: 'task', entityId: id, details: { new_status: newStatus } });
      fetchTasks();
    }
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase
      .from("company_tasks")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("company_tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa excluída" });
      fetchTasks();
    }
  };

  return { tasks, loading, fetchTasks, createTask, updateTask, toggleComplete, updateStatus, deleteTask };
}
