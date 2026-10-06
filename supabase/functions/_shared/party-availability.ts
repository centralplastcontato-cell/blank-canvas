// Datas e horários de festa livres na agenda (festas + pré-reservas), para a
// IA dizer "disponível neste momento". Só leitura: nada aqui reserva nada.
// Datas são AAAA-MM-DD puras; horários "HH:MM".

export interface PartySlot {
  start: string;
  end: string;
}

// Horários de festa quando ai_agent_settings.party_slots está vazio
export const DEFAULT_PARTY_SLOTS = "13:00-17:00, 19:00-23:00";

/** "13:00-17:00, 19h-23h" → [{13:00,17:00}, {19:00,23:00}] */
export function parsePartySlots(text: string | null | undefined): PartySlot[] {
  const src = (text || "").trim() || DEFAULT_PARTY_SLOTS;
  const out: PartySlot[] = [];
  for (const m of src.matchAll(/(\d{1,2})(?:[:h](\d{2}))?h?\s*(?:-|–|às|as|a)\s*(\d{1,2})(?:[:h](\d{2}))?h?/gi)) {
    const fmt = (h: string, mm?: string) => `${h.padStart(2, "0")}:${mm || "00"}`;
    out.push({ start: fmt(m[1], m[2]), end: fmt(m[3], m[4]) });
  }
  return out.length > 0 ? out : parsePartySlots(DEFAULT_PARTY_SLOTS);
}

export interface AgendaEvent {
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  unit: string | null;
}

export interface AgendaPreReservation {
  event_date: string;
  unit: string | null;
}

export interface FreeSlot {
  date: string; // AAAA-MM-DD
  dow: number; // 0 = domingo
  slot: PartySlot;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

const norm = (s: string) => s.trim().toLowerCase();

/**
 * A festa/pré-reserva ocupa o espaço `unit`? Só fica de fora quando está
 * cadastrada em OUTRA unidade física da empresa. Unidade vazia, de venda
 * ("Vendas 2"), de WhatsApp ou digitada errado ocupa — é o mesmo espaço.
 */
export function occupiesUnit(itemUnit: string | null, unit: string | null, physicalUnits: string[] = []): boolean {
  if (!unit || !itemUnit) return true;
  const phys = physicalUnits.map(norm);
  if (!phys.includes(norm(itemUnit))) return true;
  return norm(itemUnit) === norm(unit);
}

const DAY_MS = 86400000;
export function addDaysYmd(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
export const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

/**
 * Horários livres entre duas datas (inclusive). Festa cancelada não ocupa;
 * festa sem horário e pré-reserva ativa (não tem horário) ocupam o dia todo.
 * Festa/pré-reserva só deixa de ocupar quando é de OUTRA unidade física.
 */
export function freePartySlots(opts: {
  from: string;
  to: string;
  slots: PartySlot[];
  events: AgendaEvent[];
  preReservations: AgendaPreReservation[];
  unit?: string | null;
  physicalUnits?: string[];
}): FreeSlot[] {
  const unit = opts.unit ?? null;
  const phys = opts.physicalUnits || [];
  const sameUnit = (a: string | null, u: string | null) => occupiesUnit(a, u, phys);
  const out: FreeSlot[] = [];
  for (let d = opts.from; d <= opts.to; d = addDaysYmd(d, 1)) {
    const dayEvents = opts.events.filter((e) => e.event_date === d && (e.status || "") !== "cancelado" && sameUnit(e.unit, unit));
    const preBlocked = opts.preReservations.some((p) => p.event_date === d && sameUnit(p.unit, unit));
    if (preBlocked || dayEvents.some((e) => !e.start_time)) continue;
    for (const slot of opts.slots) {
      const s0 = toMin(slot.start), s1 = toMin(slot.end);
      const busy = dayEvents.some((e) => {
        const e0 = toMin(e.start_time as string);
        const e1 = e.end_time ? toMin(e.end_time) : e0 + 4 * 60;
        return e0 < s1 && e1 > s0;
      });
      if (!busy) out.push({ date: d, dow: weekdayOf(d), slot });
    }
  }
  return out;
}

/** Até `max` opções, primeiro no(s) dia(s) da semana preferido(s), em ordem de data */
export function pickPartyOptions(free: FreeSlot[], preferredDows: number[] = [], max = 3): FreeSlot[] {
  const preferred = preferredDows.length > 0 ? free.filter((f) => preferredDows.includes(f.dow)) : [];
  const rest = free.filter((f) => !preferred.includes(f));
  return [...preferred, ...rest].slice(0, max);
}

/** Primeiro e último dia do mês pedido, na próxima ocorrência a partir de hoje */
export function monthRange(month: number, todayYmd: string, explicitYear?: number | null): { from: string; to: string } {
  const [ty, tm] = todayYmd.split("-").map(Number);
  // Ano dito pelo cliente ("novembro de 2027") vale; sem ano, o próximo mês com esse nome
  const year = explicitYear && explicitYear >= ty ? explicitYear : month < tm ? ty + 1 : ty;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "novembro" / "nov" / "11" → 11 */
export function monthFromText(text: string): number | null {
  const t = text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const n = parseInt(t, 10);
  if (!isNaN(n) && n >= 1 && n <= 12) return n;
  const i = MONTHS.findIndex((m) => t.startsWith(m));
  return i >= 0 ? i + 1 : null;
}

export interface FreeDay {
  date: string;
  dow: number;
  slots: PartySlot[];
}

/**
 * Até `maxDates` datas com seus horários livres (agrupados por data),
 * primeiro as do(s) dia(s) da semana preferido(s), em ordem de data.
 */
export function pickPartyDates(free: FreeSlot[], preferredDows: number[] = [], maxDates = 3): FreeDay[] {
  const byDate = new Map<string, FreeDay>();
  for (const f of free) {
    const day = byDate.get(f.date) || { date: f.date, dow: f.dow, slots: [] };
    day.slots.push(f.slot);
    byDate.set(f.date, day);
  }
  const days = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  // Com preferência, só os dias pedidos (em ordem); outros dias só se não houver nenhum
  const preferred = preferredDows.length > 0 ? days.filter((d) => preferredDows.includes(d.dow)) : [];
  return (preferred.length > 0 ? preferred : days).slice(0, maxDates);
}
