// Formatos para mensagens da IA no WhatsApp: data por extenso, horário com
// turno e valores curtos — "26/12" e "13:00" o WhatsApp sublinha como link.

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-12-26" → "sábado, 26 de dezembro" */
export function formatDateLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return `${WEEKDAYS[dow]}, ${d} de ${MONTHS[m - 1]}`;
}

/** "13:00" → "almoço (13h)"; "19:00" → "noite (19h)"; "18:30" → "noite (18h30)" */
export function formatSlotLabel(start: string): string {
  const [h, min] = start.split(":").map(Number);
  const hour = min ? `${h}h${String(min).padStart(2, "0")}` : `${h}h`;
  return `${h < 16 ? "almoço" : "noite"} (${hour})`;
}

/** 6890 → "R$ 6.890"; 6890.5 → "R$ 6.890,50" */
export function formatBRLShort(value: number): string {
  const cents = Math.round(value * 100) % 100 !== 0;
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const LOWER_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);
/** "CASTELO PREMIUM" → "Castelo Premium" (nomes já com minúsculas ficam como estão) */
export function prettyPackageName(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().split(/\s+/).map((w, i) => (i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}

/** Emoji de cada pacote: 👑 premium, ⭐ super, 🏰 castelo, 🎉 os demais */
export function packageEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("premium")) return "👑";
  if (n.includes("super")) return "⭐";
  if (n.includes("castelo")) return "🏰";
  return "🎉";
}

const hourText = (t: string) => {
  const [h, min] = t.split(":").map(Number);
  return min ? `${h}h${String(min).padStart(2, "0")}` : `${h}h`;
};

/** "📅 Sábado, 5 de dezembro" */
export function formatDayHeader(ymd: string): string {
  const long = formatDateLong(ymd);
  return `📅 ${long.charAt(0).toUpperCase()}${long.slice(1)}`;
}

/** "☀️ Almoço (13h às 17h)" / "🌙 Noite (19h às 23h)" */
export function formatSlotRange(start: string, end: string): string {
  const night = Number(start.split(":")[0]) >= 16;
  return `${night ? "🌙 Noite" : "☀️ Almoço"} (${hourText(start)} às ${hourText(end)})`;
}

const WEEKDAY_RE = "(domingo|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado)(-feira)?";
const MONTH_INDEX: Record<string, number> = Object.fromEntries(MONTHS.map((m, i) => [m, i]));

/**
 * Corrige o dia da semana escrito junto de uma data ("sexta-feira, 17 de
 * outubro" → "sábado, 17 de outubro"). A data vale para o ano de hoje ou, se já
 * passou, o próximo. O simulador pegou a IA errando o dia da semana.
 */
export function fixWeekdays(text: string, todayYmd: string): string {
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const re = new RegExp(`(\\b[aoAO]\\s+)?\\b${WEEKDAY_RE}(,?\\s+(?:dia\\s+)?)(\\d{1,2})\\s+de\\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(\\s+de\\s+(\\d{4}))?`, "gi");
  return text.replace(re, (whole, article: string | undefined, wd: string, feira: string | undefined, sep: string, dayStr: string, monthStr: string, yearPart: string | undefined, yearStr: string | undefined) => {
    const month = MONTH_INDEX[monthStr.toLowerCase().replace("marco", "março")];
    const day = Number(dayStr);
    if (month === undefined || day < 1 || day > 31) return whole;
    let year = yearStr ? Number(yearStr) : ty;
    if (!yearStr && (month + 1 < tm || (month + 1 === tm && day < td))) year += 1;
    const date = new Date(Date.UTC(year, month, day, 12));
    if (date.getUTCMonth() !== month) return whole; // 31 de novembro etc.
    const right = WEEKDAYS[date.getUTCDay()];
    const norm = (s: string) => s.toLowerCase().replace("terca", "terça").replace("sabado", "sábado");
    if (norm(wd) === right) return whole;
    const withFeira = feira && date.getUTCDay() >= 1 && date.getUTCDay() <= 5 ? `${right}-feira` : right;
    const cased = wd[0] === wd[0].toUpperCase() ? withFeira.charAt(0).toUpperCase() + withFeira.slice(1) : withFeira;
    // "a sexta" → "o sábado" (sábado e domingo são masculinos)
    let art = article || "";
    if (art) {
      const masc = date.getUTCDay() === 0 || date.getUTCDay() === 6;
      const letter = masc ? "o" : "a";
      art = art.replace(/^[aoAO]/, (c) => (c === c.toUpperCase() ? letter.toUpperCase() : letter));
    }
    return `${art}${cased}${sep}${dayStr} de ${monthStr}${yearPart || ""}`;
  });
}

/**
 * Dias da semana que não batem com a data no texto do cliente ("sexta dia 12
 * de dezembro" quando 12/12 é sábado). Serve para a IA perguntar qual ele quer
 * em vez de repetir o erro (achado do simulador).
 */
export function weekdayMismatches(text: string, todayYmd: string): Array<{ said: string; right: string }> {
  const out: Array<{ said: string; right: string }> = [];
  const re = new RegExp(`\\b${WEEKDAY_RE}(,?\\s+(?:dia\\s+)?)(\\d{1,2})\\s+de\\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(\\s+de\\s+(\\d{4}))?`, "gi");
  for (const m of text.matchAll(re)) {
    const fixed = fixWeekdays(m[0], todayYmd);
    if (fixed !== m[0]) out.push({ said: m[0], right: fixed });
  }
  return out;
}
