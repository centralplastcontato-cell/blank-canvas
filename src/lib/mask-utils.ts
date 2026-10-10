/**
 * Masks a phone number for users without contact view permission.
 * Shows first 4 and last 4 digits: 5511****9999
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 8) return '****' + digits.slice(-4);
  return digits.slice(0, 4) + '****' + digits.slice(-4);
}

/**
 * Telefone do Brasil para mostrar na tela: 5515991131863 ou 15991131863 → (15) 99113-1863.
 * Fixo/antigo com 8 dígitos → (15) 3213-1863. Outros (exterior, grupo) ficam como vieram.
 */
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('55') && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

/**
 * Primeiro nome "de verdade" (com letras). Lead salvo só com o telefone no lugar do
 * nome (ex.: "11997581043") não conta; aí vale o nome do WhatsApp.
 */
export function pickPersonName(...names: (string | null | undefined)[]): string | null {
  return names.find((n) => !!n && /\p{L}/u.test(n)) ?? null;
}

/**
 * Formats a CPF string with mask: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Validates a CPF using the mathematical algorithm (mod 11 check digits).
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}
