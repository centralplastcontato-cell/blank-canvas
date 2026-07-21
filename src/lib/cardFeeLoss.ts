// Régua única para a "perda de taxa de cartão" (quanto o buffet deixa de receber
// por causa da taxa da maquininha) e o valor líquido correspondente.
//
// Esta é a MESMA conta que hoje está copiada à mão em vários lugares
// (EventFinancialTab.cardFeeLoss, useFinanceiroDashboard, relatórios). O objetivo
// da Etapa 2 é apontar todos esses lugares para cá, para os números pararem de
// divergir. A régua de base (percentual → valor) continua sendo a de cardFees.ts.

import type { CardFeeRow } from "./cardFees";

/** Uma linha de pagamento (event_payments) — só os campos que a conta usa. */
export interface CardFeeLossPayment {
  type?: string | null;
  payment_method?: string | null;
  amount: number;
  gross_amount?: number | null;
  card_fee_percent?: number | null;
  card_installments?: number | null;
  card_operator_id?: string | null;
}

/** O snapshot de taxa/operadora guardado no payment_details do evento. */
export interface CardFeeLossSnapshot {
  card_operator_id?: string | null;
  card_operator_name?: string | null;
  entrada_taxa_percent?: number | null;
  saldo_taxa_percent?: number | null;
  entrada_parcelas?: number | null;
  parcelas?: number | null;
}

export interface CardFeeLossDetail {
  type: string;
  bruto: number;
  taxa: number;
  desconto: number;
  parcelas: number;
}

export interface CardFeeLossResult {
  operator: string;
  totalLoss: number;
  details: CardFeeLossDetail[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isCardMethod(method?: string | null): boolean {
  if (!method) return false;
  const s = String(method).toLowerCase();
  return s.includes("cart") || s === "cartao" || s === "cartao_credito" || s === "cartao_debito";
}

export function isDebitMethod(method?: string | null): boolean {
  if (!method) return false;
  return String(method).toLowerCase().includes("deb");
}

/**
 * Taxa (%) de uma operadora para um nº de parcelas. Débito usa taxa_debito;
 * crédito usa taxa_credito_Nx (1..12).
 */
export function operatorRate(op: CardFeeRow | null | undefined, parcelas: number, debit: boolean): number {
  if (!op) return 0;
  if (debit) return Number(op.taxa_debito || 0);
  const key = `taxa_credito_${Math.min(Math.max(1, parcelas), 12)}x`;
  return Number(op[key] || 0);
}

/**
 * Calcula a perda total de taxa de cartão de um evento, percorrendo as parcelas
 * reais (event_payments). Para cada parcela de cartão, resolve a taxa por
 * prioridade — (1) carimbo da própria linha → (2) snapshot do evento → (3) taxa
 * atual da operadora — e o valor bruto — (1) gross_amount da linha → (2) derivado
 * do líquido `amount / (1 - taxa)`. Retorna null quando não há cartão ou taxa.
 *
 * Comportamento idêntico ao bloco `cardFeeLoss` do EventFinancialTab (extração fiel).
 */
export function computeCardFeeLoss(
  payments: CardFeeLossPayment[],
  paymentDetails: CardFeeLossSnapshot | null | undefined,
  operators: CardFeeRow[],
): CardFeeLossResult | null {
  const pd = paymentDetails || {};
  const cardPayments = (payments || []).filter((p) => isCardMethod(p.payment_method));
  if (cardPayments.length === 0) return null;

  // Operadora: linha com operador → snapshot → primeira disponível
  const firstRowOpId = cardPayments.find((p) => p.card_operator_id)?.card_operator_id;
  const opId = pd.card_operator_id || firstRowOpId;
  const operator = (opId && operators.find((f) => f.id === opId)) || operators[0] || null;
  const operatorName = pd.card_operator_name || operator?.operator_name || "Operadora";

  let totalLoss = 0;
  const details: CardFeeLossDetail[] = [];

  for (const p of cardPayments) {
    const isDebit = isDebitMethod(p.payment_method);
    const isEntradaRow = p.type === "entrada";
    const snapshotPct = isEntradaRow ? pd.entrada_taxa_percent : pd.saldo_taxa_percent;
    const parcelas = isDebit
      ? 1
      : Math.max(1, Number(p.card_installments) || Number(isEntradaRow ? pd.entrada_parcelas : pd.parcelas) || 1);

    // Prioridade da taxa: carimbo da linha → snapshot do evento → taxa da operadora
    let taxa = 0;
    if (p.card_fee_percent != null && Number(p.card_fee_percent) > 0) {
      taxa = Number(p.card_fee_percent);
    } else if (snapshotPct != null) {
      taxa = Number(snapshotPct);
    } else {
      const rowOp = (p.card_operator_id && operators.find((f) => f.id === p.card_operator_id)) || operator;
      taxa = operatorRate(rowOp, parcelas, isDebit);
    }
    if (!(taxa > 0)) continue;

    // Prioridade do bruto: gross_amount da linha → derivado do líquido
    const gross =
      p.gross_amount != null && Number(p.gross_amount) > 0
        ? Number(p.gross_amount)
        : round2(Number(p.amount) / (1 - taxa / 100));
    if (!(gross > 0)) continue;

    const desconto = round2((gross * taxa) / 100);
    totalLoss += desconto;
    details.push({ type: p.type || "", bruto: gross, taxa, desconto, parcelas });
  }

  return totalLoss > 0 ? { operator: operatorName, totalLoss, details } : null;
}
