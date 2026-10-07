// Conferências do simulador que não dependem de IA (separadas do motor para
// poderem ser testadas sem carregar a IA inteira).

import { allowedMoneyValues, moneyValuesIn } from "../_shared/package-pricing.ts";
import { asksPartnership, clientAsksVisit, clientDeclined, hasVisitInvite } from "../_shared/ai-turn.ts";
import { falseMaterialClaims, hasMaterialClaim, type MaterialKind } from "../_shared/material-claims.ts";
import { houseRuleViolatingSentences, parseHouseRules, topicsAsked } from "../_shared/house-rules.ts";
import { weekdayMismatches } from "../_shared/whatsapp-format.ts";

export interface TranscriptEntry {
  who: "cliente" | "ia" | "ferramenta";
  text: string;
  kind?: string; // text | image | video | document (mensagens da IA)
  turn: number;
}

export interface RuleCheck {
  id: string;
  label: string;
  ok: boolean | null; // null = não se aplica
  note: string;
  /** Comentário do avaliador (IA): aparece no relatório, mas não reprova */
  advisory?: boolean;
}

/** Passou = nenhuma conferência do código falhou (o avaliador só comenta) */
export const passed = (checks: RuleCheck[]) => checks.every((c) => c.advisory === true || c.ok !== false);

const DETERMINISTIC: Record<string, string> = {
  sem_palavra_sistema: 'Não falou "sistema" com o cliente',
  valores_conferidos: "Valores (R$) só da tabela",
  convite_na_hora: "Convite para visita na hora certa",
  uma_resposta_por_vez: "Uma resposta por vez",
  te_mandei: "Só disse que mandou material que saiu",
  datas_da_agenda: "Datas de festa vindas da agenda",
  regra_do_buffet: "Seguiu as regras do cadastro (comida de fora, animal)",
  dia_da_semana: "Dia da semana certo nas datas",
  permuta_equipe: "Permuta/parceria passada para a equipe",
};

const MEDIA_KIND: Record<string, MaterialKind> = { image: "fotos", video: "video", document: "pacotes" };
const MONTHS = "janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
const normMonth = (m: string) => m.toLowerCase().replace("marco", "março");

/**
 * Datas de festa que a IA listou no formato da agenda ("🗓️ Sábado, 5 de
 * dezembro" com ☀️/🌙 embaixo). Horários de visita não entram.
 */
// 🗓️ (atual) ou 📅 (conversas antigas)
const DAY_ICON = /📅|🗓/u;

export function listedPartyDates(text: string): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (!DAY_ICON.test(line)) return;
    const block: string[] = [];
    for (let j = i + 1; j < lines.length && !DAY_ICON.test(lines[j]) && lines[j].trim(); j++) block.push(lines[j]);
    // Só o formato da agenda ("☀️ Almoço (13h às 17h)"); horário de visita ("🌙 noite (19h)") não entra
    if (!block.some((l) => /(☀️|🌙)\s*(almo[çc]o|noite)\s*\(\d{1,2}h(\d{2})?\s+[àa]s\s+\d{1,2}h/i.test(l))) return;
    const m = line.match(new RegExp(`(\\d{1,2})\\s+de\\s+(${MONTHS})`, "i"));
    if (m) out.push(`${Number(m[1])} de ${normMonth(m[2])}`);
  });
  return out;
}

const MONTH_LIST = MONTHS.split("|").filter((m) => m !== "marco");
const mentionsDate = (text: string, date: string) => {
  const [d, , m] = date.split(" ");
  const num = MONTH_LIST.indexOf(m) + 1;
  return new RegExp(`(?<!\\d)0?${d}\\s+de\\s+(${m}|${m.replace("ç", "c")})|(?<!\\d)0?${d}/0?${num}(?!\\d)`, "i").test(text);
};

export interface CheckOptions {
  /** Informações do buffet (cadastro), para as regras de comida de fora e animal */
  knowledge?: string;
  /** Hoje (AAAA-MM-DD, horário de Brasília), para conferir dia da semana */
  todayYmd?: string;
}

/** Conferências que não dependem de IA */
export function deterministicChecks(state: { transcript: TranscriptEntry[] }, opts: CheckOptions = {}): RuleCheck[] {
  const aiTexts = state.transcript.filter((e) => e.who === "ia").map((e) => e.text);
  const sistema = aiTexts.find((t) => /\bsistema\b/i.test(t));
  const toolValues = allowedMoneyValues(state.transcript.filter((e) => e.who === "ferramenta").flatMap((e) => moneyValuesIn(e.text)));
  const cited = aiTexts.flatMap((t) => moneyValuesIn(t));
  const unknown = cited.filter((v) => !toolValues.some((a) => Math.abs(a - v) < 0.01));
  // Convite repetido (menos de 3 respostas depois do anterior, sem o cliente
  // pedir) ou logo depois de o cliente desistir
  const turns = Array.from(new Set(state.transcript.map((e) => e.turn))).sort((x, y) => x - y);
  let lastInviteIdx: number | null = null;
  let replyIdx = 0;
  let inviteProblem = "";
  for (const t of turns) {
    const clientText = state.transcript.filter((e) => e.turn === t && e.who === "cliente").map((e) => e.text).join("\n");
    const reply = state.transcript.filter((e) => e.turn === t && e.who === "ia" && (!e.kind || e.kind === "text")).map((e) => e.text).join("\n");
    if (!reply) continue;
    if (hasVisitInvite(reply) && !clientAsksVisit(clientText)) {
      if (clientDeclined(clientText)) inviteProblem ||= `Convidou para visita logo depois de o cliente desistir (vez ${t})`;
      else if (lastInviteIdx !== null && replyIdx - lastInviteIdx < 3) inviteProblem ||= `Convidou para visita de novo ${replyIdx - lastInviteIdx} resposta(s) depois (vez ${t})`;
      lastInviteIdx = replyIdx;
    }
    replyIdx++;
  }
  // Mais de uma mensagem de conversa na mesma vez (legendas e mídias não contam)
  const doubleTurn = turns.find((t) => state.transcript.filter((e) => e.turn === t && e.who === "ia" && (!e.kind || e.kind === "text")).length > 1);

  // "Te mandei as fotos/o vídeo/o PDF" sem o material ter saído até aquela vez
  const isText = (e: TranscriptEntry) => e.who === "ia" && (!e.kind || e.kind === "text" || e.kind === "legenda");
  let claimSeen = false;
  let falseClaim = "";
  for (const e of state.transcript) {
    if (!isText(e) || !hasMaterialClaim(e.text)) continue;
    claimSeen = true;
    const sent = new Set(state.transcript.filter((x) => x.who === "ia" && x.turn <= e.turn && MEDIA_KIND[x.kind || ""]).map((x) => MEDIA_KIND[x.kind as string]));
    const wrong = falseMaterialClaims(e.text, sent);
    if (wrong.length > 0 && !falseClaim) falseClaim = `Disse "${wrong[0].slice(0, 140)}" sem o material ter saído (vez ${e.turn})`;
  }

  // Data de festa listada que não veio de nenhuma consulta à agenda até aquela vez
  let listedAny = false;
  let inventedDate = "";
  for (const e of state.transcript) {
    if (!isText(e)) continue;
    const dates = listedPartyDates(e.text);
    if (dates.length === 0) continue;
    listedAny = true;
    // Fonte: o que a agenda devolveu ou a data que o próprio cliente deu
    const toolText = state.transcript.filter((x) => (x.who === "ferramenta" || x.who === "cliente") && x.turn <= e.turn).map((x) => x.text).join("\n");
    const missing = dates.find((d) => !mentionsDate(toolText, d));
    if (missing && !inventedDate) inventedDate = `Listou ${missing} sem a agenda ter mostrado essa data (vez ${e.turn})`;
  }

  // Regras do cadastro (comida/bolo de fora, animal) que proíbem
  const rules = parseHouseRules(opts.knowledge).filter((r) => r.forbidden);
  let ruleAsked = false;
  let ruleBroken = "";
  for (const t of turns) {
    const clientText = state.transcript.filter((e) => e.turn === t && e.who === "cliente").map((e) => e.text).join("\n");
    const reply = state.transcript.filter((e) => e.turn === t && isText(e)).map((e) => e.text).join("\n");
    const asked = topicsAsked(clientText).filter((topic) => rules.some((r) => r.topic === topic));
    if (asked.length > 0) ruleAsked = true;
    const bad = rules.length > 0 ? houseRuleViolatingSentences(reply, rules, asked) : [];
    if (bad.length > 0 && !ruleBroken) ruleBroken = `Disse "${bad[0].slice(0, 140)}", contra o cadastro (vez ${t})`;
  }

  // Dia da semana que não bate com a data ("sexta, 17 de outubro" num sábado)
  const today = opts.todayYmd || new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const datedTexts = state.transcript.filter((e) => isText(e) && new RegExp(`\\d{1,2}\\s+de\\s+(${MONTHS})`, "i").test(e.text));
  const wrongDay = datedTexts.flatMap((e) => weekdayMismatches(e.text, today).map((w) => `"${w.said}" (é ${w.right}) na vez ${e.turn}`))[0] || "";

  // Proposta de permuta/parceria: tem de ter passado para a equipe na mesma vez ou depois
  const partnershipTurn = state.transcript.find((e) => e.who === "cliente" && asksPartnership(e.text))?.turn;
  const transferred = partnershipTurn !== undefined &&
    state.transcript.some((e) => e.who === "ferramenta" && e.turn >= partnershipTurn && e.text.startsWith("transferir_para_atendente("));

  return [
    { id: "uma_resposta_por_vez", label: DETERMINISTIC.uma_resposta_por_vez, ok: doubleTurn === undefined, note: doubleTurn !== undefined ? `Mais de uma mensagem de conversa na vez ${doubleTurn}` : "" },
    { id: "convite_na_hora", label: DETERMINISTIC.convite_na_hora, ok: !inviteProblem, note: inviteProblem },
    { id: "sem_palavra_sistema", label: DETERMINISTIC.sem_palavra_sistema, ok: !sistema, note: sistema ? `Disse: "${sistema.slice(0, 160)}"` : "" },
    {
      id: "valores_conferidos",
      label: DETERMINISTIC.valores_conferidos,
      ok: cited.length === 0 ? null : unknown.length === 0,
      note: unknown.length > 0 ? `Valor fora da consulta: ${unknown.map((v) => `R$ ${v}`).join(", ")}` : "",
    },
    { id: "te_mandei", label: DETERMINISTIC.te_mandei, ok: claimSeen ? !falseClaim : null, note: falseClaim },
    { id: "datas_da_agenda", label: DETERMINISTIC.datas_da_agenda, ok: listedAny ? !inventedDate : null, note: inventedDate },
    { id: "regra_do_buffet", label: DETERMINISTIC.regra_do_buffet, ok: ruleBroken ? false : ruleAsked ? true : null, note: ruleBroken },
    { id: "dia_da_semana", label: DETERMINISTIC.dia_da_semana, ok: datedTexts.length > 0 ? !wrongDay : null, note: wrongDay },
    {
      id: "permuta_equipe",
      label: DETERMINISTIC.permuta_equipe,
      ok: partnershipTurn === undefined ? null : transferred,
      note: partnershipTurn !== undefined && !transferred ? `Cliente propôs permuta/parceria (vez ${partnershipTurn}) e a conversa não foi passada para a equipe` : "",
    },
  ];
}

