/**
 * Converts a numeric value to Brazilian Portuguese words (por extenso).
 * Example: 6764.00 → "seis mil setecentos e sessenta e quatro reais"
 * Example: 1500.50 → "um mil e quinhentos reais e cinquenta centavos"
 */

const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function groupToWords(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const t = Math.floor(remainder / 10);
  const u = remainder % 10;

  if (h > 0) parts.push(HUNDREDS[h]);

  if (remainder >= 10 && remainder <= 19) {
    parts.push(TEENS[remainder - 10]);
  } else {
    if (t > 0) parts.push(TENS[t]);
    if (u > 0) parts.push(UNITS[u]);
  }

  return parts.join(' e ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'zero';

  const groups: { value: number; singular: string; plural: string }[] = [
    { value: 1_000_000_000, singular: 'um bilhão', plural: 'bilhões' },
    { value: 1_000_000, singular: 'um milhão', plural: 'milhões' },
    { value: 1_000, singular: 'mil', plural: 'mil' },
  ];

  const parts: string[] = [];
  let remaining = n;

  for (const g of groups) {
    const count = Math.floor(remaining / g.value);
    if (count > 0) {
      if (g.value === 1_000) {
        parts.push(count === 1 ? 'um mil' : `${groupToWords(count)} mil`);
      } else {
        parts.push(count === 1 ? g.singular : `${groupToWords(count)} ${g.plural}`);
      }
      remaining %= g.value;
    }
  }

  if (remaining > 0) {
    parts.push(groupToWords(remaining));
  }

  // Join with "e" when the last group is < 100 or the number ends in 00
  if (parts.length <= 1) return parts[0] || 'zero';

  // Use "e" between last two parts when last part < 100
  const last = parts.pop()!;
  return parts.join(', ') + ' e ' + last;
}

/**
 * Parse a Brazilian currency string like "R$ 6.764,00" or a plain number to a numeric value.
 */
export function parseBRLToNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;

  const cleaned = value.replace(/R\$\s*/g, '').trim();
  if (!cleaned) return null;

  // Brazilian format: 6.764,00 → remove dots, replace comma with period
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Converts a number to Brazilian Portuguese currency words.
 * @param value - Number or BRL string (e.g. 6764, "R$ 6.764,00")
 * @returns Words like "seis mil setecentos e sessenta e quatro reais"
 */
export function numberToWordsBRL(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : parseBRLToNumber(value);
  if (num == null || num < 0) return '';

  const intPart = Math.floor(num);
  const centsPart = Math.round((num - intPart) * 100);

  const parts: string[] = [];

  if (intPart > 0) {
    parts.push(integerToWords(intPart) + (intPart === 1 ? ' real' : ' reais'));
  }

  if (centsPart > 0) {
    parts.push(integerToWords(centsPart) + (centsPart === 1 ? ' centavo' : ' centavos'));
  }

  if (parts.length === 0) return 'zero reais';

  return parts.join(' e ');
}
