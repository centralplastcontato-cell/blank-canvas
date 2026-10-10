// Aviso "⏰ Tarefa vence amanhã": vai só para o responsável (ou, sem responsável,
// para quem criou). Antes ia para todas as pessoas da empresa.
// O modelo da tarefa que se repete e a repetição do mesmo dia viram um aviso só.

export interface ReminderTask {
  id: string;
  assigned_to: string | null;
  created_by: string | null;
  is_recurring?: boolean | null;
  parent_task_id?: string | null;
}

export function taskReminders<T extends ReminderTask>(tasks: T[]): { task: T; userId: string }[] {
  const withChild = new Set(tasks.map((t) => t.parent_task_id).filter(Boolean));
  const out: { task: T; userId: string }[] = [];
  for (const task of tasks) {
    if (task.is_recurring && !task.parent_task_id && withChild.has(task.id)) continue;
    const userId = task.assigned_to || task.created_by;
    if (userId) out.push({ task, userId });
  }
  return out;
}
