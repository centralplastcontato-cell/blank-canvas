// Quadro (CRM) da Central de Atendimento: colunas, setas e números do topo.
import type { LeadStatus } from "@/types/crm";

/** Funil de venda, na ordem. As setas andam só dentro dele e param em "Fechado". */
export const KANBAN_FUNNEL: LeadStatus[] = ["novo", "em_contato", "aguardando_resposta", "orcamento_enviado", "fechado"];
/** Fora do funil. As setas andam só entre estas (antes "Fechado" → seta → "Perdido"). */
export const KANBAN_OTHERS: LeadStatus[] = ["perdido", "transferido", "cliente_retorno", "trabalhe_conosco", "fornecedor", "outros"];
/** Colunas com situação de verdade (a "Realizada" é calculada pela data da festa) */
export const KANBAN_STATUSES: LeadStatus[] = [...KANBAN_FUNNEL, ...KANBAN_OTHERS];

/** Situação da coluna ao lado (step -1 = esquerda, 1 = direita), ou null se não tem seta */
export function neighborStatus(status: LeadStatus, step: -1 | 1): LeadStatus | null {
  const group = KANBAN_FUNNEL.includes(status) ? KANBAN_FUNNEL : KANBAN_OTHERS.includes(status) ? KANBAN_OTHERS : null;
  if (!group) return null;
  return group[group.indexOf(status) + step] ?? null;
}

/**
 * Número no topo da coluna: o total que bate com os filtros (não só os cartões
 * carregados), nunca menos que os cartões na tela. Sem os totais, conta os cartões.
 */
export function kanbanColumnCount(
  column: LeadStatus | "realizada",
  shown: number,
  totals?: Record<string, number>,
): number {
  if (!totals || totals[column] === undefined) return shown;
  return Math.max(shown, totals[column]);
}
