import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

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
}

export type TaskFormData = {
  title: string;
  description?: string;
  category: string;
  priority: string;
  due_date?: string;
  due_time?: string;
  assigned_to?: string | null;
};

export const TASK_CATEGORIES = [
  { value: "compras", label: "Compras", emoji: "🛒" },
  { value: "manutencao", label: "Manutenção", emoji: "🔧" },
  { value: "administrativo", label: "Administrativo", emoji: "📋" },
  { value: "financeiro", label: "Financeiro", emoji: "💰" },
  { value: "equipe", label: "Equipe", emoji: "👥" },
  { value: "evento", label: "Evento", emoji: "🎉" },
  { value: "outros", label: "Outros", emoji: "📌" },
];

export const TASK_PRIORITIES = [
  { value: "baixa", label: "Baixa", color: "text-blue-600 bg-blue-100 border-blue-200" },
  { value: "media", label: "Média", color: "text-amber-600 bg-amber-100 border-amber-200" },
  { value: "alta", label: "Alta", color: "text-orange-600 bg-orange-100 border-orange-200" },
  { value: "urgente", label: "Urgente", color: "text-red-600 bg-red-100 border-red-200" },
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
      setTasks((data || []) as CompanyTask[]);
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
    });
    if (error) {
      toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa criada!" });
      fetchTasks();
    }
  };

  const updateTask = async (id: string, data: Partial<TaskFormData>) => {
    const { error } = await supabase.from("company_tasks").update(data).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
    } else {
      fetchTasks();
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("company_tasks")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
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

  return { tasks, loading, fetchTasks, createTask, updateTask, toggleComplete, deleteTask };
}
