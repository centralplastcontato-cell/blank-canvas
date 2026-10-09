import { describe, it, expect } from "vitest";
import { mergeGenerated, usableVariations, previewMessage, MANUAL_TONE } from "../campaignMessages";

describe("mergeGenerated", () => {
  it("troca as da IA e mantém as escritas à mão", () => {
    const prev = [
      { tone: "curta", text: "velha" },
      { tone: MANUAL_TONE, text: "minha" },
      { tone: MANUAL_TONE, text: "  " },
    ];
    const out = mergeGenerated(prev, [{ tone: "amigável", text: "nova" }]);
    expect(out).toEqual([
      { tone: "amigável", text: "nova" },
      { tone: MANUAL_TONE, text: "minha" },
    ]);
  });
});

describe("usableVariations", () => {
  it("tira as vazias", () => {
    expect(usableVariations([{ tone: "manual", text: "" }, { tone: "curta", text: "oi" }])).toEqual([{ tone: "curta", text: "oi" }]);
  });
});

describe("previewMessage", () => {
  it("troca {nome} e {empresa}", () => {
    expect(previewMessage("Oi {nome}, aqui é da {{empresa}}", "Ana", "Castelo")).toBe("Oi Ana, aqui é da Castelo");
  });
});
