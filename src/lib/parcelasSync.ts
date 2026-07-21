// Regras puras da sincronização entre o PLANO de parcelas (payment_details.
// parcelas_details) e as linhas reais de cobrança (event_payments).
//
// Nasceram do caso "Herly Meschke Costa" (Mega Magic): com 2 parcelas pagas,
// o sync pulava a recriação das pendentes (o plano sumia da tela Financeiro) e
// o "ajuste pós-contrato" criava um bolo único com a diferença, datado de hoje
// (nascia atrasado) e recriado a cada salvar (spam na timeline).

import type { ParcelaDetail } from "./parcelas";

/** Prefixo que identifica a parcela de ajuste criada automaticamente. */
export const ADJUSTMENT_NOTE_PREFIX = "Adicional - Ajuste pós-contrato";

export interface PaymentRowLike {
  amount: number;
  gross_amount?: number | null;
  status?: string | null;
  type?: string | null;
  notes?: string | null;
}

export function isAdjustmentRow(p: PaymentRowLike | null | undefined): boolean {
  return String(p?.notes || "").startsWith(ADJUSTMENT_NOTE_PREFIX);
}

/** Valor "de contrato" de uma linha (bruto quando rastreado; senão o líquido). */
const rowGross = (p: PaymentRowLike): number => Number(p.gross_amount ?? p.amount) || 0;

/**
 * Decide quais parcelas do plano ainda precisam virar linhas pendentes quando
 * JÁ EXISTEM parcelas pagas (cenário em que o sync legado não criava nada e o
 * restante do plano "sumia" da tela Financeiro).
 *
 * Retorna a lista de parcelas pendentes a criar, ou `null` quando NÃO é seguro
 * decidir — aí o chamador mantém o comportamento legado (nada é criado e o
 * ajuste pós-contrato cobre a diferença). É `null` quando:
 *  - não há plano, ou alguma parcela do plano está sem valor;
 *  - o plano não bate com o saldo registrado (dado torto — ex.: Herly, plano
 *    13.113,39 x saldo 11.532,40): recriar do plano cobraria a mais;
 *  - alguma parcela paga não casa com nenhuma parcela do plano (plano mudou
 *    depois do pagamento — não dá para saber o que ainda vale).
 */
export function pendingPlanParcelas(
  plan: ParcelaDetail[] | null | undefined,
  saldoValor: number | null | undefined,
  paidSaldoRows: PaymentRowLike[],
): ParcelaDetail[] | null {
  if (!plan || plan.length === 0) return null;
  if (plan.some((p) => p.valor == null)) return null;
  if (!saldoValor || saldoValor <= 0) return null;

  const planSum = plan.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  if (Math.abs(planSum - saldoValor) > 0.05) return null; // plano ≠ saldo: dado torto

  // Casa cada parcela paga com uma parcela do plano de mesmo valor (em ordem).
  const matched = new Array(plan.length).fill(false);
  for (const paid of paidSaldoRows) {
    const value = rowGross(paid);
    const idx = plan.findIndex(
      (p, i) => !matched[i] && Math.abs((Number(p.valor) || 0) - value) <= 0.01,
    );
    if (idx === -1) return null; // paga sem correspondente no plano: não arriscar
    matched[idx] = true;
  }

  return plan.filter((_, i) => !matched[i]);
}

export type AdjustmentAction =
  | { action: "none" }
  | { action: "insert"; amount: number; dueDate: string }
  | { action: "update"; amount: number }
  | { action: "delete" };

/**
 * Decide o que fazer com a parcela automática de ajuste ("Adicional - Ajuste
 * pós-contrato") depois de salvar a festa.
 *
 * Regras que curam o comportamento antigo:
 *  - a diferença é medida SEM contar o ajuste pendente existente (senão o
 *    ajuste "esconde" a própria diferença);
 *  - se as parcelas passam a cobrir o total, o ajuste sobrando é REMOVIDO;
 *  - se o ajuste já existe com o valor certo, NADA é feito (fim do loop de
 *    recriação + spam na timeline);
 *  - se o valor mudou, o ajuste é ATUALIZADO (preserva data e histórico);
 *  - ajuste novo vence na DATA DA FESTA (se futura), não "hoje" — não nasce
 *    atrasado no dia seguinte.
 */
export function computeAdjustment(
  grandTotal: number,
  existingRows: PaymentRowLike[],
  opts: { tolerance: number; eventDate?: string | null; today: string },
): AdjustmentAction {
  const pendingAdjust = existingRows.filter(
    (p) => p.status !== "paid" && isAdjustmentRow(p),
  );
  const adjustTotal = pendingAdjust.reduce((s, p) => s + rowGross(p), 0);
  const otherTotal =
    existingRows.reduce((s, p) => s + rowGross(p), 0) - adjustTotal;

  const target = Math.round((grandTotal - otherTotal) * 100) / 100;

  if (target <= opts.tolerance) {
    return pendingAdjust.length > 0 ? { action: "delete" } : { action: "none" };
  }
  if (pendingAdjust.length === 1 && Math.abs(adjustTotal - target) <= 0.01) {
    return { action: "none" };
  }
  if (pendingAdjust.length > 0) {
    return { action: "update", amount: target };
  }
  const dueDate =
    opts.eventDate && opts.eventDate >= opts.today ? opts.eventDate : opts.today;
  return { action: "insert", amount: target, dueDate };
}
