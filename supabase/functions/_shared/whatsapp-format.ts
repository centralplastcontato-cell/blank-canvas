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
