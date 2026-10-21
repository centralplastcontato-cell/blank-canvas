import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { nearestAlternativeDays, partyDateFreeNote, partyDateTakenMessage } from "./party-date-check.ts";
import type { FreeSlot } from "./party-availability.ts";

const slot = (date: string, start = "13:00", end = "17:00"): FreeSlot => ({
  date,
  dow: new Date(`${date}T12:00:00Z`).getUTCDay(),
  slot: { start, end },
});

Deno.test("nearestAlternativeDays: mesmo dia da semana primeiro, depois o mais perto", () => {
  // Pedido: domingo 13/12/2026. Livres: sáb 12/12, dom 06/12, dom 20/12, dom 03/01, qua 16/12
  const free = [slot("2026-12-12"), slot("2026-12-06"), slot("2026-12-20"), slot("2027-01-03"), slot("2026-12-16"), slot("2026-12-13")];
  assertEquals(nearestAlternativeDays(free, "2026-12-13", 3).map((d) => d.date), ["2026-12-06", "2026-12-20", "2027-01-03"]);
  // Só um domingo livre: completa com os mais próximos
  const few = [slot("2026-12-12"), slot("2026-12-20"), slot("2026-12-16"), slot("2026-12-01")];
  assertEquals(nearestAlternativeDays(few, "2026-12-13", 3).map((d) => d.date), ["2026-12-12", "2026-12-16", "2026-12-20"]);
  // Dois horários no mesmo dia viram um dia só
  const two = nearestAlternativeDays([slot("2026-12-20"), slot("2026-12-20", "19:00", "23:00")], "2026-12-13");
  assertEquals(two.length, 1);
  assertEquals(two[0].slots.length, 2);
  assertEquals(nearestAlternativeDays([], "2026-12-13"), []);
});

Deno.test("partyDateFreeNote / partyDateTakenMessage", () => {
  assertEquals(partyDateFreeNote("2026-12-13"), "Ah, e uma notícia boa: o domingo, 13 de dezembro, ainda está livre na agenda ✅");
  const alt = "🗓️ Domingo, 20 de dezembro\n☀️ Almoço (13h às 17h)";
  const msg = partyDateTakenMessage({ firstName: "Jonathan", ymd: "2026-12-13", alternatives: alt, birthdayName: "Aurora" });
  assertEquals(msg.startsWith("Jonathan, uma coisa importante: o domingo, 13 de dezembro, já foi reservado 😕"), true);
  assertEquals(msg.includes(alt), true);
  assertEquals(msg.includes("Alguma delas funciona pra festa da Aurora? 🎈"), true);
  assertEquals(partyDateTakenMessage({ firstName: "", ymd: "2026-12-13", alternatives: alt, birthdayName: "Murilo" }).includes("pra festa do Murilo"), true);
  const none = partyDateTakenMessage({ firstName: "Ana", ymd: "2026-12-13", alternatives: null });
  assertEquals(none.includes("Vou ver aqui com a equipe"), true);
  assertEquals(partyDateTakenMessage({ firstName: "Ana", ymd: "2027-01-03", alternatives: alt, recess: true }).includes("recesso"), true);
});
