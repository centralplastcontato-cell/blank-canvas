import { describe, it, expect } from "vitest";
import { parseVisitHours, serializeVisitHours } from "../AiAgentSection";

describe("serializeVisitHours", () => {
  it("horário único para todos os dias selecionados", () => {
    expect(serializeVisitHours([0, 1, 2, 3, 4], "10:00", "17:00", true)).toBe(
      "Segunda a sexta, das 10:00 às 17:00, de meia em meia hora",
    );
  });

  it("sábado com horário diferente vira um segundo trecho", () => {
    expect(
      serializeVisitHours([0, 1, 2, 3, 4, 5], "10:00", "17:00", true, true, "09:00", "13:00"),
    ).toBe(
      "Segunda a sexta, das 10:00 às 17:00, de meia em meia hora; sábado, das 09:00 às 13:00, de meia em meia hora",
    );
  });

  it("satDifferent é ignorado se sábado não estiver nos dias", () => {
    expect(serializeVisitHours([0, 1, 2, 3, 4], "10:00", "17:00", true, true, "09:00", "13:00")).toBe(
      "Segunda a sexta, das 10:00 às 17:00, de meia em meia hora",
    );
  });

  it("só sábado, com horário diferente dele mesmo: fica só o trecho do sábado", () => {
    expect(serializeVisitHours([5], "10:00", "17:00", true, true, "09:00", "13:00")).toBe(
      "sábado, das 09:00 às 13:00, de meia em meia hora",
    );
  });
});

describe("parseVisitHours", () => {
  it("texto vazio cai no padrão", () => {
    const parsed = parseVisitHours(null);
    expect(parsed).toMatchObject({ days: [0, 1, 2, 3, 4], start: "10:00", end: "17:00", halfHour: true, satDifferent: false });
  });

  it("lê de volta um horário único", () => {
    const parsed = parseVisitHours("Segunda a sábado, das 10:00 às 17:00, de meia em meia hora");
    expect(parsed).toMatchObject({ days: [0, 1, 2, 3, 4, 5], start: "10:00", end: "17:00", halfHour: true, satDifferent: false });
  });

  it("lê de volta o sábado com horário diferente", () => {
    const parsed = parseVisitHours(
      "Segunda a sexta, das 10:00 às 17:00, de meia em meia hora; sábado, das 09:00 às 13:00, de hora em hora",
    );
    expect(parsed).toMatchObject({
      days: [0, 1, 2, 3, 4, 5],
      start: "10:00",
      end: "17:00",
      halfHour: true,
      satDifferent: true,
      satStart: "09:00",
      satEnd: "13:00",
    });
  });

  it("ida e volta (serialize → parse) preserva os dados", () => {
    const serialized = serializeVisitHours([0, 2, 4, 5], "11:00", "16:30", false, true, "08:00", "12:00");
    const parsed = parseVisitHours(serialized);
    expect(parsed).toMatchObject({
      days: [0, 2, 4, 5],
      start: "11:00",
      end: "16:30",
      halfHour: false,
      satDifferent: true,
      satStart: "08:00",
      satEnd: "12:00",
    });
  });
});
