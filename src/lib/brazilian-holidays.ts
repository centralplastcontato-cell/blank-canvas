/**
 * Brazilian holidays helper — detects day type for pricing matrix.
 *
 * As regras ficam em supabase/functions/_shared/package-pricing.ts, as mesmas
 * que a IA usa para informar o valor do pacote; aqui só adaptamos para Date.
 */
import {
  DEFAULT_DAY_TYPES,
  DEFAULT_GUEST_TIERS,
  findMatchingTier,
  getDayTypeLabel,
  isHolidayEveYmd,
  isHolidayYmd,
  resolveDayType,
  type DayMappingToken,
  type DayTypeConfig,
  type ShiftToken,
} from "../../supabase/functions/_shared/package-pricing.ts";

export { DEFAULT_DAY_TYPES, DEFAULT_GUEST_TIERS, findMatchingTier, getDayTypeLabel };
export type { DayMappingToken, DayTypeConfig, ShiftToken };

/** Check if a date is a national holiday */
export function isHoliday(date: Date): boolean {
  return isHolidayYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Check if a date is the eve of a holiday */
export function isHolidayEve(date: Date): boolean {
  return isHolidayEveYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Detect shift from a HH:MM time string given a cutoff hour (default 16h) */
export function getShiftFromTime(time: string | null | undefined, cutoffHour = 16): ShiftToken | null {
  if (!time) return null;
  const [h] = time.split(":").map(Number);
  if (isNaN(h)) return null;
  return h < cutoffHour ? "almoco" : "jantar";
}

/**
 * Detect the day type key for a given date, using the company's day type config.
 * Priority: feriado > véspera > day-of-week mapping
 */
export function getDayType(date: Date, dayTypes?: DayTypeConfig[], shift?: ShiftToken | null): string {
  return resolveDayType({ dow: date.getDay(), holiday: isHoliday(date), holidayEve: isHolidayEve(date) }, dayTypes, shift);
}
