// Tarefas que se repetem.
// A tarefa "modelo" (is_recurring, sem parent_task_id) é a 1ª vez. O robô
// generate-recurring-tasks cria cada repetição (parent_task_id = modelo) até 7 dias
// antes da data. As datas aqui seguem a mesma regra dele:
//   diária = todo dia · semanal = nos dias escolhidos (sem dia = todo dia) · mensal = no dia da 1ª vez.
import { addDays, format, getDaysInMonth, parseISO } from "date-fns";

export interface RecurringTask {
  id: string;
  due_date: string | null;
  status: string;
  is_recurring?: boolean | null;
  parent_task_id?: string | null;
  recurrence_type?: string | null;
  recurrence_days?: number[] | null;
  recurrence_end_date?: string | null;
}

export interface TaskOccurrence<T> {
  task: T;
  date: string;
  /** a repetição ainda não foi criada pelo robô (só aparece no calendário) */
  forecast: boolean;
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const maxYmd = (...dates: (string | null | undefined)[]) => dates.reduce<string>((a, b) => (b && b > a ? b : a), "");

/** A tarefa modelo de uma série que se repete */
export function isSeries(t: RecurringTask): boolean {
  return !!t.is_recurring && !t.parent_task_id;
}

/** Série que ainda vai se repetir (sem data final ou com data final de hoje em diante) */
export function isSeriesActive(t: RecurringTask, todayYmd: string): boolean {
  return isSeries(t) && (!t.recurrence_end_date || t.recurrence_end_date >= todayYmd);
}

/** Tira o modelo quando o robô já criou a repetição do mesmo dia (senão a tarefa aparece duas vezes) */
export function withoutDuplicateSeries<T extends RecurringTask>(tasks: T[]): T[] {
  const childDays = new Set(tasks.filter((t) => t.parent_task_id && t.due_date).map((t) => `${t.parent_task_id}|${t.due_date}`));
  return tasks.filter((t) => !(isSeries(t) && t.due_date && childDays.has(`${t.id}|${t.due_date}`)));
}

/** Dias em que a série se repete entre from e to (inclusive), a partir da 1ª vez */
export function seriesDates(t: RecurringTask, fromYmd: string, toYmd: string): string[] {
  if (!isSeries(t) || !t.due_date) return [];
  const start = maxYmd(fromYmd, t.due_date);
  const end = t.recurrence_end_date && t.recurrence_end_date < toYmd ? t.recurrence_end_date : toYmd;
  if (start > end) return [];
  const baseDay = Number(t.due_date.slice(8, 10));
  const weekDays = t.recurrence_days && t.recurrence_days.length > 0 ? t.recurrence_days : null;
  const out: string[] = [];
  for (let d = parseISO(start); ymd(d) <= end; d = addDays(d, 1)) {
    if (t.recurrence_type === "diaria") out.push(ymd(d));
    else if (t.recurrence_type === "semanal") {
      if (!weekDays || weekDays.includes(d.getDay())) out.push(ymd(d));
    } else if (t.recurrence_type === "mensal") {
      if (d.getDate() === Math.min(baseDay, getDaysInMonth(d))) out.push(ymd(d));
    }
  }
  return out;
}

/**
 * Tarefas entre from e to: as que existem (sem o modelo duplicado) e, das séries
 * ativas, as próximas repetições que o robô ainda não criou (de hoje em diante).
 */
export function tasksInRange<T extends RecurringTask>(tasks: T[], fromYmd: string, toYmd: string, todayYmd: string): TaskOccurrence<T>[] {
  const out: TaskOccurrence<T>[] = withoutDuplicateSeries(tasks)
    .filter((t) => t.due_date && t.due_date >= fromYmd && t.due_date <= toYmd)
    .map((t) => ({ task: t, date: t.due_date as string, forecast: false }));

  const lastChild = new Map<string, string>();
  for (const t of tasks) {
    if (t.parent_task_id && t.due_date && t.due_date > (lastChild.get(t.parent_task_id) || "")) lastChild.set(t.parent_task_id, t.due_date);
  }
  for (const s of tasks) {
    if (!isSeriesActive(s, todayYmd)) continue;
    const after = maxYmd(lastChild.get(s.id), s.due_date);
    for (const date of seriesDates(s, maxYmd(fromYmd, todayYmd), toYmd)) {
      if (date > after) out.push({ task: s, date, forecast: true });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Próxima vez da série a partir de hoje (já criada e não concluída, ou prevista) */
export function nextSeriesDate(series: RecurringTask, tasks: RecurringTask[], todayYmd: string): string | null {
  const family = tasks.filter((t) => t.id === series.id || t.parent_task_id === series.id);
  const until = ymd(addDays(parseISO(todayYmd), 400));
  const next = tasksInRange(family, todayYmd, until, todayYmd).find((o) => o.forecast || o.task.status !== "concluida");
  return next ? next.date : null;
}

/** "Todo mês, dia 27", "Toda semana: Seg, Qua", "Todo dia" */
export function describeRecurrence(t: RecurringTask): string {
  if (t.recurrence_type === "diaria") return "Todo dia";
  if (t.recurrence_type === "semanal") {
    const days = [...(t.recurrence_days || [])].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).filter(Boolean);
    return days.length > 0 ? `Toda semana: ${days.join(", ")}` : "Todo dia";
  }
  if (t.recurrence_type === "mensal") return t.due_date ? `Todo mês, dia ${Number(t.due_date.slice(8, 10))}` : "Todo mês";
  return "Repete";
}
