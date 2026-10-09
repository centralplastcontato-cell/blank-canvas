// Plano de pagamento da festa (payment_details) e valor do pacote.

/** Texto estável do JSON (mesma ordem de chaves), para comparar planos */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/**
 * O plano de pagamento ficou igual? Quando a pessoa edita só outras coisas da festa
 * (convidados, observações…), as parcelas não precisam ser refeitas.
 */
export function samePaymentPlan(before: unknown, after: unknown): boolean {
  if (!before || !after) return false;
  return stableStringify(before) === stableStringify(after);
}

/**
 * Valor do pacote a partir do total gravado (o formulário guarda o total já com
 * opcionais e desconto). Desconto em % sobre o total: total = (pacote + opcionais) × (1 − d).
 */
export function packageValueFromTotal(p: {
  total: number | null;
  optionalsTotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  discountBase?: string | null;
}): number | null {
  if (p.total == null) return null;
  const optionals = p.optionalsTotal || 0;
  const rawTotal = Math.max(0, p.total - optionals);
  const d = Number(p.discountValue) || 0;
  if (!p.discountType || !d) return rawTotal;
  const base = p.discountBase || "total";
  if (p.discountType === "percentage") {
    if (d >= 100) return rawTotal;
    const round = (n: number) => Math.round(n * 100) / 100;
    // Sobre o pacote: total = pacote × (1 − d) + opcionais
    if (base === "pacote") return round(rawTotal / (1 - d / 100));
    // Sobre o total: total = (pacote + opcionais) × (1 − d)
    return round(Math.max(0, p.total / (1 - d / 100) - optionals));
  }
  // Valor fixo: total = pacote + opcionais − desconto (nas duas bases)
  return rawTotal + d;
}
