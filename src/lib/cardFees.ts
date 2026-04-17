// Central utility for card fee calculation.
// Use across event-side and standalone (dashboard) payment flows so the
// "received amount" matches no matter where the parcela was created.

export interface CardFeeRow {
  id: string;
  operator_name: string;
  antecipado?: boolean | null;
  taxa_debito?: number | null;
  [key: string]: any; // taxa_credito_1x ... taxa_credito_12x
}

export type CardMethod = "cartao_credito" | "cartao_debito" | "cartao";

export function isCardMethod(method?: string | null): boolean {
  if (!method) return false;
  return method === "cartao" || method === "cartao_credito" || method === "cartao_debito";
}

export function isDebitMethod(method?: string | null): boolean {
  return method === "cartao_debito";
}

export interface CalcParams {
  grossAmount: number;
  method: string | null | undefined;
  installments?: number | null;
  operator: CardFeeRow | null | undefined;
}

export interface CalcResult {
  grossAmount: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
  installments: number;
}

/**
 * Calculates the net amount after applying the configured card fee.
 * Returns the gross unchanged when method is not card or operator/fee is missing.
 */
export function calcCardFee({ grossAmount, method, installments, operator }: CalcParams): CalcResult {
  const isCard = isCardMethod(method);
  const isDebit = isDebitMethod(method);
  const parcelas = isDebit ? 1 : Math.min(12, Math.max(1, Number(installments) || 1));

  if (!isCard || !operator) {
    return { grossAmount, feePercent: 0, feeAmount: 0, netAmount: grossAmount, installments: parcelas };
  }

  const feePercent = Number(
    isDebit ? operator.taxa_debito || 0 : operator[`taxa_credito_${parcelas}x`] || 0
  );
  const feeAmount = Math.round(((grossAmount * feePercent) / 100) * 100) / 100;
  const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;

  return { grossAmount, feePercent, feeAmount, netAmount, installments: parcelas };
}
