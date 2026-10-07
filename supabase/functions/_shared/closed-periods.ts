// Recesso / dias fechados (Configurar IA → ai_agent_settings.closed_periods):
// sem festas, sem visitas e sem atendimento da equipe nesses dias. A IA
// continua respondendo, mas não oferece essas datas e avisa quando a equipe volta.

import { formatDateLong } from "./whatsapp-format.ts";

export interface ClosedPeriod {
  start: string; // AAAA-MM-DD (inclusive)
  end: string; // AAAA-MM-DD (inclusive)
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Lê o que está gravado (lista de {start, end}); ignora o que estiver malformado */
export function parseClosedPeriods(raw: unknown): ClosedPeriod[] {
  const list = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
  if (!Array.isArray(list)) return [];
  return list
    .map((p) => ({ start: String((p as ClosedPeriod)?.start || ""), end: String((p as ClosedPeriod)?.end || (p as ClosedPeriod)?.start || "") }))
    .filter((p) => YMD.test(p.start) && YMD.test(p.end) && p.start <= p.end)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function closedPeriodAt(ymd: string, periods: ClosedPeriod[]): ClosedPeriod | null {
  return periods.find((p) => ymd >= p.start && ymd <= p.end) || null;
}

export const isClosedDay = (ymd: string, periods: ClosedPeriod[]): boolean => closedPeriodAt(ymd, periods) !== null;

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Recesso de hoje em diante (o que ainda importa para a conversa) */
export const upcomingClosedPeriods = (periods: ClosedPeriod[], todayYmd: string): ClosedPeriod[] =>
  periods.filter((p) => p.end >= todayYmd);

const withYear = (ymd: string, todayYmd: string) =>
  `${formatDateLong(ymd).replace(/^[^,]+, /, "")}${ymd.slice(0, 4) !== todayYmd.slice(0, 4) ? ` de ${ymd.slice(0, 4)}` : ""}`;

/** "de 23 de dezembro a 3 de janeiro de 2027" */
export function formatClosedPeriod(p: ClosedPeriod, todayYmd: string): string {
  return p.start === p.end ? `em ${withYear(p.start, todayYmd)}` : `de ${withYear(p.start, todayYmd)} a ${withYear(p.end, todayYmd)}`;
}

/** Dia em que volta ao normal: "segunda-feira, 4 de janeiro" */
export function reopenText(p: ClosedPeriod): string {
  return formatDateLong(addDays(p.end, 1));
}

/** Aviso para o prompt da IA (só se houver recesso de hoje em diante) */
export function closedPeriodsNote(periods: ClosedPeriod[], todayYmd: string): string | null {
  const next = upcomingClosedPeriods(periods, todayYmd);
  if (next.length === 0) return null;
  const now = closedPeriodAt(todayYmd, next);
  const list = next.map((p) => formatClosedPeriod(p, todayYmd)).join("; ");
  return `RECESSO DO BUFFET: fechado ${list} — sem festas, sem visitas e sem atendimento da equipe nesses dias. ` +
    `Nunca ofereça festa nem visita nesses dias; se o cliente pedir uma data dentro do recesso, explique com gentileza e ofereça outra.` +
    (now ? ` HOJE o buffet está em recesso: a equipe volta ${reopenText(now)}. Você continua atendendo normalmente (dúvidas, valores de outras datas e visitas depois do recesso).` : "");
}
