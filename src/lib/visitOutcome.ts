// Visitas que já passaram e ainda não têm resultado (veio / não veio).
// A equipe quase nunca marca "realizada" depois da visita, então o sistema
// pergunta — sem isso o comparecimento da Inteligência não vale nada.

export const PENDING_VISIT_STATUSES = ["agendada", "confirmada", "remarcada"] as const;

// Quanto tempo depois do horário marcado a pergunta aparece
const HOURS_AFTER_VISIT = 1;
// Até quantos dias para trás ainda vale perguntar
export const VISIT_OUTCOME_LOOKBACK_DAYS = 30;

const BRT = "America/Sao_Paulo";

/** Data (aaaa-mm-dd) e hora (hh:mm) de agora no horário de Brasília. */
export function brtNow(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Data (aaaa-mm-dd) de N dias atrás no horário de Brasília. */
export function brtDateDaysAgo(days: number, now: Date = new Date()): string {
  return brtNow(new Date(now.getTime() - days * 24 * 60 * 60 * 1000)).date;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * A visita já passou o bastante para perguntar o resultado?
 * - dia anterior a hoje: sim
 * - hoje com horário: depois de 1 h do horário marcado
 * - hoje sem horário: só a partir de amanhã
 */
export function isVisitOutcomeDue(dataVisita: string, horarioVisita: string | null | undefined, now: Date = new Date()): boolean {
  const today = brtNow(now);
  if (dataVisita < today.date) return true;
  if (dataVisita > today.date) return false;
  const visitMin = horarioVisita ? toMinutes(horarioVisita) : null;
  const nowMin = toMinutes(today.time);
  if (visitMin === null || nowMin === null) return false;
  return nowMin >= visitMin + HOURS_AFTER_VISIT * 60;
}

/** "hoje às 15:00", "ontem às 10:30" ou "02/10 às 16:00" para o texto do aviso. */
export function describeVisitWhen(dataVisita: string, horarioVisita: string | null | undefined, now: Date = new Date()): string {
  const today = brtNow(now).date;
  const yesterday = brtDateDaysAgo(1, now);
  const day = dataVisita === today ? "hoje" : dataVisita === yesterday ? "ontem" : `${dataVisita.slice(8, 10)}/${dataVisita.slice(5, 7)}`;
  const hour = horarioVisita ? horarioVisita.slice(0, 5) : "";
  return hour ? `${day} às ${hour}` : day;
}
