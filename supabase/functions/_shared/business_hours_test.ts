import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  businessMinutesBetween,
  describeTeamHours,
  formatSlot,
  isOpenAt,
  isSlotInHours,
  listAvailableSlots,
  nearestSlots,
  nextOpeningText,
  parseVisitHours,
  pickTwoOffers,
  serializeTeamHours,
} from "./business-hours.ts";

const VISITS = parseVisitHours("Segunda a sábado, das 10:00 às 17:00, de meia em meia hora; sábado, das 09:00 às 12:00, de meia em meia hora");
const TEAM = parseVisitHours("Segunda a sexta, das 09:00 às 18:00; sábado, das 09:00 às 13:00");
// 2026-10-05 é segunda. 18:52 em Brasília = 21:52 UTC.
const MON_1852 = Date.parse("2026-10-05T21:52:00Z");

Deno.test("isSlotInHours: dentro da janela e no passo certo", () => {
  assertEquals(isSlotInHours(VISITS, "2026-10-07", "10:30"), true);
  assertEquals(isSlotInHours(VISITS, "2026-10-07", "16:30"), true);
  assertEquals(isSlotInHours(VISITS, "2026-10-07", "17:00"), false); // termina depois do fechamento
  assertEquals(isSlotInHours(VISITS, "2026-10-07", "10:15"), false); // fora do passo
  assertEquals(isSlotInHours(VISITS, "2026-10-07", "20:00"), false);
  assertEquals(isSlotInHours(VISITS, "2026-10-10", "09:00"), true); // sábado tem horário próprio
  assertEquals(isSlotInHours(VISITS, "2026-10-10", "14:00"), false);
  assertEquals(isSlotInHours(VISITS, "2026-10-11", "10:00"), false); // domingo fechado
});

Deno.test("listAvailableSlots: pula passado, antecedência mínima e ocupados", () => {
  const booked = new Set(["2026-10-06 10:00"]);
  const slots = listAvailableSlots(VISITS, MON_1852, booked, { max: 3 });
  assertEquals(slots, [
    { date: "2026-10-06", time: "10:30" },
    { date: "2026-10-06", time: "11:00" },
    { date: "2026-10-06", time: "11:30" },
  ]);
});

Deno.test("pickTwoOffers / formatSlot: dois horários concretos em dias diferentes", () => {
  const slots = listAvailableSlots(VISITS, MON_1852, new Set());
  const offers = pickTwoOffers(slots).map(formatSlot);
  assertEquals(offers, ["ter 06/10 às 10:00", "qua 07/10 às 10:00"]);
});

Deno.test("nearestSlots: pedido fora do horário → os dois livres mais próximos", () => {
  const slots = listAvailableSlots(VISITS, MON_1852, new Set(), { max: 500 });
  // Pediu quarta às 20h: oferece quarta 16:30 (antes) e quinta 10:00 (depois)
  assertEquals(nearestSlots(slots, "2026-10-07", "20:00").map(formatSlot), ["qua 07/10 às 16:30", "qui 08/10 às 10:00"]);
  // Pediu domingo de manhã: último de sábado e primeiro de segunda
  assertEquals(nearestSlots(slots, "2026-10-11", "10:00").map(formatSlot), ["sáb 10/10 às 11:30", "seg 12/10 às 10:00"]);
  // Pedido antes de tudo (hoje cedo): só existe "depois" → os dois primeiros
  assertEquals(nearestSlots(slots, "2026-10-05", "08:00").map(formatSlot), ["ter 06/10 às 10:00", "ter 06/10 às 10:30"]);
});

Deno.test("isOpenAt / nextOpeningText: horário da equipe", () => {
  assertEquals(isOpenAt(TEAM, MON_1852), false); // 18:52, fecha às 18h
  assertEquals(nextOpeningText(TEAM, MON_1852), "amanhã às 09:00");
  assertEquals(isOpenAt(TEAM, Date.parse("2026-10-05T14:00:00Z")), true); // 11:00
  // Sábado 14h → abre segunda
  assertEquals(nextOpeningText(TEAM, Date.parse("2026-10-10T17:00:00Z")), "segunda às 09:00");
});

Deno.test("businessMinutesBetween: só conta minutos de expediente", () => {
  // Segunda 17:55 → terça 09:05 = 5 min (seg) + 5 min (ter)
  assertEquals(businessMinutesBetween(TEAM, Date.parse("2026-10-05T20:55:00Z"), Date.parse("2026-10-06T12:05:00Z")), 10);
  assertEquals(businessMinutesBetween(TEAM, Date.parse("2026-10-05T14:00:00Z"), Date.parse("2026-10-05T14:12:00Z")), 12);
});

Deno.test("serializeTeamHours / describeTeamHours: frase para o cliente", () => {
  const text = serializeTeamHours([0, 1, 2, 3, 4, 5], "09:00", "18:00", true, "09:00", "13:00");
  assertEquals(text, "Segunda a sexta, das 09:00 às 18:00; sábado, das 09:00 às 13:00");
  assertEquals(describeTeamHours(parseVisitHours(text)), "segunda a sexta, das 09:00 às 18:00; sábado, das 09:00 às 13:00");
});
