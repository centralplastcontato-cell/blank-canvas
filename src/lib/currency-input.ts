/**
 * Brazilian currency mask utilities for form inputs.
 * Format: R$ XX.XXX,XX
 */

/** Format a raw digit string into Brazilian currency display (without R$ prefix) */
export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a Brazilian formatted currency string back to a number */
export function parseCurrencyInput(formatted: string): number {
  if (!formatted.trim()) return 0;
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Convert a numeric value to the masked display string */
export function numberToCurrencyDisplay(value: number): string {
  if (!value) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
