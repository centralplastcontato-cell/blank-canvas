// Central utility for card fee calculation.
// Use across event-side and standalone (dashboard) payment flows so the
// "received amount" matches no matter where the parcela was created.

export interface CardFeeRow {
  id: string;
  operator_name: string;
  antecipado?: boolean | null;
  taxa_debito?: number | null;
  prazo_recebimento_dias?: number | null;
  [key: string]: any; // taxa_credito_1x ... taxa_credito_12x
}

export interface InstallmentSlice {
  amount: number;
  due_date: string; // YYYY-MM-DD
  index: number; // 1..N
  total: number;
}

/**
 * Split a card payment into N monthly net installments when the operator
 * does NOT do antecipação. First parcel falls "prazo_recebimento_dias"
 * after the sale date, subsequent ones every +30 days.
 *
 * Returns null when split should NOT happen (debit, antecipado, or 1x).
 */
export function splitNonAntecipadoInstallments(
  grossAmount: number,
  feePercent: number,
  installments: number,
  saleDate: string, // YYYY-MM-DD
  prazoDias: number,
): InstallmentSlice[] | null {
  if (installments <= 1) return null;
  const totalNet = Math.round((grossAmount * (1 - feePercent / 100)) * 100) / 100;
  const baseCents = Math.floor((totalNet * 100) / installments);
  const remainder = Math.round(totalNet * 100) - baseCents * installments;

  const start = new Date(saleDate + "T12:00:00");
  start.setDate(start.getDate() + (prazoDias || 30));

  const slices: InstallmentSlice[] = [];
  for (let i = 0; i < installments; i++) {
    const cents = baseCents + (i === installments - 1 ? remainder : 0);
    const d = new Date(start);
    d.setDate(d.getDate() + i * 30);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    slices.push({
      amount: cents / 100,
      due_date: `${yyyy}-${mm}-${dd}`,
      index: i + 1,
      total: installments,
    });
  }
  return slices;
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
