/**
 * Brazilian holidays helper — detects day type for pricing matrix
 */

// Fixed national holidays (month, day) — zero-indexed month
const FIXED_HOLIDAYS: [number, number][] = [
  [0, 1],   // Ano Novo
  [3, 21],  // Tiradentes
  [4, 1],   // Dia do Trabalho
  [8, 7],   // Independência
  [9, 12],  // Nossa Senhora Aparecida
  [10, 2],  // Finados
  [10, 15], // Proclamação da República
  [11, 25], // Natal
];

/** Calculate Easter Sunday using the Anonymous Gregorian algorithm */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/** Get all mobile holidays for a given year */
function getMobileHolidays(year: number): Date[] {
  const easter = getEasterDate(year);
  const ms = easter.getTime();
  const day = 24 * 60 * 60 * 1000;

  return [
    new Date(ms - 47 * day), // Carnaval (terça)
    new Date(ms - 48 * day), // Carnaval (segunda)
    new Date(ms - 2 * day),  // Sexta-feira Santa
    new Date(ms + 60 * day), // Corpus Christi
  ];
}

/** Check if a date is a national holiday */
export function isHoliday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();

  // Fixed holidays
  if (FIXED_HOLIDAYS.some(([m, d]) => m === month && d === day)) return true;

  // Mobile holidays
  return getMobileHolidays(year).some(
    (h) => h.getFullYear() === year && h.getMonth() === month && h.getDate() === day
  );
}

/** Check if a date is the eve of a holiday */
export function isHolidayEve(date: Date): boolean {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return isHoliday(next);
}

/**
 * Day-of-week tokens used in manual mapping.
 * 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
 * Plus special tokens: "feriado" and "vespera_feriado"
 */
export type DayMappingToken = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "feriado" | "vespera_feriado";

/** Optional shift filter for the day type column. 'any' = applies regardless of time. */
export type ShiftToken = "any" | "almoco" | "jantar";

export interface DayTypeConfig {
  key: string;
  label: string;
  /** Optional manual mapping: which days of the week (and feriado/vespera) use this column */
  days?: DayMappingToken[];
  /** Optional shift filter — when set to 'almoco' or 'jantar', column only applies to that shift */
  shift?: ShiftToken;
}

/** Detect shift from a HH:MM time string given a cutoff hour (default 16h) */
export function getShiftFromTime(time: string | null | undefined, cutoffHour = 16): ShiftToken | null {
  if (!time) return null;
  const [h] = time.split(":").map(Number);
  if (isNaN(h)) return null;
  return h < cutoffHour ? "almoco" : "jantar";
}

export const DEFAULT_DAY_TYPES: DayTypeConfig[] = [
  { key: "seg_qui", label: "Seg a Qui" },
  { key: "sexta", label: "Sexta" },
  { key: "sab_dom", label: "Sáb e Dom" },
  { key: "vespera_feriado", label: "Véspera de Feriado" },
  { key: "feriado", label: "Feriado" },
];

export const DEFAULT_GUEST_TIERS = [50, 60, 70, 80, 90, 100];

/**
 * Detect the day type key for a given date, using the company's day type config.
 * Priority: feriado > véspera > day-of-week mapping
 */
export function getDayType(date: Date, dayTypes?: DayTypeConfig[]): string {
  const types = dayTypes || DEFAULT_DAY_TYPES;
  const keys = new Set(types.map((d) => d.key));

  const isHol = isHoliday(date);
  const isEve = isHolidayEve(date);
  const dow = date.getDay(); // 0=Sun..6=Sat
  const dowToken = String(dow) as DayMappingToken;

  // 1) MANUAL MAPPING (highest priority): if any column has explicit `days`, use it
  const hasAnyManual = types.some((t) => t.days && t.days.length > 0);
  if (hasAnyManual) {
    // Holiday wins
    if (isHol) {
      const matchHol = types.find((t) => t.days?.includes("feriado"));
      if (matchHol) return matchHol.key;
    }
    // Holiday eve next
    if (isEve) {
      const matchEve = types.find((t) => t.days?.includes("vespera_feriado"));
      if (matchEve) return matchEve.key;
    }
    // Day of week
    const matchDow = types.find((t) => t.days?.includes(dowToken));
    if (matchDow) return matchDow.key;
    // fall through to legacy if nothing matched
  }

  // 2) LEGACY HARDCODED MAPPING (backward compat for grids without `days` config)
  if (isHol && keys.has("feriado")) return "feriado";
  if (isEve && keys.has("vespera_feriado")) return "vespera_feriado";

  if (dow === 0 && keys.has("domingo")) return "domingo";
  if (dow === 6 && keys.has("sabado")) return "sabado";
  if (dow === 5 && keys.has("sexta")) return "sexta";
  if (dow === 4 && keys.has("quinta")) return "quinta";
  if (dow === 3 && keys.has("quarta")) return "quarta";
  if (dow === 2 && keys.has("terca")) return "terca";
  if (dow === 1 && keys.has("segunda")) return "segunda";

  if ((dow === 1 || dow === 2) && keys.has("seg_ter")) return "seg_ter";
  if ((dow === 3 || dow === 4) && keys.has("qua_qui")) return "qua_qui";

  if ((dow === 0 || dow === 6) && keys.has("sab_dom")) return "sab_dom";
  if (dow >= 1 && dow <= 4 && keys.has("seg_qui")) return "seg_qui";
  if ((dow >= 5 || dow === 0) && keys.has("sex_sab_dom")) return "sex_sab_dom";

  if (dow >= 1 && dow <= 5 && keys.has("seg_sex")) return "seg_sex";

  return types[0]?.key || "seg_qui";
}

/**
 * Get the label for a day type key
 */
export function getDayTypeLabel(key: string, dayTypes?: DayTypeConfig[]): string {
  const config = (dayTypes || DEFAULT_DAY_TYPES).find((d) => d.key === key);
  return config?.label || key;
}

/**
 * Find the best matching guest tier (equal or next higher)
 */
export function findMatchingTier(guestCount: number, tiers: number[]): number | null {
  if (!tiers.length || !guestCount) return null;
  const sorted = [...tiers].sort((a, b) => a - b);
  const match = sorted.find((t) => t >= guestCount);
  return match ?? sorted[sorted.length - 1]; // fallback to highest
}
