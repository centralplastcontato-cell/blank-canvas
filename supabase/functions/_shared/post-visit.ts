// Pós-visita (Automações → Visitas): no dia seguinte à visita, uma mensagem
// para quem visitou e não fechou (e, 3 dias depois sem resposta, uma segunda);
// para quem não compareceu, um convite para remarcar com 2 horários livres.
// Regras puras — quem consulta o banco e envia é o follow-up-check.

import { formatDateLong } from "./whatsapp-format.ts";

export const POST_VISIT_HOUR = 10; // a partir das 10h
export const POST_VISIT_SECOND_DAYS = 3;

const noonMs = (ymd: string) => Date.parse(`${ymd}T12:00:00Z`);
const daysBetween = (a: string, b: string) => Math.round((noonMs(b) - noonMs(a)) / 86400000);

export type PostVisitStep = "first" | "second" | "no_show";

/**
 * Qual mensagem está devida agora (ou null). count: quantas já saíram
 * (99 = encerrado). hourNow no horário de Brasília.
 */
export function postVisitDue(v: {
  status: string;
  visitYmd: string;
  count: number;
  lastAtMs: number | null;
}, todayYmd: string, hourNow: number, nowMs: number): PostVisitStep | null {
  if (hourNow < POST_VISIT_HOUR || v.count >= 99) return null;
  const since = daysBetween(v.visitYmd, todayYmd);
  if (since < 1 || since > 7) return null;
  if (v.status === "nao_compareceu") return v.count === 0 ? "no_show" : null;
  if (v.status !== "realizada") return null;
  if (v.count === 0) return "first";
  if (v.count === 1 && v.lastAtMs !== null && nowMs - v.lastAtMs >= POST_VISIT_SECOND_DAYS * 86400000) return "second";
  return null;
}

const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "");

/** "JULIANA SOUZA" → "Juliana" */
export function firstNameOf(name: string | null | undefined): string {
  const raw = String(name || "").trim().split(/\s+/)[0] || "";
  return /^\+?\d+$/.test(raw) ? "" : cap(raw);
}

/** "PROMOÇÃO MÊS DAS CRIANÇAS" → "Mês das Crianças" */
export function promoName(title: string): string {
  const t = title.replace(/promo[çc][ãa]o/i, "").replace(/[:\-–]+/g, " ").trim();
  if (!t) return "";
  return t.toLowerCase().split(/\s+/).map((w, i) => (i > 0 && ["de", "da", "do", "das", "dos", "e"].includes(w) ? w : cap(w))).join(" ");
}

export interface PostVisitContext {
  firstName: string;
  companyName: string;
  childName?: string | null;
  visitYmd: string;
  todayYmd: string;
  partyYmd?: string | null; // data da festa que ele quer
  partyFree?: boolean | null; // livre agora? null = não conferido
  promo?: { title: string; endYmd: string } | null;
  offers?: string[]; // "quinta (23/10) às 15h", "sábado (25/10) às 10h"
}

export function postVisitMessage(step: PostVisitStep, c: PostVisitContext): string {
  const hi = c.firstName ? `Oi, ${c.firstName}!` : "Oi!";
  const name = c.firstName ? `${c.firstName}, ` : "";
  const when = daysBetween(c.visitYmd, c.todayYmd) === 1 ? "ontem" : "na visita";
  const child = (c.childName || "").trim();
  if (step === "no_show") {
    const invite = c.offers && c.offers.length >= 2
      ? `Quer remarcar a visita? Tenho ${c.offers[0]} ou ${c.offers[1]}. Qual fica melhor?`
      : "Quer remarcar a visita? Me fala o melhor dia e horário pra você que eu vejo aqui 😊";
    return `${hi} Sentimos sua falta ${when === "ontem" ? "ontem" : "na visita"} 😊 Imagino que surgiu algum imprevisto.\n\n${invite}`;
  }
  if (step === "first") {
    const liked = child ? `Espero que ${child} tenha gostado do espaço 🏰💜` : "Espero que vocês tenham gostado do espaço 🏰💜";
    const opening = `${hi} 😊 Foi um prazer receber vocês ${when} aqui no ${c.companyName}! ${liked}`;
    if (c.partyYmd && c.partyFree === true) {
      return `${opening}\n\nO ${formatDateLong(c.partyYmd)}, ainda está livre na agenda ✅ Ficou alguma dúvida que eu possa te ajudar?`;
    }
    if (c.partyYmd && c.partyFree === false) {
      return `${opening}\n\nSobre a data: o ${formatDateLong(c.partyYmd)} já foi reservado, mas tenho opções bem pertinho. Quer que eu te mostre? 😊`;
    }
    return `${opening}\n\nFicou alguma dúvida que eu possa te ajudar?`;
  }
  // second
  const party = child ? `a data ${/a$/i.test(child) ? "da" : "do"} ${child}` : "a data da festa";
  const promo = c.promo && promoName(c.promo.title)
    ? `a promoção ${promoName(c.promo.title)} vai até ${formatDateLong(c.promo.endYmd)} 🎉 `
    : "";
  return promo
    ? `${name}passando só pra lembrar: ${promo}Se quiser, já deixo ${party} encaminhada com a equipe. Me conta como posso te ajudar 😊`
    : `${name}passando só pra saber se ficou alguma dúvida sobre a festa 😊 Se quiser, já deixo ${party} encaminhada com a equipe. É só me responder por aqui 💜`;
}

const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Data da festa pelo lead (mês + dia, ano da próxima ocorrência) quando a conversa não tem a data exata */
export function partyYmdFromLead(month: string | null | undefined, day: number | null | undefined, todayYmd: string): string | null {
  const text = String(month || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const idx = MONTHS.findIndex((m) => text.includes(m));
  const d = Number(day);
  if (idx < 0 || !Number.isInteger(d) || d < 1 || d > 31) return null;
  const mm = String(idx + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const y = text.match(/\b(20\d{2})\b/) || text.match(/[/\s-](\d{2})\b/);
  const thisYear = Number(todayYmd.slice(0, 4));
  const year = y ? (y[1].length === 4 ? Number(y[1]) : 2000 + Number(y[1])) : (`${thisYear}-${mm}-${dd}` < todayYmd ? thisYear + 1 : thisYear);
  const ymd = `${year}-${mm}-${dd}`;
  return Number.isNaN(Date.parse(`${ymd}T12:00:00Z`)) ? null : ymd;
}
