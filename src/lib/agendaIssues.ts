// "O que falta resolver" nas próximas festas: dados que faltam e parcela vencida.
// Contrato assinado fica de fora: quase nenhuma empresa marca a assinatura no
// sistema, e a lista viraria só aviso.

export type EventIssue = "parcela_vencida" | "pendente" | "sem_valor" | "sem_horario" | "sem_unidade";

/** Ordem de importância (a primeira aparece antes) */
export const EVENT_ISSUE_ORDER: EventIssue[] = ["parcela_vencida", "pendente", "sem_valor", "sem_horario", "sem_unidade"];

export const EVENT_ISSUE_LABEL: Record<EventIssue, string> = {
  parcela_vencida: "Parcela vencida",
  pendente: "Ainda pendente",
  sem_valor: "Sem valor",
  sem_horario: "Sem horário",
  sem_unidade: "Sem unidade",
};

export interface IssueEvent {
  status: string;
  total_value: number | null;
  start_time: string | null;
  unit: string | null;
  is_permuta?: boolean | null;
}

/** Quanto tempo à frente a lista olha */
export const UPCOMING_ISSUE_DAYS = 60;

export function eventIssues(ev: IssueEvent, ctx: { hasUnits: boolean; hasOverduePayment: boolean }): EventIssue[] {
  if (ev.status === "cancelado") return [];
  const issues: EventIssue[] = [];
  if (ctx.hasOverduePayment) issues.push("parcela_vencida");
  if (ev.status === "pendente") issues.push("pendente");
  if (!ev.is_permuta && !(Number(ev.total_value) > 0)) issues.push("sem_valor");
  if (!ev.start_time) issues.push("sem_horario");
  if (ctx.hasUnits && !(ev.unit || "").trim()) issues.push("sem_unidade");
  return issues;
}

/** Quantas festas têm cada problema (para o resumo) */
export function countIssues(lists: EventIssue[][]): Array<{ issue: EventIssue; count: number }> {
  return EVENT_ISSUE_ORDER.map((issue) => ({ issue, count: lists.filter((l) => l.includes(issue)).length })).filter((c) => c.count > 0);
}
