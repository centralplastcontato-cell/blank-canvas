import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { freePartySlots, monthFromText, monthRange, parsePartySlots, pickPartyDates, pickPartyOptions } from "./party-availability.ts";

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
      { event_date: "2026-11-13", start_time: "19:00", end_time: "23:00", status: "confirmado", unit: "Outra" }, // outra unidade física
    ],
    preReservations: [{ event_date: "2026-11-15", unit: "Castelo" }], // dom
    unit: "Castelo",
    physicalUnits: ["Castelo", "Outra"],
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

Deno.test("freePartySlots: festa cadastrada em unidade de venda (Vendas 2) ocupa o espaço", () => {
  // Teste de 05/10 23:05: Ravi (12/12 19h) e Vinicius (19/12 19h) estavam como "Vendas 2"
  const events = [
    { event_date: "2026-12-05", start_time: "13:00", end_time: "17:00", status: "confirmado", unit: "Castelo da Diversão" },
    { event_date: "2026-12-12", start_time: "13:00", end_time: "17:00", status: "confirmado", unit: "Castelo da Diversão" },
    { event_date: "2026-12-12", start_time: "19:00", end_time: "23:00", status: "confirmado", unit: "Vendas 2" },
    { event_date: "2026-12-19", start_time: "13:00", end_time: "17:00", status: "confirmado", unit: "Castelo da Diversão" },
    { event_date: "2026-12-19", start_time: "19:00", end_time: "23:00", status: "confirmado", unit: "Vendas 2" },
  ];
  const free = freePartySlots({ from: "2026-12-05", to: "2026-12-19", slots: SLOTS, events, preReservations: [], unit: "Castelo da Diversão", physicalUnits: ["Castelo da Diversão"] });
  const sats = free.filter((f) => f.dow === 6).map((f) => `${f.date} ${f.slot.start}`);
  assertEquals(sats, ["2026-12-05 19:00"]);
});

Deno.test("pickPartyDates: agrupa horários por data e prefere o dia pedido", () => {
  const free = freePartySlots({
    from: "2026-12-01", to: "2026-12-06", slots: SLOTS,
    events: [{ event_date: "2026-12-05", start_time: "13:00", end_time: "17:00", status: "confirmado", unit: null }],
    preReservations: [],
  });
  const days = pickPartyDates(free, [0, 6], 2);
  assertEquals(days.map((d) => `${d.date}:${d.slots.map((s) => s.start).join("+")}`), ["2026-12-05:19:00", "2026-12-06:13:00+19:00"]);
});

Deno.test("pickPartyDates: com preferência não completa com outros dias (simulador: sábado + domingo + segunda)", () => {
  const free = freePartySlots({
    from: "2026-11-01", to: "2026-11-30", slots: SLOTS,
    events: ["2026-11-07", "2026-11-14", "2026-11-28"].flatMap((d) => [
      { event_date: d, start_time: "13:00", end_time: "17:00", status: "confirmado", unit: null },
      { event_date: d, start_time: "19:00", end_time: "23:00", status: "confirmado", unit: null },
    ]),
    preReservations: [],
  });
  assertEquals(pickPartyDates(free, [6], 3).map((d) => d.date), ["2026-11-21"]);
  // sem nenhum dia preferido livre, mostra os primeiros disponíveis em ordem
  assertEquals(pickPartyDates(free.filter((f) => f.dow !== 6), [6], 2).map((d) => d.date), ["2026-11-01", "2026-11-02"]);
});

Deno.test("monthRange: aceita o ano dito pelo cliente", () => {
  assertEquals(monthRange(11, "2026-10-06", 2027), { from: "2027-11-01", to: "2027-11-30" });
  assertEquals(monthRange(4, "2026-10-06"), { from: "2027-04-01", to: "2027-04-30" });
  assertEquals(monthRange(11, "2026-10-06"), { from: "2026-11-01", to: "2026-11-30" });
});
