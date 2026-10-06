import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { freePartySlots, monthFromText, monthRange, parsePartySlots, pickPartyOptions } from "./party-availability.ts";

const SLOTS = parsePartySlots(null);

Deno.test("parsePartySlots: padrão 13–17 e 19–23; aceita '19h às 23h'", () => {
  assertEquals(SLOTS, [{ start: "13:00", end: "17:00" }, { start: "19:00", end: "23:00" }]);
  assertEquals(parsePartySlots("12h às 16h, 18:30-22:30"), [{ start: "12:00", end: "16:00" }, { start: "18:30", end: "22:30" }]);
});

Deno.test("freePartySlots: festa ocupa o horário; cancelada não; pré-reserva e festa sem horário fecham o dia", () => {
  const free = freePartySlots({
    from: "2026-11-13",
    to: "2026-11-16",
    slots: SLOTS,
    events: [
      { event_date: "2026-11-14", start_time: "13:30:00", end_time: "17:30:00", status: "confirmado", unit: "Castelo" }, // sáb tarde
      { event_date: "2026-11-14", start_time: "19:00", end_time: null, status: "cancelado", unit: "Castelo" }, // cancelada
      { event_date: "2026-11-16", start_time: null, end_time: null, status: "pendente", unit: null }, // seg sem horário
      { event_date: "2026-11-13", start_time: "19:00", end_time: "23:00", status: "confirmado", unit: "Outra" }, // outra unidade
    ],
    preReservations: [{ event_date: "2026-11-15", unit: "Castelo" }], // dom
    unit: "Castelo",
  });
  assertEquals(free.map((f) => `${f.date} ${f.slot.start}`), ["2026-11-13 13:00", "2026-11-13 19:00", "2026-11-14 19:00"]);
});

Deno.test("pickPartyOptions: prefere o dia da semana pedido, no máximo 3", () => {
  const free = freePartySlots({ from: "2026-11-01", to: "2026-11-30", slots: SLOTS, events: [], preReservations: [] });
  const opts = pickPartyOptions(free, [6], 3);
  assertEquals(opts.map((o) => `${o.date} ${o.slot.start}`), ["2026-11-07 13:00", "2026-11-07 19:00", "2026-11-14 13:00"]);
});

Deno.test("monthRange / monthFromText: próxima ocorrência do mês", () => {
  assertEquals(monthRange(11, "2026-10-06"), { from: "2026-11-01", to: "2026-11-30" });
  assertEquals(monthRange(2, "2026-10-06"), { from: "2027-02-01", to: "2027-02-28" });
  assertEquals(monthFromText("Novembro"), 11);
  assertEquals(monthFromText("março"), 3);
  assertEquals(monthFromText("12"), 12);
});
