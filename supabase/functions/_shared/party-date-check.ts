// Data da festa que o cliente pediu (formulário do site ou conversa): depois
// das fotos/vídeo/PDF a IA conta se ela está livre ou já foi reservada e, se
// foi, oferece datas próximas tiradas da agenda. Regras puras — quem consulta
// a agenda e envia é o ai-agent.

import type { FreeDay, FreeSlot } from "./party-availability.ts";
import { formatDateLong } from "./whatsapp-format.ts";

const noon = (ymd: string) => Date.parse(`${ymd}T12:00:00Z`);

/**
 * Até `max` datas livres perto da pedida: o mesmo dia da semana primeiro
 * (outros domingos, se ele queria domingo), depois as mais próximas. Em ordem
 * de data.
 */
export function nearestAlternativeDays(free: FreeSlot[], askedYmd: string, max = 3): FreeDay[] {
  const byDate = new Map<string, FreeDay>();
  for (const f of free) {
    if (f.date === askedYmd) continue;
    const day = byDate.get(f.date) || { date: f.date, dow: f.dow, slots: [] };
    day.slots.push(f.slot);
    byDate.set(f.date, day);
  }
  const askedDow = new Date(noon(askedYmd)).getUTCDay();
  const dist = (d: string) => Math.abs(noon(d) - noon(askedYmd));
  return [...byDate.values()]
    .sort((a, b) => (a.dow === askedDow ? 0 : 1) - (b.dow === askedDow ? 0 : 1) || dist(a.date) - dist(b.date) || a.date.localeCompare(b.date))
    .slice(0, max)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "Ah, e uma notícia boa: o domingo, 13 de dezembro, ainda está livre na agenda ✅" */
export function partyDateFreeNote(ymd: string): string {
  return `Ah, e uma notícia boa: o ${formatDateLong(ymd)}, ainda está livre na agenda ✅`;
}

/**
 * Data pedida já reservada (ou no recesso): avisa com jeito e oferece as
 * datas livres (linhas prontas da agenda). Sem datas por perto, diz que vai
 * ver com a equipe.
 */
export function partyDateTakenMessage(opts: {
  firstName: string;
  ymd: string;
  alternatives: string | null; // "🗓️ Domingo, 20 de dezembro\n☀️ Almoço (13h às 17h)"…
  recess?: boolean;
  birthdayName?: string | null;
}): string {
  const name = opts.firstName ? `${opts.firstName}, ` : "";
  const day = formatDateLong(opts.ymd);
  const what = opts.recess
    ? `${name}uma coisa importante: no ${day}, o buffet vai estar em recesso, sem festas 😕`
    : `${name}uma coisa importante: o ${day}, já foi reservado 😕`;
  if (!opts.alternatives) {
    return `${what}\n\nVou ver aqui com a equipe as melhores opções de data pra vocês e já te retorno por aqui 💜`;
  }
  const party = opts.birthdayName ? `pra festa ${/a$/i.test(opts.birthdayName.trim()) ? "da" : "do"} ${opts.birthdayName.trim()}` : "pra vocês";
  return `${what}\n\nMas olha as opções mais próximas que ainda tenho:\n\n${opts.alternatives}\n\nAlguma delas funciona ${party}? 🎈\n(A data fica garantida com contrato e sinal ✨)`;
}
