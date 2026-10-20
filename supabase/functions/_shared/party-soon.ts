// Festa nos próximos 60 dias: alerta para a equipe (sininho + WhatsApp do
// alerta de passagem), uma vez por lead. Liga em Configurar IA
// (ai_agent_settings.party_soon_alert).
// - Site: mês + dia → data exata.
// - Robô de perguntas e IA: só o mês → vale o mês atual ou o seguinte.

import { addDaysYmd, monthFromText, monthRange } from "./party-availability.ts";

export const PARTY_SOON_DAYS = 60;
export const PARTY_SOON_ACTION = "Alerta: festa nos próximos 60 dias";

/** Ano escrito junto do mês: "Março/27", "Março/2027", "março de 2027" */
export function yearFromMonthText(text: string): number | null {
  const m = text.match(/\/\s*(\d{2}|\d{4})\b/) || text.match(/\b(20\d{2})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return n < 100 ? 2000 + n : n;
}

/**
 * Data (ou mês) da festa, quando cai nos próximos `days` dias. null = longe,
 * já passou ou sem mês. Devolve "AAAA-MM-DD" (data exata) ou "AAAA-MM" (só o mês).
 */
export function partySoon(month: string | null, dayOfMonth: number | null, todayYmd: string, days = PARTY_SOON_DAYS): string | null {
  const m = month ? monthFromText(month) : null;
  if (!m) return null;
  const { from, to } = monthRange(m, todayYmd, yearFromMonthText(month!));
  const ym = from.slice(0, 7);
  if (dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31) {
    const day = Math.min(dayOfMonth, Number(to.slice(8)));
    const date = `${ym}-${String(day).padStart(2, "0")}`;
    return date >= todayYmd && date <= addDaysYmd(todayYmd, days) ? date : null;
  }
  const nextMonth = addDaysYmd(`${todayYmd.slice(0, 7)}-01`, 32).slice(0, 7);
  return ym <= nextMonth ? ym : null;
}

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11-14" → "14/11"; "2026-11" → "novembro" */
export function partySoonLabel(value: string): string {
  if (value.length === 10) return `${value.slice(8)}/${value.slice(5, 7)}`;
  return MONTH_NAMES[Number(value.slice(5, 7)) - 1] || value;
}
