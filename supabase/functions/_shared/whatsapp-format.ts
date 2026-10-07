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
  // Sempre com centavos ("R$ 7.400,00") — pedido do buffet. Espaço que não
  // quebra entre "R$" e o número: no celular o valor desce inteiro de linha
  return `R$\u00a0${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "das 09:00 às 18:00" → "das 9h às 18h" (o WhatsApp sublinha "09:00" como link) */
export function hoursForWhatsApp(text: string): string {
  return text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h: string, mm: string) => `${Number(h)}h${mm === "00" ? "" : mm}`);
}

/**
 * Valores da resposta sempre com centavos ("R$ 7.400" → "R$ 7.400,00") e com
 * espaço que não quebra depois do "R$" (no celular o "R$" não fica sozinho no fim da linha)
 */
export function moneyWithCents(text: string): string {
  return text.replace(/R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(,\d{1,2})?(?![\d]|\.\d)/g, (_m, n: string, c?: string) => `R$\u00a0${n}${c ?? ",00"}`);
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

/** "🗓️ Sábado, 5 de dezembro" (🗓️ e não 📅: no iPhone o 📅 mostra "JUL 17" ao lado da data) */
export function formatDayHeader(ymd: string): string {
  const long = formatDateLong(ymd);
  return `🗓️ ${long.charAt(0).toUpperCase()}${long.slice(1)}`;
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
 * Data de hoje ou de amanhã ganha a palavra: "marcada para quarta, 7 de
 * outubro, às 11h" → "marcada para amanhã (quarta, 7 de outubro), às 11h".
 * Só a primeira vez que cada data aparece, e só se o texto já não disser
 * "hoje"/"amanhã" logo antes.
 */
export function markTodayTomorrow(text: string, todayYmd: string): string {
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(ty, tm - 1, td + 1, 12)).toISOString().slice(0, 10);
  const re = new RegExp(`(\\b(?:n?[aoAO])\\s+)?\\b${WEEKDAY_RE}(,?\\s+(?:dia\\s+)?)(\\d{1,2})\\s+de\\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)`, "gi");
  const done = new Set<string>();
  return text.replace(re, (whole: string, _article: string | undefined, wd: string, feira: string | undefined, sep: string, dayStr: string, monthStr: string, offset: number) => {
    const month = MONTH_INDEX[monthStr.toLowerCase().replace("marco", "março")];
    const day = Number(dayStr);
    if (month === undefined) return whole;
    let year = ty;
    if (month + 1 < tm || (month + 1 === tm && day < td)) year += 1;
    const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const word = ymd === todayYmd ? "hoje" : ymd === tomorrow ? "amanhã" : null;
    if (!word || done.has(ymd)) return whole;
    if (/(?<![\p{L}])(hoje|amanh[ãa])(?![\p{L}])[^.!?\n]{0,12}$/iu.test(text.slice(Math.max(0, offset - 20), offset))) return whole;
    done.add(ymd);
    const capital = wd[0] === wd[0].toUpperCase();
    const label = `${capital ? word.charAt(0).toUpperCase() + word.slice(1) : word}`;
    return `${label} (${wd.toLowerCase()}${feira || ""}${sep.replace(/\s+$/, " ")}${dayStr} de ${monthStr})`;
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

// Fim de frase: pontuação (com emojis depois, se houver) ou um emoji solto,
// seguido de espaço e de uma frase nova (maiúscula, negrito ou aspas)
const SENTENCE_END = /(?<=[.!?…](?:\s*\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*)*|\p{Extended_Pictographic}️?)\s+(?=[\p{Lu}*"“¿¡])/gu;
const ABBREVIATION_END = /(?:^|\s)(?:Av|Sr|Sra|Dr|Dra|Prof|Jd|R|Ex|ex)\.$/;
const PARAGRAPH_MAX = 170;
const BLOCK_MAX = 150;

/**
 * Parágrafo corrido vira blocos curtos (até ~2 frases, linha em branco entre
 * eles) — no WhatsApp um bloco de texto grande fica pesado. Linhas curtas,
 * listas e valores ficam como estão.
 */
export function airyParagraphs(text: string): string {
  return (text || "").split("\n").map((line) => {
    if (line.length <= PARAGRAPH_MAX) return line;
    const pieces: string[] = [];
    for (const part of line.split(SENTENCE_END)) {
      // "Av. General Osório": abreviação não fecha frase
      if (pieces.length > 0 && ABBREVIATION_END.test(pieces[pieces.length - 1])) pieces[pieces.length - 1] += ` ${part}`;
      else pieces.push(part);
    }
    if (pieces.length < 2) return line;
    const blocks: string[] = [];
    for (const sentence of pieces) {
      const last = blocks[blocks.length - 1];
      if (last !== undefined && last.length + 1 + sentence.length <= BLOCK_MAX) blocks[blocks.length - 1] = `${last} ${sentence}`;
      else blocks.push(sentence);
    }
    return blocks.join("\n\n");
  }).join("\n");
}
