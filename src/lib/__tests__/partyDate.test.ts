import { describe, expect, it } from "vitest";
import { daysInMonthOption, firstWeekdayOf, formatLeadDate, isPastDay, monthOptionLabel, parseMonthOption, upcomingMonthOptions } from "../partyDate";

// 7 de outubro de 2026 (quarta-feira), meio-dia
const now = new Date(2026, 9, 7, 12, 0);

describe("partyDate", () => {
  it("lista os próximos 12 meses com ano, começando no mês atual", () => {
    const opts = upcomingMonthOptions(now);
    expect(opts).toHaveLength(12);
    expect(opts[0]).toBe("Outubro/26");
    expect(opts[2]).toBe("Dezembro/26");
    expect(opts[3]).toBe("Janeiro/27");
    expect(opts[11]).toBe("Setembro/27");
  });

  it("pula o mês atual no último dia dele", () => {
    expect(upcomingMonthOptions(new Date(2026, 9, 31, 10))[0]).toBe("Novembro/26");
  });

  it("mês sem ano vira o próximo que ainda não passou", () => {
    expect(parseMonthOption("Setembro", now)).toEqual({ monthIndex: 8, year: 2027 });
    expect(parseMonthOption("Outubro", now)).toEqual({ monthIndex: 9, year: 2026 });
    expect(parseMonthOption("Março/27", now)).toEqual({ monthIndex: 2, year: 2027 });
    expect(parseMonthOption("Março/2028", now)).toEqual({ monthIndex: 2, year: 2028 });
    expect(parseMonthOption("Qualquer", now)).toBeNull();
  });

  it("dia da semana e tamanho do mês pelo ano certo", () => {
    // 1º de setembro de 2027 é quarta-feira; em 2026 era terça
    expect(firstWeekdayOf("Setembro/27", now)).toBe(3);
    expect(firstWeekdayOf("Setembro", now)).toBe(3);
    expect(daysInMonthOption("Fevereiro/28", now)).toBe(29);
  });

  it("bloqueia dias que já passaram e o dia de hoje", () => {
    expect(isPastDay("Outubro/26", 6, now)).toBe(true);
    expect(isPastDay("Outubro/26", 7, now)).toBe(true);
    expect(isPastDay("Outubro/26", 8, now)).toBe(false);
    expect(isPastDay("Setembro/27", 18, now)).toBe(false);
  });

  it("data por extenso com dia da semana e ano", () => {
    expect(formatLeadDate("Setembro/27", 18, now)).toBe("sábado, 18 de setembro de 2027");
    expect(formatLeadDate("Setembro", 18, now)).toBe("sábado, 18 de setembro de 2027");
    expect(formatLeadDate("Novembro/26", undefined, now)).toBe("novembro de 2026");
    expect(monthOptionLabel("Setembro/27", now)).toBe("setembro de 2027");
  });
});

describe("recesso no formulário", () => {
  it("bloqueia os dias do recesso", async () => {
    const { isClosedLeadDay, parseClosedPeriods } = await import("../partyDate");
    const periods = parseClosedPeriods([{ start: "2026-12-23", end: "2027-01-03" }, { bad: true }]);
    expect(periods).toHaveLength(1);
    expect(isClosedLeadDay("Dezembro/26", 22, periods, now)).toBe(false);
    expect(isClosedLeadDay("Dezembro/26", 23, periods, now)).toBe(true);
    expect(isClosedLeadDay("Janeiro/27", 3, periods, now)).toBe(true);
    expect(isClosedLeadDay("Janeiro/27", 4, periods, now)).toBe(false);
    expect(parseClosedPeriods(null)).toEqual([]);
  });
});
