import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { visitSlotsByDay } from "./business-hours.ts";

Deno.test("visitSlotsByDay: agrupa por dia, em ordem, e espalha os horários", () => {
  const times = ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const available = [
    ...times.map((time) => ({ date: "2026-10-08", time })),
    { date: "2026-10-07", time: "14:30" },
  ];
  const days = visitSlotsByDay(available, 7, 4);
  assertEquals(days.map((d) => d.date), ["2026-10-07", "2026-10-08"]);
  assertEquals(days[1].times, ["10:00", "11:30", "15:00", "16:30"]);
});
