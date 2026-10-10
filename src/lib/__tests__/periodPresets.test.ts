import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getPeriodPresets } from "../periodPresets";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

describe("getPeriodPresets", () => {
  it("semestre atual em outubro: julho a dezembro", () => {
    const sem = getPeriodPresets(new Date(2026, 9, 9)).find((p) => p.label === "Semestre atual")!;
    expect(ymd(sem.from)).toBe("2026-07-01");
    expect(ymd(sem.to)).toBe("2026-12-31");
  });

  it("semestre atual em março: janeiro a junho", () => {
    const sem = getPeriodPresets(new Date(2026, 2, 15)).find((p) => p.label === "Semestre atual")!;
    expect(ymd(sem.from)).toBe("2026-01-01");
    expect(ymd(sem.to)).toBe("2026-06-30");
  });

  it("trimestres e ano", () => {
    const [last, next, , year] = getPeriodPresets(new Date(2026, 9, 9));
    expect([ymd(last.from), ymd(last.to)]).toEqual(["2026-07-01", "2026-09-30"]);
    expect([ymd(next.from), ymd(next.to)]).toEqual(["2027-01-01", "2027-03-31"]);
    expect([ymd(year.from), ymd(year.to), year.label]).toEqual(["2026-01-01", "2026-12-31", "Ano 2026 inteiro"]);
  });
});
