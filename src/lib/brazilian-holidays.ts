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
  localHolidaysFrom,
  resolveDayType,
  type DayMappingToken,
  type DayTypeConfig,
  type ShiftToken,
} from "../../supabase/functions/_shared/package-pricing.ts";

export { DEFAULT_DAY_TYPES, DEFAULT_GUEST_TIERS, findMatchingTier, getDayTypeLabel, localHolidaysFrom };
export type { DayMappingToken, DayTypeConfig, ShiftToken };

/** Check if a date is a holiday (national, or one of the company's local "MM-DD" holidays) */
export function isHoliday(date: Date, localHolidays: string[] = []): boolean {
  return isHolidayYmd(date.getFullYear(), date.getMonth() + 1, date.getDate(), localHolidays);
}

/** Check if a date is the eve of a holiday */
export function isHolidayEve(date: Date, localHolidays: string[] = []): boolean {
  return isHolidayEveYmd(date.getFullYear(), date.getMonth() + 1, date.getDate(), localHolidays);
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
export function getDayType(date: Date, dayTypes?: DayTypeConfig[], shift?: ShiftToken | null, localHolidays: string[] = []): string {
  return resolveDayType({ dow: date.getDay(), holiday: isHoliday(date, localHolidays), holidayEve: isHolidayEve(date, localHolidays) }, dayTypes, shift);
}
