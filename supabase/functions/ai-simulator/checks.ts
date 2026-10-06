// Conferências do simulador que não dependem de IA (separadas do motor para
// poderem ser testadas sem carregar a IA inteira).

import { moneyValuesIn } from "../_shared/package-pricing.ts";
import type { RuleCheck, ScenarioState } from "./engine.ts";

const DETERMINISTIC: Record<string, string> = {
  sem_palavra_sistema: 'Não falou "sistema" com o cliente',
  valores_conferidos: "Valores (R$) só da tabela",
};

/** Conferências que não dependem de IA */
export function deterministicChecks(state: ScenarioState): RuleCheck[] {
  const aiTexts = state.transcript.filter((e) => e.who === "ia").map((e) => e.text);
  const sistema = aiTexts.find((t) => /\bsistema\b/i.test(t));
  const toolValues = state.transcript.filter((e) => e.who === "ferramenta").flatMap((e) => moneyValuesIn(e.text));
  const cited = aiTexts.flatMap((t) => moneyValuesIn(t));
  const unknown = cited.filter((v) => !toolValues.some((a) => Math.abs(a - v) < 0.01));
  return [
    { id: "sem_palavra_sistema", label: DETERMINISTIC.sem_palavra_sistema, ok: !sistema, note: sistema ? `Disse: "${sistema.slice(0, 160)}"` : "" },
    {
      id: "valores_conferidos",
      label: DETERMINISTIC.valores_conferidos,
      ok: cited.length === 0 ? null : unknown.length === 0,
      note: unknown.length > 0 ? `Valor fora da consulta: ${unknown.map((v) => `R$ ${v}`).join(", ")}` : "",
    },
  ];
}

