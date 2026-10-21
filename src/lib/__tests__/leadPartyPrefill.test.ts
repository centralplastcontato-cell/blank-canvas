import { describe, expect, it } from "vitest";
import { leadPartyPrefill } from "../leadPartyPrefill";

describe("leadPartyPrefill", () => {
  it("dia e mês do lead com o ano da próxima ocorrência", () => {
    expect(leadPartyPrefill({ month: "Fevereiro", day_of_month: 21, guests: "50 pessoas" }, "2026-10-21"))
      .toEqual({ day: "21", month: "02", year: "2027", guests: 50 });
    expect(leadPartyPrefill({ month: "Dezembro", day_of_month: 13, guests: null }, "2026-10-21"))
      .toEqual({ day: "13", month: "12", year: "2026", guests: null });
    // mesmo mês, dia que já passou → ano que vem
    expect(leadPartyPrefill({ month: "Outubro", day_of_month: 5 }, "2026-10-21").year).toBe("2027");
  });

  it("ano escrito no mês e só o mês", () => {
    expect(leadPartyPrefill({ month: "Novembro/26", day_of_month: null, guests: "70 a 90" }, "2026-10-21"))
      .toEqual({ day: null, month: "11", year: "2026", guests: 70 });
    expect(leadPartyPrefill({ month: "março de 2027" }, "2026-10-21")).toMatchObject({ month: "03", year: "2027" });
    expect(leadPartyPrefill({ month: "", guests: "abc" }, "2026-10-21")).toEqual({ day: null, month: null, year: null, guests: null });
  });
});
