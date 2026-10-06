// Grade de preços dos pacotes (Operações → Pacotes): qual coluna (tipo de dia)
// e qual linha (faixa de convidados) valem para uma festa, e quanto custa.
//
// Usado pela agenda (sugestão de valor do evento) e pela IA (valor pedido pelo
// cliente) — as duas precisam chegar no mesmo número. Não depende de Deno nem
// do navegador; datas são dia/mês/ano puros (sem fuso).

// Feriados nacionais fixos (mês 1–12, dia)
const FIXED_HOLIDAYS: [number, number][] = [
  [1, 1],   // Ano Novo
  [4, 21],  // Tiradentes
  [5, 1],   // Dia do Trabalho
  [9, 7],   // Independência
  [10, 12], // Nossa Senhora Aparecida
  [11, 2],  // Finados
  [11, 15], // Proclamação da República
  [11, 20], // Consciência Negra (nacional desde 2024, Lei 14.759/2023)
  [12, 25], // Natal
];

const DAY_MS = 24 * 60 * 60 * 1000;
const utc = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day);

/** Domingo de Páscoa (algoritmo gregoriano anônimo), em ms UTC */
function easterUtc(year: number): number {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/**
 * Feriados estaduais/municipais da empresa, em "MM-DD" (companies.settings.
 * local_holidays — ex.: SP 9/7 → "07-09"; Sorocaba 15/8 → "08-15").
 */
export function localHolidaysFrom(settings: { local_holidays?: unknown } | null | undefined): string[] {
  const list = settings?.local_holidays;
  return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && /^\d{2}-\d{2}$/.test(v)) : [];
}

/** Feriado? (nacional, ou local da empresa quando informado; mês 1–12) */
export function isHolidayYmd(year: number, month: number, day: number, localHolidays: string[] = []): boolean {
  if (FIXED_HOLIDAYS.some(([m, d]) => m === month && d === day)) return true;
  const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (localHolidays.includes(mmdd)) return true;
  const easter = easterUtc(year);
  const target = utc(year, month, day);
  // Carnaval (segunda e terça), Sexta-feira Santa, Corpus Christi
  return [-48, -47, -2, 60].some((offset) => easter + offset * DAY_MS === target);
}

/** Véspera de feriado? (mês 1–12) */
export function isHolidayEveYmd(year: number, month: number, day: number, localHolidays: string[] = []): boolean {
  const next = new Date(utc(year, month, day) + DAY_MS);
  return isHolidayYmd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), localHolidays);
}

/** Nome do feriado (para listas e conferência) */
export function holidayName(year: number, month: number, day: number, localHolidays: string[] = []): string | null {
  const names: Record<string, string> = {
    "01-01": "Ano Novo", "04-21": "Tiradentes", "05-01": "Dia do Trabalho", "09-07": "Independência",
    "10-12": "Nossa Senhora Aparecida", "11-02": "Finados", "11-15": "Proclamação da República",
    "11-20": "Consciência Negra", "12-25": "Natal",
  };
  const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (names[mmdd]) return names[mmdd];
  const easter = easterUtc(year);
  const target = utc(year, month, day);
  const mobile: Record<number, string> = { [-48]: "Carnaval (segunda)", [-47]: "Carnaval (terça)", [-2]: "Sexta-feira Santa", [60]: "Corpus Christi" };
  for (const [offset, name] of Object.entries(mobile)) if (easter + Number(offset) * DAY_MS === target) return name;
  if (localHolidays.includes(mmdd)) return "Feriado local";
  return null;
}

/** Dia da semana (0 = domingo … 6 = sábado) */
export function weekdayYmd(year: number, month: number, day: number): number {
  return new Date(utc(year, month, day)).getUTCDay();
}

/**
 * Tokens de dia usados no mapeamento manual das colunas.
 * 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
 * Mais "feriado" e "vespera_feriado".
 */
export type DayMappingToken = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "feriado" | "vespera_feriado";

/** Turno opcional da coluna. 'any' = vale para qualquer horário. */
export type ShiftToken = "any" | "almoco" | "jantar";

export interface DayTypeConfig {
  key: string;
  label: string;
  /** Mapeamento manual: quais dias da semana (e feriado/véspera) usam esta coluna */
  days?: DayMappingToken[];
  /** Turno — 'almoco' ou 'jantar' faz a coluna valer só nesse turno */
  shift?: ShiftToken;
}

export const DEFAULT_DAY_TYPES: DayTypeConfig[] = [
  { key: "seg_qui", label: "Seg a Qui" },
  { key: "sexta", label: "Sexta" },
  { key: "sab_dom", label: "Sáb e Dom" },
  { key: "vespera_feriado", label: "Véspera de Feriado" },
  { key: "feriado", label: "Feriado" },
];

export const DEFAULT_GUEST_TIERS = [50, 60, 70, 80, 90, 100];

/** O que se sabe do dia da festa (feriado/véspera só com a data) */
export interface PartyDay {
  dow: number; // 0 = domingo … 6 = sábado
  holiday?: boolean;
  holidayEve?: boolean;
}

/**
 * Coluna (tipo de dia) da grade para o dia da festa.
 * Prioridade: feriado > véspera > dia da semana.
 */
export function resolveDayType(day: PartyDay, dayTypes?: DayTypeConfig[], shift?: ShiftToken | null): string {
  const types = dayTypes || DEFAULT_DAY_TYPES;
  const keys = new Set(types.map((d) => d.key));
  const { dow } = day;
  const isHol = !!day.holiday;
  const isEve = !!day.holidayEve;
  const dowToken = String(dow) as DayMappingToken;

  // Coluna compatível com o turno (sem turno, 'any' ou o mesmo turno)
  const matchesShift = (t: DayTypeConfig) => {
    if (!shift) return true;
    const colShift = t.shift || "any";
    return colShift === "any" || colShift === shift;
  };

  // 1) Mapeamento manual (prioridade): alguma coluna tem `days`
  const hasAnyManual = types.some((t) => t.days && t.days.length > 0);
  if (hasAnyManual) {
    if (isHol) {
      const matchHol = types.filter(matchesShift).find((t) => t.days?.includes("feriado"))
        || types.find((t) => t.days?.includes("feriado"));
      if (matchHol) return matchHol.key;
    }
    if (isEve) {
      const matchEve = types.filter(matchesShift).find((t) => t.days?.includes("vespera_feriado"))
        || types.find((t) => t.days?.includes("vespera_feriado"));
      if (matchEve) return matchEve.key;
    }
    const matchDow = types.filter(matchesShift).find((t) => t.days?.includes(dowToken))
      || types.find((t) => t.days?.includes(dowToken));
    if (matchDow) return matchDow.key;
    // nada bateu: cai no mapeamento antigo
  }

  // 2) Mapeamento antigo pelas chaves (grades sem `days`)
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

export function getDayTypeLabel(key: string, dayTypes?: DayTypeConfig[]): string {
  const config = (dayTypes || DEFAULT_DAY_TYPES).find((d) => d.key === key);
  return config?.label || key;
}

/** Faixa de convidados: a igual ou a próxima acima (acima da maior, a maior) */
export function findMatchingTier(guestCount: number, tiers: number[]): number | null {
  if (!tiers.length || !guestCount) return null;
  const sorted = [...tiers].sort((a, b) => a - b);
  const match = sorted.find((t) => t >= guestCount);
  return match ?? sorted[sorted.length - 1];
}

// ---------------------------------------------------------------------------
// Cotação para a IA

export interface PricedPackage {
  id: string;
  name: string;
  valor_pessoa_adicional?: number | null;
  preco_separado?: boolean | null;
  valor_pessoa_adicional_adulto?: number | null;
  valor_pessoa_adicional_crianca?: number | null;
}

export interface PriceTierRow {
  package_id: string;
  guest_count: number;
  day_type: string;
  price: number | string;
}

export interface PackageQuote {
  packageName: string;
  dayTypeLabel: string;
  shift: ShiftToken | null; // turno quando a grade separa almoço/jantar
  tier: number; // faixa da grade usada
  tierPrice: number;
  extraGuests: number; // convidados acima da maior faixa
  extraUnit: number | null; // valor por pessoa adicional
  total: number | null; // null = não dá para fechar a conta (falta valor adicional)
  adultExtra: number | null;
  childExtra: number | null;
}

/** Turnos que mudam a coluna da grade (vazio = a grade não separa por turno) */
function shiftsFor(day: PartyDay, dayTypes: DayTypeConfig[]): ShiftToken[] {
  const lunch = resolveDayType(day, dayTypes, "almoco");
  const dinner = resolveDayType(day, dayTypes, "jantar");
  return lunch !== dinner ? ["almoco", "jantar"] : [];
}

/**
 * Valor da tabela de cada pacote para a quantidade e o dia. Pacote sem preço
 * na célula correspondente fica de fora.
 */
export function quotePackages(
  packages: PricedPackage[],
  tiers: PriceTierRow[],
  settings: { day_type_config?: unknown; guest_tiers?: unknown } | null | undefined,
  guests: number,
  day: PartyDay,
): PackageQuote[] {
  const dayTypes = (Array.isArray(settings?.day_type_config) && settings!.day_type_config.length > 0
    ? settings!.day_type_config
    : DEFAULT_DAY_TYPES) as DayTypeConfig[];
  const guestTiers = (Array.isArray(settings?.guest_tiers) && settings!.guest_tiers.length > 0
    ? settings!.guest_tiers
    : DEFAULT_GUEST_TIERS) as number[];
  const tier = findMatchingTier(guests, guestTiers);
  if (!tier) return [];
  const extraGuests = Math.max(0, guests - tier);
  const shifts = shiftsFor(day, dayTypes);
  const out: PackageQuote[] = [];
  for (const pkg of packages) {
    for (const shift of shifts.length > 0 ? shifts : [null]) {
      const dayType = resolveDayType(day, dayTypes, shift);
      const row = tiers.find((t) => t.package_id === pkg.id && t.guest_count === tier && t.day_type === dayType);
      const tierPrice = row ? Number(row.price) : 0;
      if (!(tierPrice > 0)) continue;
      const extraUnit = pkg.preco_separado ? null : (pkg.valor_pessoa_adicional ?? null);
      out.push({
        packageName: pkg.name,
        dayTypeLabel: getDayTypeLabel(dayType, dayTypes),
        shift,
        tier,
        tierPrice,
        extraGuests,
        extraUnit,
        total: extraGuests === 0 ? tierPrice : extraUnit != null ? tierPrice + extraGuests * extraUnit : null,
        adultExtra: pkg.preco_separado ? (pkg.valor_pessoa_adicional_adulto ?? null) : null,
        childExtra: pkg.preco_separado ? (pkg.valor_pessoa_adicional_crianca ?? null) : null,
      });
    }
  }
  return out;
}

export function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Valores em reais citados num texto ("R$ 5.990,00", "R$5990") */
export function moneyValuesIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/g)) {
    const reais = Number(m[1].replace(/\./g, ""));
    const cents = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
    out.push(reais + cents / 100);
  }
  return out;
}

/**
 * Valores que a IA pode citar: os da tabela e a diferença entre dois deles
 * ("o Premium sai R$ 1.140 a mais que o Super"). Sem isso a trava de valores
 * barrava a comparação e passava a conversa para a equipe (achado do simulador).
 */
export function allowedMoneyValues(values: number[]): number[] {
  const base = Array.from(new Set(values.map((v) => Math.round(v * 100) / 100))).slice(0, 40);
  const out = new Set(base);
  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      const d = Math.round(Math.abs(base[i] - base[j]) * 100) / 100;
      if (d > 0) out.add(d);
    }
  }
  return Array.from(out);
}
