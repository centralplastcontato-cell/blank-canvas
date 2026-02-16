/**
 * Masks a phone number for users without contact view permission.
 * Shows first 4 and last 4 digits: 5511****9999
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 8) return '****' + digits.slice(-4);
  return digits.slice(0, 4) + '****' + digits.slice(-4);
}
