// Confirmação de visita (rotina visit-confirmation + respostas no webhook).
//
// - Conversa atendida pela IA: a confirmação sai no tom dela, sem menu 1/2, e
//   quem entende a resposta é a própria IA (confirma, remarca ou passa para a
//   equipe). Nas outras conversas segue a mensagem fixa com 1️⃣/2️⃣.
// - Visita remarcada também recebe confirmação da data nova: uma confirmação
//   antiga só conta se foi enviada perto da data atual da visita.

const HOUR = 3600000;
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export const AI_CONFIRMATION_STYLE = "ai";

/** Início da visita em ms (horário de Brasília) */
export function visitStartMs(dateYmd: string, time: string | null | undefined): number {
  const t = /^\d{1,2}:\d{2}/.test(time || "") ? (time as string).slice(0, 5).padStart(5, "0") : "12:00";
  return Date.parse(`${dateYmd}T${t}:00-03:00`);
}

interface ConfirmationRow {
  sent_at?: string | null;
  created_at?: string | null;
}

/**
 * Confirmações que valem para a data ATUAL da visita. A rotina manda no
 * máximo ~1 dia + as horas configuradas antes; o que saiu antes disso era de
 * uma data antiga (a visita foi remarcada) e não impede confirmar a nova.
 */
export function confirmationsForCurrentDate<T extends ConfirmationRow>(rows: T[], startMs: number, hoursBefore: number): T[] {
  const from = startMs - (hoursBefore + 26) * HOUR;
  return rows.filter((r) => {
    const at = Date.parse(r.sent_at || r.created_at || "");
    return Number.isFinite(at) && at >= from;
  });
}

/** Conversa que a IA está atendendo agora (ela responde a confirmação) */
export function isAiOwnedConversation(conv: { bot_step?: string | null; bot_enabled?: boolean | null }): boolean {
  return conv.bot_step === "ai_agent" && conv.bot_enabled !== false;
}

function firstName(name: string | null | undefined): string {
  const raw = (name || "").trim().split(/\s+/)[0] || "";
  if (!raw || /^\+?\d{5,}$/.test(raw)) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const hourText = (time: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || "");
  if (!m) return "";
  const h = Number(m[1]);
  return m[2] === "00" ? `${h}h` : `${h}h${m[2]}`;
};

/** "amanhã, sábado (10/10), às 10h" / "hoje às 15h" / "sábado, 10/10, às 10h" */
export function visitWhenText(dateYmd: string, time: string | null | undefined, todayYmd: string): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const ddmm = `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}`;
  const tomorrow = new Date(Date.parse(`${todayYmd}T12:00:00Z`) + 24 * HOUR).toISOString().slice(0, 10);
  const h = hourText(time);
  const at = h ? ` às ${h}` : "";
  if (dateYmd === todayYmd) return `hoje${at}`;
  if (dateYmd === tomorrow) return `amanhã, ${weekday} (${ddmm}),${at}`;
  return `${weekday}, ${ddmm},${at}`;
}

/** Confirmação no tom da IA: lembra a visita e pergunta se pode confirmar */
export function buildAiVisitConfirmation(p: {
  name: string | null | undefined;
  dateYmd: string;
  time: string | null | undefined;
  todayYmd: string;
  companyName: string;
}): string {
  const n = firstName(p.name);
  const hi = n ? `Oi, ${n}! 😊` : "Oi! 😊";
  const when = visitWhenText(p.dateYmd, p.time, p.todayYmd);
  return `${hi} Passando pra lembrar da sua visita ${when} aqui no ${p.companyName} 🏰✨\n\nPosso confirmar sua presença?`;
}

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Resposta em texto à confirmação FIXA (1️⃣ Confirmo / 2️⃣ Preciso remarcar).
 * Palavras inteiras só: antes "sim" dentro de "assim" virava confirmação.
 * Com "não" na frase, o texto não confirma sozinho (a equipe/IA lê).
 */
export function fixedConfirmationTextChoice(text: string): 1 | 2 | null {
  const clean = ` ${strip(text).replace(/[^a-z0-9]+/g, " ").trim()} `;
  if (/ (remarcar|remarca|remarcacao|reagendar|reagenda|desmarcar) /.test(clean)) return 2;
  if (/ (nao|nem) /.test(clean)) return null;
  if (/ (sim|confirmo|confirmado|confirmada|confirmar|confirmadissimo) /.test(clean)) return 1;
  return null;
}
