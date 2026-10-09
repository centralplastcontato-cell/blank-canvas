import { describe, expect, it } from "vitest";
import { brtDateDaysAgo, brtNow, describeVisitWhen, isVisitOutcomeDue } from "../visitOutcome";

// 09/10/2026 18:30 em Brasília = 21:30 UTC
const NOW = new Date("2026-10-09T21:30:00Z");

describe("brtNow", () => {
  it("usa o horário de Brasília, não o UTC", () => {
    expect(brtNow(NOW)).toEqual({ date: "2026-10-09", time: "18:30" });
    // 01:00 UTC do dia 10 ainda é dia 9 em Brasília
    expect(brtNow(new Date("2026-10-10T01:00:00Z")).date).toBe("2026-10-09");
  });

  it("calcula dias atrás", () => {
    expect(brtDateDaysAgo(1, NOW)).toBe("2026-10-08");
    expect(brtDateDaysAgo(30, NOW)).toBe("2026-09-09");
  });
});

describe("isVisitOutcomeDue", () => {
  it("visita de ontem: pergunta", () => {
    expect(isVisitOutcomeDue("2026-10-08", "15:00", NOW)).toBe(true);
    expect(isVisitOutcomeDue("2026-10-08", null, NOW)).toBe(true);
  });

  it("visita de hoje: só 1 h depois do horário", () => {
    expect(isVisitOutcomeDue("2026-10-09", "17:00", NOW)).toBe(true);
    expect(isVisitOutcomeDue("2026-10-09", "17:30", NOW)).toBe(true);
    expect(isVisitOutcomeDue("2026-10-09", "17:45", NOW)).toBe(false);
    expect(isVisitOutcomeDue("2026-10-09", "19:00", NOW)).toBe(false);
  });

  it("visita de hoje sem horário: só amanhã", () => {
    expect(isVisitOutcomeDue("2026-10-09", null, NOW)).toBe(false);
    expect(isVisitOutcomeDue("2026-10-09", "", NOW)).toBe(false);
  });

  it("aceita horário com segundos", () => {
    expect(isVisitOutcomeDue("2026-10-09", "16:00:00", NOW)).toBe(true);
  });

  it("visita futura: não pergunta", () => {
    expect(isVisitOutcomeDue("2026-10-10", "09:00", NOW)).toBe(false);
  });
});

describe("describeVisitWhen", () => {
  it("hoje, ontem ou a data", () => {
    expect(describeVisitWhen("2026-10-09", "15:00:00", NOW)).toBe("hoje às 15:00");
    expect(describeVisitWhen("2026-10-08", "10:30", NOW)).toBe("ontem às 10:30");
    expect(describeVisitWhen("2026-10-02", null, NOW)).toBe("02/10");
  });
});
