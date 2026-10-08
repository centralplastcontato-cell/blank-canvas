// Texto das mensagens da jornada da Bia (lembrete de inatividade e
// follow-ups): o aviso que a IA recebe para escrever e a conferência do que
// ela escreveu antes de sair para o cliente.

import { allowedMoneyValues, moneyValuesIn } from "./package-pricing.ts";
import { falseMaterialClaims, hasMaterialClaim, type MaterialKind } from "./material-claims.ts";
import { airyParagraphs, fixWeekdays, formatDateLong, markTodayTomorrow, moneyWithCents } from "./whatsapp-format.ts";

export interface FollowUpContext {
  kind: "inactivity" | "step" | "reactivation";
  daysBefore?: number; // lembrete antes da festa: quantos dias antes
  partyExact?: boolean; // false = só o mês (dia 15 aproximado)
  alternatives?: string | null; // linhas prontas de outras datas livres ("🗓️ Sábado, 6 de março" + "🌙 Noite (19h às 23h)")
  stepNumber?: number; // 1, 2, ...
  reminderNumber?: number; // lembrete de inatividade: 1º ou 2º
  stepsTotal?: number;
  goal?: string;
  silenceMs: number;
  todayYmd: string;
  clientName?: string | null;
  birthdayName?: string | null;
  partyYmd?: string | null; // data da festa que o cliente pediu
  partyMonth?: string | null;
  guests?: string | null;
  partyDateFree?: string[] | null; // horários livres na data pedida ("almoço (13h)"); [] = ocupada; null = não conferido
  promoLine?: string | null;
  valuesAlreadyGiven: boolean;
  materialsSent: MaterialKind[]; // confirmados pelo WhatsApp nesta conversa
  withImage?: boolean; // a mensagem vai como legenda de uma arte do buffet
}

const MATERIAL_NAME: Record<MaterialKind, string> = { fotos: "as fotos do espaço", video: "o vídeo", pacotes: "o PDF dos pacotes" };

const silenceText = (ms: number): string => {
  const min = Math.round(ms / 60000);
  if (min < 120) return `${min} minutos`;
  const h = Math.round(ms / 3600000);
  if (h < 48) return `${h} horas`;
  return `${Math.round(h / 24)} dias`;
};

/** Aviso interno para a IA escrever a mensagem desta etapa da jornada */
export function followUpInstruction(c: FollowUpContext): string {
  const who = [
    c.clientName ? `cliente: ${c.clientName}` : null,
    c.birthdayName ? `aniversariante: ${c.birthdayName}` : null,
    c.partyYmd ? `data da festa pedida: ${formatDateLong(c.partyYmd)}` : c.partyMonth ? `mês da festa: ${c.partyMonth}` : null,
    c.guests ? `convidados: ${c.guests}` : null,
  ].filter(Boolean).join("; ");
  const monthOnly = c.kind === "reactivation" && c.partyExact === false;
  const altText = c.alternatives
    ? ` Outras datas disponíveis neste momento — linhas prontas (copie como estão, uma data por bloco):\n${c.alternatives}\n`
    : "";
  const agenda = monthOnly
    ? (c.alternatives ? ` AGENDA AGORA: o cliente falou só do mês.${altText}` : " AGENDA AGORA: não achei datas livres nesse mês — ofereça ver com a equipe ou o mês seguinte.")
    : !c.partyYmd || c.partyDateFree === null || c.partyDateFree === undefined
    ? ""
    : c.partyDateFree.length > 0
    ? ` AGENDA AGORA: ${formatDateLong(c.partyYmd)} ainda está disponível neste momento (${c.partyDateFree.join(" ou ")}). Se citar, diga "disponível neste momento" — você não reserva nem segura a data.`
    : c.kind === "reactivation"
    ? ` AGENDA AGORA: ${formatDateLong(c.partyYmd)} NÃO está mais disponível (foi reservada). Avise com gentileza e honestidade, sem drama, e ofereça as alternativas abaixo.${altText || " Não achei outras datas livres perto: ofereça ver com a equipe."}`
    : ` AGENDA AGORA: ${formatDateLong(c.partyYmd)} NÃO está mais disponível. Não ofereça essa data; se fizer sentido, ofereça ver outras datas com ele.`;
  const what = c.kind === "reactivation"
    ? `LEMBRETE ANTES DA FESTA: faltam cerca de ${c.daysBefore} dias para a festa e o cliente não responde há ${silenceText(c.silenceMs)}. Retome o contato com carinho (a festa está chegando), mostre a agenda real (abaixo) e convide para conhecer o espaço ou garantir a data com a equipe. Escreva UMA mensagem curta (2 a 5 frases + as linhas de datas, se houver), terminando com uma pergunta simples. Não diga que é um lembrete automático.`
    : c.kind === "inactivity" && c.reminderNumber === 2
    ? `O cliente parou de responder há ${silenceText(c.silenceMs)} e não respondeu nem ao seu 1º lembrete. Escreva UM 2º lembrete bem curto (1 ou 2 frases), em outro tom e sem repetir o 1º: leve e sem pressão — deixe claro que você fica por aqui quando ele puder e termine com uma pergunta simples.`
    : c.kind === "inactivity"
    ? `O cliente parou de responder há ${silenceText(c.silenceMs)}, no meio da conversa. Escreva UM lembrete curto (1 ou 2 frases) retomando de onde vocês pararam. NÃO repita a pergunta da sua última mensagem, nem com outras palavras: traga algo NOVO e útil (ex.: depois das fotos/PDF, convide para conhecer o espaço com 2 horários; ou destaque um diferencial do buffet que combine com a festa dele) e termine com uma pergunta DIFERENTE e simples.`
    : `Follow-up ${c.stepNumber} de ${c.stepsTotal}: o cliente não responde há ${silenceText(c.silenceMs)}. OBJETIVO DESTA MENSAGEM (definido pelo buffet): ${c.goal} Escreva UMA mensagem curta (2 a 4 frases), no seu tom, terminando com uma pergunta simples.`;
  return [
    `MENSAGEM DE ACOMPANHAMENTO (o cliente não vê este aviso). ${what}`,
    who ? `Dados do cliente: ${who}.` : "",
    agenda,
    c.promoLine ? ` ${c.promoLine}` : "",
    c.materialsSent.length > 0
      ? ` Materiais já enviados nesta conversa: ${c.materialsSent.map((k) => MATERIAL_NAME[k]).join(", ")}. Não cite os que não estão nesta lista.`
      : " Nenhum material (fotos, vídeo, PDF) foi enviado nesta conversa: não pergunte se ele viu nem diga que mandou.",
    ` Regras: não se apresente de novo; não diga que é mensagem automática; não use menu de opções numeradas; não pressione; não invente escassez (nada de "últimas vagas" ou "datas esgotando" — só o que estiver escrito acima); não reserve nem prometa nada; não diga que mandou fotos, vídeo ou PDF se isso não aparece na conversa.`,
    c.valuesAlreadyGiven
      ? " Valores: só se precisar, e só os mesmos que você já passou nesta conversa."
      : " Valores: NÃO cite valores (o cliente não perguntou).",
    c.withImage ? " Esta mensagem vai como legenda de uma arte do buffet: não descreva a imagem nem diga \"veja a imagem\"; escreva normalmente." : "",
    " Responda só com o texto da mensagem para o cliente.",
  ].join("");
}

const MATERIAL_MENTION: Record<MaterialKind, RegExp> = {
  fotos: /(?<![\p{L}])fot(?:o|os|inho|inhos)(?![\p{L}])/iu,
  video: /(?<![\p{L}])v[ií]deos?(?![\p{L}])/iu,
  pacotes: /(?<![\p{L}])pdf(?![\p{L}])/iu,
};
// Escassez que a Bia não tem como saber (o prazo da promoção e a agenda real vêm no aviso)
const SCARCITY = /[úu]ltimas?\s+(?:vagas?|datas?|unidades)|esgot|quase\s+(?:lotad|cheia|sem\s+data)|poucas\s+(?:vagas|datas)|restam\s+poucas|corr(?:e|a)\s+(?:que|antes)|muita\s+procura|saindo\s+r[áa]pido|(?:bem|muito)\s+concorrid/iu;

export interface FollowUpCheck {
  ok: boolean;
  text: string;
  problem?: string;
}

/** Confere e arruma o texto antes de sair: valores, "te mandei", datas e centavos */
const QUESTION_STOPWORDS = new Set(["voce", "voces", "nosso", "nossa", "nossos", "nossas", "para", "pra", "esse", "essa", "isso", "aqui", "agora", "entao", "tudo", "como", "qual", "quer", "sobre", "ainda", "mais", "pode", "posso", "gente", "dela", "dele"]);
const contentWords = (t: string) => new Set(
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !QUESTION_STOPWORDS.has(w)),
);
const questionsOf = (t: string) => (t.match(/[^.!?\n]*\?/g) || []).map((q) => q.trim()).filter(Boolean);

/**
 * O lembrete repete a pergunta da última mensagem da IA ("E aí, o que achou
 * do nosso espaço?" → "Ana, o que achou do espaço para a festinha?")?
 */
export function repeatsLastQuestion(reminder: string, lastAssistant: string): boolean {
  const last = questionsOf(lastAssistant).pop();
  if (!last) return false;
  const lastWords = contentWords(last);
  if (lastWords.size < 2) return false;
  return questionsOf(reminder).some((q) => {
    const words = contentWords(q);
    const shared = [...lastWords].filter((w) => words.has(w)).length;
    return shared / lastWords.size >= 0.6;
  });
}

export function checkFollowUpText(
  raw: string,
  opts: { previousAssistantTexts: string[]; sentMaterials: Set<MaterialKind>; todayYmd: string },
): FollowUpCheck {
  let text = String(raw || "").trim().replace(/^["“]|["”]$/g, "").trim();
  if (text.length < 8) return { ok: false, text, problem: "texto vazio" };
  if (/1️⃣|2️⃣|3️⃣/.test(text)) return { ok: false, text, problem: "menu numerado" };
  const allowed = allowedMoneyValues(opts.previousAssistantTexts.flatMap((t) => moneyValuesIn(t)));
  const unknown = moneyValuesIn(text).filter((v) => !allowed.some((a) => Math.abs(a - v) < 0.01));
  if (unknown.length > 0) return { ok: false, text, problem: `valor fora da conversa (${unknown.join(", ")})` };
  if (hasMaterialClaim(text) && falseMaterialClaims(text, opts.sentMaterials).length > 0) {
    return { ok: false, text, problem: "disse que mandou material que não saiu" };
  }
  // "Conseguiu ver as fotos?" sem as fotos terem saído
  const unsent = (Object.keys(MATERIAL_MENTION) as MaterialKind[]).filter((k) => !opts.sentMaterials.has(k) && MATERIAL_MENTION[k].test(text));
  if (unsent.length > 0) return { ok: false, text, problem: `falou de ${unsent.map((k) => MATERIAL_NAME[k]).join(" e ")}, que não foi enviado` };
  if (SCARCITY.test(text)) return { ok: false, text, problem: "escassez inventada (vagas/datas acabando)" };
  const lastAssistant = opts.previousAssistantTexts[opts.previousAssistantTexts.length - 1] || "";
  if (repeatsLastQuestion(text, lastAssistant)) return { ok: false, text, problem: "repetiu a pergunta da sua última mensagem — pergunte outra coisa e traga algo novo" };
  text = airyParagraphs(moneyWithCents(markTodayTomorrow(fixWeekdays(text, opts.todayYmd), opts.todayYmd)));
  return { ok: true, text };
}
