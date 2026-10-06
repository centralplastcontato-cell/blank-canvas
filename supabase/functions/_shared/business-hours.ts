// Horários da IA (beta): janelas de visita e horário de atendimento da equipe.
//
// Os dois são guardados como a frase que a IA lê ("Segunda a sexta, das 10:00
// às 17:00, de meia em meia hora; sábado, das 09:00 às 13:00, ...") e
// desmontados aqui para calcular horários livres, validar pedidos de visita e
// contar minutos dentro do expediente. Usado pela edge function e pela tela —
// não depende de Deno nem do navegador.
//
// Fuso: horário de Brasília fixo (UTC-3; o Brasil não tem horário de verão
// desde 2019).

export const SAO_PAULO_OFFSET_MS = -3 * 60 * 60 * 1000;

// Horário da equipe quando ainda não foi salvo em "Passagem para a equipe" —
// o mesmo que a tela mostra preenchido. (Antes caía no horário de VISITAS.)
export const DEFAULT_TEAM_HOURS = "Segunda a sexta, das 09:00 às 18:00; sábado, das 09:00 às 13:00";

export function teamHoursText(teamHours: string | null | undefined): string {
  return (teamHours || "").trim() || DEFAULT_TEAM_HOURS;
}

const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DAY_SHORT_LOWER = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const SATURDAY = 5;

export interface ParsedHours {
  // 0 = segunda ... 6 = domingo
  days: number[];
  start: string;
  end: string;
  halfHour: boolean;
  satDifferent: boolean;
  satStart: string;
  satEnd: string;
}

function daysToText(sortedDays: number[]): string {
  const key = sortedDays.join(",");
  if (key === "0,1,2,3,4") return "Segunda a sexta";
  if (key === "0,1,2,3,4,5") return "Segunda a sábado";
  if (key === "0,1,2,3,4,5,6") return "Todos os dias";
  if (sortedDays.length === 1) return DAY_NAMES[sortedDays[0]];
  return sortedDays.map((d) => DAY_NAMES[d]).join(", ").replace(/, ([^,]*)$/, " e $1");
}

export function serializeVisitHours(
  days: number[],
  start: string,
  end: string,
  halfHour: boolean,
  satDifferent = false,
  satStart = "",
  satEnd = "",
): string {
  const sorted = [...days].sort((a, b) => a - b);
  const useSatSplit = satDifferent && sorted.includes(SATURDAY);
  const mainDays = useSatSplit ? sorted.filter((d) => d !== SATURDAY) : sorted;
  const intervalText = (h: boolean) => (h ? "de meia em meia hora" : "de hora em hora");
  const parts: string[] = [];
  if (mainDays.length > 0) parts.push(`${daysToText(mainDays)}, das ${start} às ${end}, ${intervalText(halfHour)}`);
  if (useSatSplit) parts.push(`sábado, das ${satStart} às ${satEnd}, ${intervalText(halfHour)}`);
  return parts.join("; ");
}

// Horário de atendimento da equipe: mesma frase, sem o intervalo entre visitas.
export function serializeTeamHours(
  days: number[],
  start: string,
  end: string,
  satDifferent = false,
  satStart = "",
  satEnd = "",
): string {
  const sorted = [...days].sort((a, b) => a - b);
  const useSatSplit = satDifferent && sorted.includes(SATURDAY);
  const mainDays = useSatSplit ? sorted.filter((d) => d !== SATURDAY) : sorted;
  const parts: string[] = [];
  if (mainDays.length > 0) parts.push(`${daysToText(mainDays)}, das ${start} às ${end}`);
  if (useSatSplit) parts.push(`sábado, das ${satStart} às ${satEnd}`);
  return parts.join("; ");
}

function parseSegment(text: string): { days: number[]; start: string | null; end: string | null; halfHour: boolean } {
  const t = text.toLowerCase();
  let days: number[] = [];
  if (t.includes("todos os dias")) days = [0, 1, 2, 3, 4, 5, 6];
  else if (t.includes("segunda a sábado") || t.includes("segunda a sabado")) days = [0, 1, 2, 3, 4, 5];
  else if (t.includes("segunda a sexta")) days = [0, 1, 2, 3, 4];
  else {
    const tokens: [string, number][] = [["segunda", 0], ["terça", 1], ["terca", 1], ["quarta", 2], ["quinta", 3], ["sexta", 4], ["sábado", 5], ["sabado", 5], ["domingo", 6]];
    tokens.forEach(([tok, idx]) => { if (t.includes(tok) && !days.includes(idx)) days.push(idx); });
  }
  const norm = (s: string) => {
    const mm = s.replace("h", ":").match(/(\d{1,2}):?(\d{2})?/);
    return mm ? `${mm[1].padStart(2, "0")}:${mm[2] || "00"}` : null;
  };
  const m = t.match(/das\s+(\d{1,2}[:h]?\d{0,2})\s+às?\s+(\d{1,2}[:h]?\d{0,2})/);
  return {
    days,
    start: m && norm(m[1]),
    end: m && norm(m[2]),
    halfHour: !t.includes("hora em hora"),
  };
}

export function parseVisitHours(text: string | null): ParsedHours {
  const fallback: ParsedHours = {
    days: [0, 1, 2, 3, 4],
    start: "10:00",
    end: "17:00",
    halfHour: true,
    satDifferent: false,
    satStart: "09:00",
    satEnd: "13:00",
  };
  if (!text || !text.trim()) return fallback;
  const segments = text.split(/;\s*/).map(parseSegment).filter((s) => s.days.length > 0);
  if (segments.length === 0) return fallback;

  // Um trecho isolado só de sábado, junto com outro dos demais dias: horário diferente.
  const satSeg = segments.find((s) => s.days.length === 1 && s.days[0] === SATURDAY);
  const mainSeg = segments.find((s) => s !== satSeg);
  if (satSeg && mainSeg) {
    return {
      days: Array.from(new Set([...mainSeg.days, SATURDAY])),
      start: mainSeg.start || fallback.start,
      end: mainSeg.end || fallback.end,
      halfHour: mainSeg.halfHour,
      satDifferent: true,
      satStart: satSeg.start || fallback.satStart,
      satEnd: satSeg.end || fallback.satEnd,
    };
  }

  const s = segments[0];
  return {
    days: s.days,
    start: s.start || fallback.start,
    end: s.end || fallback.end,
    halfHour: s.halfHour,
    satDifferent: false,
    satStart: fallback.satStart,
    satEnd: fallback.satEnd,
  };
}

// ---------- datas no horário de Brasília ----------

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};
const fromMinutes = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function normalizeTime(t: string): string | null {
  const m = (t || "").trim().match(/^(\d{1,2})[:h](\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10), mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

// "2026-10-08" → 0 (segunda) ... 6 (domingo)
export function weekdayOf(dateYmd: string): number {
  const [y, mo, d] = dateYmd.split("-").map((n) => parseInt(n, 10));
  return (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() + 6) % 7;
}

// Data (YYYY-MM-DD) e minuto do dia em Brasília para um instante
export function localParts(ms: number): { date: string; minute: number; weekday: number } {
  const local = new Date(ms + SAO_PAULO_OFFSET_MS);
  const date = local.toISOString().slice(0, 10);
  return { date, minute: local.getUTCHours() * 60 + local.getUTCMinutes(), weekday: (local.getUTCDay() + 6) % 7 };
}

export function localToMs(dateYmd: string, hhmm: string): number {
  return Date.parse(`${dateYmd}T${hhmm}:00Z`) - SAO_PAULO_OFFSET_MS;
}

function addDays(dateYmd: string, n: number): string {
  const ms = Date.parse(`${dateYmd}T00:00:00Z`) + n * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

// Janela do dia: [início, fim) em minutos, ou null se o dia não abre
export function windowForWeekday(hours: ParsedHours, weekday: number): { start: number; end: number } | null {
  if (!hours.days.includes(weekday)) return null;
  const sat = weekday === SATURDAY && hours.satDifferent;
  const start = toMinutes(sat ? hours.satStart : hours.start);
  const end = toMinutes(sat ? hours.satEnd : hours.end);
  return end > start ? { start, end } : null;
}

// ---------- horários de visita ----------

export interface Slot {
  date: string;
  time: string;
}

export const slotKey = (s: Slot) => `${s.date} ${s.time}`;

const stepOf = (hours: ParsedHours) => (hours.halfHour ? 30 : 60);

// Começa dentro da janela do dia, no passo certo, e termina até o fechamento
export function isSlotInHours(hours: ParsedHours, date: string, time: string): boolean {
  const win = windowForWeekday(hours, weekdayOf(date));
  const t = normalizeTime(time);
  if (!win || !t) return false;
  const min = toMinutes(t);
  return min >= win.start && min + stepOf(hours) <= win.end && (min - win.start) % stepOf(hours) === 0;
}

// Próximos horários livres a partir de agora (com antecedência mínima)
export function listAvailableSlots(
  hours: ParsedHours,
  nowMs: number,
  booked: Set<string>,
  opts: { days?: number; minLeadMinutes?: number; max?: number } = {},
): Slot[] {
  const { days = 14, minLeadMinutes = 120, max = 40 } = opts;
  const earliest = nowMs + minLeadMinutes * 60000;
  const today = localParts(nowMs).date;
  const out: Slot[] = [];
  for (let i = 0; i <= days && out.length < max; i++) {
    const date = addDays(today, i);
    const win = windowForWeekday(hours, weekdayOf(date));
    if (!win) continue;
    for (let m = win.start; m + stepOf(hours) <= win.end && out.length < max; m += stepOf(hours)) {
      const slot = { date, time: fromMinutes(m) };
      if (localToMs(date, slot.time) < earliest) continue;
      if (booked.has(slotKey(slot))) continue;
      out.push(slot);
    }
  }
  return out;
}

// Pedido que não dá: o horário livre mais próximo ANTES e o mais próximo
// DEPOIS do que o cliente pediu (ou os dois mais próximos, se só houver um lado)
export function nearestSlots(available: Slot[], date: string, time: string, n = 2): Slot[] {
  const t = normalizeTime(time) || "12:00";
  const target = localToMs(date, t);
  const sorted = [...available].sort((a, b) => localToMs(a.date, a.time) - localToMs(b.date, b.time));
  const before = sorted.filter((s) => localToMs(s.date, s.time) < target);
  const after = sorted.filter((s) => localToMs(s.date, s.time) >= target);
  if (n === 2 && before.length > 0 && after.length > 0) return [before[before.length - 1], after[0]];
  return [...before.reverse().slice(0, n), ...after.slice(0, n)]
    .sort((a, b) => Math.abs(localToMs(a.date, a.time) - target) - Math.abs(localToMs(b.date, b.time) - target))
    .slice(0, n)
    .sort((a, b) => localToMs(a.date, a.time) - localToMs(b.date, b.time));
}

// "qua 08/10 às 10:00"
export function formatSlot(s: Slot): string {
  const [, mo, d] = s.date.split("-");
  return `${DAY_SHORT_LOWER[weekdayOf(s.date)]} ${d}/${mo} às ${s.time}`;
}

// Dois horários bem distribuídos para a IA oferecer (dias diferentes quando der)
export function pickTwoOffers(available: Slot[]): Slot[] {
  if (available.length <= 2) return available;
  const first = available[0];
  const otherDay = available.find((s) => s.date !== first.date);
  return [first, otherDay || available[1]];
}

// ---------- horário de atendimento da equipe ----------

export function isOpenAt(hours: ParsedHours, ms: number): boolean {
  const { minute, weekday } = localParts(ms);
  const win = windowForWeekday(hours, weekday);
  return !!win && minute >= win.start && minute < win.end;
}

// Minutos de expediente entre dois instantes (limitado a 7 dias de busca)
export function businessMinutesBetween(hours: ParsedHours, fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  const limit = Math.min(toMs, fromMs + 7 * 86400000);
  let total = 0;
  for (let t = fromMs; t < limit; t += 60000) {
    if (isOpenAt(hours, t)) total++;
  }
  return total;
}

// "agora", "hoje às 09:00", "amanhã às 09:00", "segunda às 09:00"
export function nextOpeningText(hours: ParsedHours, nowMs: number): string {
  if (isOpenAt(hours, nowMs)) return "agora";
  const now = localParts(nowMs);
  for (let i = 0; i <= 7; i++) {
    const date = addDays(now.date, i);
    const weekday = weekdayOf(date);
    const win = windowForWeekday(hours, weekday);
    if (!win) continue;
    if (i === 0 && now.minute >= win.start) continue;
    const time = fromMinutes(win.start);
    if (i === 0) return `hoje às ${time}`;
    if (i === 1) return `amanhã às ${time}`;
    return `${DAY_NAMES[weekday].toLowerCase()} às ${time}`;
  }
  return "no próximo dia útil";
}

// Frase para o cliente: "segunda a sexta, das 09:00 às 18:00; sábado, das 09:00 às 13:00"
export function describeTeamHours(hours: ParsedHours): string {
  return serializeTeamHours(hours.days, hours.start, hours.end, hours.satDifferent, hours.satStart, hours.satEnd)
    .replace(/^./, (c) => c.toLowerCase());
}
