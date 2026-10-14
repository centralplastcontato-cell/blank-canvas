import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS, cleanAnswers, questionnaireProgress, QUESTIONNAIRE, sectionProgress } from "../aiQuestionnaire";

describe("questionário da IA", () => {
  it("chaves únicas", () => {
    const keys = ALL_QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("progresso conta só as obrigatórias", () => {
    const empty = questionnaireProgress({});
    expect(empty.done).toBe(0);
    expect(empty.total).toBe(ALL_QUESTIONS.filter((q) => !q.optional).length);
    const some = questionnaireProgress({ tom: "Simpático e equilibrado", passar_equipe: ["Fornecedores e parcerias"], mais_alguma: "x" });
    expect(some.done).toBe(2);
    const tom = QUESTIONNAIRE.find((s) => s.id === "tom")!;
    expect(sectionProgress(tom, { tom: "Simpático e equilibrado", emojis: "  " })).toEqual({ done: 1, total: 4 });
  });

  it("sobre o buffet usa as mesmas chaves e opções das abas", () => {
    const rapidas = QUESTIONNAIRE.find((s) => s.id === "rapidas")!;
    expect(rapidas.questions.length).toBe(10);
    const bebida = rapidas.questions.find((q) => q.key === "bebida_alcoolica")!;
    expect(bebida.type).toBe("select");
    expect(bebida.options?.length).toBeGreaterThan(1);
    expect(ALL_QUESTIONS.find((q) => q.key === "outros")?.optional).toBe(true);
  });

  it("limpa respostas: tira opção inválida, vazio e chave desconhecida", () => {
    expect(cleanAnswers({
      tom: "Inventado",
      emojis: "Nenhum",
      proibido: "  falar mal de concorrente  ",
      passar_equipe: ["Fornecedores e parcerias", "Outra coisa"],
      conversas: "   ",
      hack: "x",
    })).toEqual({ emojis: "Nenhum", proibido: "falar mal de concorrente", passar_equipe: ["Fornecedores e parcerias"] });
  });
});
