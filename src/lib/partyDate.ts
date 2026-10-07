// Data da festa no formulário do site: meses com ano ("Outubro/26"), sem dias
// que já passaram e com o dia da semana certo. Antes a lista ia de janeiro a
// dezembro sem ano — "18/Setembro" escolhido em outubro virava uma data que já
// passou (o cliente queria setembro do ano seguinte).

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * "Setembro/27" → setembro de 2027. Sem ano ("Setembro"): o próximo setembro
 * que ainda não passou (este ano ou o que vem).
 */
export function parseMonthOption(option: string, now: Date = new Date()): { monthIndex: number; year: number } | null {
  const [namePart, yearPart] = option.split("/");
  const monthIndex = MONTH_NAMES.indexOf((namePart || "").trim());
  if (monthIndex < 0) return null;
  if (yearPart && /^\d{2,4}$/.test(yearPart.trim())) {
    const y = yearPart.trim();
    return { monthIndex, year: y.length <= 2 ? 2000 + Number(y) : Number(y) };
  }
  return { monthIndex, year: monthIndex < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear() };
}

/** Próximos meses com ano ("Outubro/26" … "Setembro/27"); pula o mês atual se ele já acabou */
export function upcomingMonthOptions(now: Date = new Date(), count = 12): string[] {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const start = now.getDate() >= lastDay ? 1 : 0;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + start + i, 1);
    return `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
  });
}

/** "Setembro/27" → "setembro de 2027" (para frases) */
export function monthOptionLabel(option: string, now: Date = new Date()): string {
  const p = parseMonthOption(option, now);
  return p ? `${MONTH_NAMES[p.monthIndex].toLowerCase()} de ${p.year}` : option;
}

/** Dia já passou (ou é hoje) — não dá para escolher no calendário */
export function isPastDay(option: string, day: number, now: Date = new Date()): boolean {
  const p = parseMonthOption(option, now);
  if (!p) return false;
  return new Date(p.year, p.monthIndex, day) <= startOfDay(now);
}

/** Dia da semana (0 = domingo) do dia 1 do mês da opção */
export function firstWeekdayOf(option: string, now: Date = new Date()): number {
  const p = parseMonthOption(option, now);
  return p ? new Date(p.year, p.monthIndex, 1).getDay() : 0;
}

export function daysInMonthOption(option: string, now: Date = new Date()): number {
  const p = parseMonthOption(option, now);
  return p ? new Date(p.year, p.monthIndex + 1, 0).getDate() : 31;
}

/** "sábado, 18 de setembro de 2027" (sem dia: "setembro de 2027") */
export function formatLeadDate(option: string | undefined, day: number | undefined, now: Date = new Date()): string {
  if (!option) return day ? `dia ${day}` : "";
  const p = parseMonthOption(option, now);
  if (!p) return day ? `${day}/${option}` : option;
  const month = MONTH_NAMES[p.monthIndex].toLowerCase();
  if (!day) return `${month} de ${p.year}`;
  const weekday = WEEKDAYS[new Date(p.year, p.monthIndex, day).getDay()];
  return `${weekday}, ${day} de ${month} de ${p.year}`;
}

/** Recesso / dias fechados do buffet (Configurar IA): [{ start, end }] em AAAA-MM-DD */
export interface ClosedPeriod {
  start: string;
  end: string;
}

export function parseClosedPeriods(raw: unknown): ClosedPeriod[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({ start: String(p?.start || ""), end: String(p?.end || p?.start || "") }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.start) && /^\d{4}-\d{2}-\d{2}$/.test(p.end) && p.start <= p.end);
}

/** O dia cai num recesso do buffet */
export function isClosedLeadDay(option: string, day: number, periods: ClosedPeriod[], now: Date = new Date()): boolean {
  const p = parseMonthOption(option, now);
  if (!p) return false;
  const ymd = `${p.year}-${String(p.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return periods.some((c) => ymd >= c.start && ymd <= c.end);
}
