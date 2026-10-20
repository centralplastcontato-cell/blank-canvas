import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { partySoon, partySoonLabel, yearFromMonthText } from "./party-soon.ts";

const TODAY = "2026-10-20";

Deno.test("partySoon: data exata do site (mês + dia)", () => {
  assertEquals(partySoon("Novembro/26", 14, TODAY), "2026-11-14");
  assertEquals(partySoon("Dezembro", 19, TODAY), "2026-12-19"); // 60 dias certinhos
  assertEquals(partySoon("Dezembro", 20, TODAY), null);
  assertEquals(partySoon("Outubro", 25, TODAY), "2026-10-25");
  // Dia que já passou no mês atual: é o do ano que vem (longe)
  assertEquals(partySoon("Outubro", 10, TODAY), null);
  assertEquals(partySoon("Fevereiro/27", 31, "2027-01-10"), "2027-02-28");
});

Deno.test("partySoon: só o mês (robô e IA) — mês atual ou o seguinte", () => {
  assertEquals(partySoon("Outubro", null, TODAY), "2026-10");
  assertEquals(partySoon("Novembro", null, TODAY), "2026-11");
  assertEquals(partySoon("Dezembro", null, TODAY), null);
  assertEquals(partySoon("Janeiro", null, "2026-12-05"), "2027-01");
  assertEquals(partySoon("Novembro/2027", null, TODAY), null);
  assertEquals(partySoon("Setembro", null, TODAY), null); // setembro de 2027
  assertEquals(partySoon(null, 10, TODAY), null);
  assertEquals(partySoon("Ainda não sei", null, TODAY), null);
});

Deno.test("yearFromMonthText / partySoonLabel", () => {
  assertEquals(yearFromMonthText("Março/27"), 2027);
  assertEquals(yearFromMonthText("março de 2028"), 2028);
  assertEquals(yearFromMonthText("Março"), null);
  assertEquals(partySoonLabel("2026-11-14"), "14/11");
  assertEquals(partySoonLabel("2026-11"), "novembro");
});
