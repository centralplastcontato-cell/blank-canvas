// Conferências do simulador que não dependem de IA (separadas do motor para
// poderem ser testadas sem carregar a IA inteira).

import { allowedMoneyValues, moneyValuesIn } from "../_shared/package-pricing.ts";
import { clientAsksVisit, clientDeclined, hasVisitInvite } from "../_shared/ai-turn.ts";

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
}

const DETERMINISTIC: Record<string, string> = {
  sem_palavra_sistema: 'Não falou "sistema" com o cliente',
  valores_conferidos: "Valores (R$) só da tabela",
  convite_na_hora: "Convite para visita na hora certa",
};

/** Conferências que não dependem de IA */
export function deterministicChecks(state: { transcript: TranscriptEntry[] }): RuleCheck[] {
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
  return [
    { id: "convite_na_hora", label: DETERMINISTIC.convite_na_hora, ok: !inviteProblem, note: inviteProblem },
    { id: "sem_palavra_sistema", label: DETERMINISTIC.sem_palavra_sistema, ok: !sistema, note: sistema ? `Disse: "${sistema.slice(0, 160)}"` : "" },
    {
      id: "valores_conferidos",
      label: DETERMINISTIC.valores_conferidos,
      ok: cited.length === 0 ? null : unknown.length === 0,
      note: unknown.length > 0 ? `Valor fora da consulta: ${unknown.map((v) => `R$ ${v}`).join(", ")}` : "",
    },
  ];
}

