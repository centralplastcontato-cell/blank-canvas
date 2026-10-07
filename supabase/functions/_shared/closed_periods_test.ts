import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { closedPeriodAt, closedPeriodsNote, formatClosedPeriod, isClosedDay, parseClosedPeriods, reopenText } from "./closed-periods.ts";

const recesso = parseClosedPeriods([{ start: "2026-12-23", end: "2027-01-03" }]);

Deno.test("parseClosedPeriods aceita lista ou texto e ignora o que está errado", () => {
  assertEquals(recesso, [{ start: "2026-12-23", end: "2027-01-03" }]);
  assertEquals(parseClosedPeriods('[{"start":"2026-12-23","end":"2027-01-03"}]'), recesso);
  assertEquals(parseClosedPeriods([{ start: "2027-01-03", end: "2026-12-23" }, { start: "x" }]), []);
  assertEquals(parseClosedPeriods([{ start: "2026-12-25" }]), [{ start: "2026-12-25", end: "2026-12-25" }]);
  assertEquals(parseClosedPeriods(null), []);
});

Deno.test("isClosedDay: limites inclusivos", () => {
  assertEquals(isClosedDay("2026-12-22", recesso), false);
  assertEquals(isClosedDay("2026-12-23", recesso), true);
  assertEquals(isClosedDay("2027-01-03", recesso), true);
  assertEquals(isClosedDay("2027-01-04", recesso), false);
});

Deno.test("textos do recesso", () => {
  assertEquals(formatClosedPeriod(recesso[0], "2026-10-07"), "de 23 de dezembro a 3 de janeiro de 2027");
  assertEquals(reopenText(recesso[0]), "segunda, 4 de janeiro");
  const note = closedPeriodsNote(recesso, "2026-10-07") || "";
  assertEquals(note.includes("de 23 de dezembro a 3 de janeiro de 2027"), true);
  assertEquals(note.includes("HOJE"), false);
  // No recesso a equipe segue atendendo: só festas e visitas param
  const during = closedPeriodsNote(recesso, "2026-12-28") || "";
  assertEquals(during.includes("sem festas e visitas até segunda, 4 de janeiro"), true);
  assertEquals(during.includes("não diga que a equipe está em recesso"), true);
  assertEquals(closedPeriodsNote(recesso, "2027-01-04"), null);
  assertEquals(closedPeriodAt("2026-12-28", recesso), recesso[0]);
});
