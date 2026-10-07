import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { formatBRLShort, hoursForWhatsApp, moneyWithCents, formatDateLong, formatDayHeader, formatSlotLabel, formatSlotRange, packageEmoji, prettyPackageName } from "./whatsapp-format.ts";

Deno.test("formatDateLong: data por extenso", () => {
  assertEquals(formatDateLong("2026-12-26"), "sábado, 26 de dezembro");
  assertEquals(formatDateLong("2026-11-02"), "segunda, 2 de novembro");
});

Deno.test("formatSlotLabel: almoço/noite com a hora", () => {
  assertEquals(formatSlotLabel("13:00"), "almoço (13h)");
  assertEquals(formatSlotLabel("19:00"), "noite (19h)");
  assertEquals(formatSlotLabel("18:30"), "noite (18h30)");
});

Deno.test("formatBRLShort: sempre com centavos", () => {
  assertEquals(formatBRLShort(6890), "R$\u00a06.890,00");
  assertEquals(formatBRLShort(6890.5), "R$\u00a06.890,50");
});

Deno.test("prettyPackageName / packageEmoji", () => {
  assertEquals(prettyPackageName("CASTELO PREMIUM"), "Castelo Premium");
  assertEquals(prettyPackageName("SUPER CASTELO"), "Super Castelo");
  assertEquals(prettyPackageName("Festa da Alegria"), "Festa da Alegria");
  assertEquals([packageEmoji("CASTELO"), packageEmoji("SUPER CASTELO"), packageEmoji("CASTELO PREMIUM"), packageEmoji("Outro")], ["🏰", "⭐", "👑", "🎉"]);
});

Deno.test("formatDayHeader / formatSlotRange: lista de datas da IA", () => {
  assertEquals(formatDayHeader("2026-12-01"), "🗓️ Terça, 1 de dezembro");
  assertEquals(formatSlotRange("13:00", "17:00"), "☀️ Almoço (13h às 17h)");
  assertEquals(formatSlotRange("19:00", "23:00"), "🌙 Noite (19h às 23h)");
});

import { fixWeekdays } from "./whatsapp-format.ts";

Deno.test("fixWeekdays: corrige o dia da semana errado e mantém o certo", () => {
  const today = "2026-10-06";
  assertEquals(fixWeekdays("Tenho a sexta-feira, 17 de outubro, disponível", today), "Tenho o sábado, 17 de outubro, disponível");
  assertEquals(fixWeekdays("📅 Sábado, 17 de outubro", today), "📅 Sábado, 17 de outubro");
  assertEquals(fixWeekdays("📅 Domingo, 5 de dezembro", today), "📅 Sábado, 5 de dezembro");
  assertEquals(fixWeekdays("quarta-feira, 8 de outubro às 11h", today), "quinta-feira, 8 de outubro às 11h");
  // data que já passou neste ano vale para o ano que vem (5/1/2027 é terça)
  assertEquals(fixWeekdays("segunda, 5 de janeiro", today), "terça, 5 de janeiro");
  assertEquals(fixWeekdays("sábado, 15 de agosto de 2027", today), "domingo, 15 de agosto de 2027");
  assertEquals(fixWeekdays("sem data nenhuma aqui", today), "sem data nenhuma aqui");
  assertEquals(fixWeekdays("Tenho o domingo, 8 de outubro às 11h", today), "Tenho a quinta, 8 de outubro às 11h");
});

import { weekdayMismatches } from "./whatsapp-format.ts";

Deno.test("weekdayMismatches: aponta dia da semana errado no texto do cliente", () => {
  assertEquals(weekdayMismatches("Pode ser a sexta dia 12 de dezembro ou dia 19", "2026-10-06"), [{ said: "sexta dia 12 de dezembro", right: "sábado dia 12 de dezembro" }]);
  assertEquals(weekdayMismatches("sábado, 12 de dezembro", "2026-10-06"), []);
});

Deno.test("moneyWithCents: põe ,00 e cola o R$ no número", () => {
  const N = "\u00a0";
  assertEquals(moneyWithCents("🏰 *Castelo* — R$ 7.400\nDiferença de R$ 1.820."), `🏰 *Castelo* — R$${N}7.400,00\nDiferença de R$${N}1.820,00.`);
  assertEquals(moneyWithCents("R$ 7.400,00 e R$ 150,5 e R$150"), `R$${N}7.400,00 e R$${N}150,5 e R$${N}150,00`);
  assertEquals(moneyWithCents(`R$${N}10.200,00`), `R$${N}10.200,00`);
  assertEquals(moneyWithCents("sem valor"), "sem valor");
});

Deno.test("hoursForWhatsApp: 09:00 vira 9h", () => {
  assertEquals(hoursForWhatsApp("segunda a sexta, das 09:00 às 18:00; sábado, das 09:00 às 12:30 — volta amanhã às 09:00."), "segunda a sexta, das 9h às 18h; sábado, das 9h às 12h30 — volta amanhã às 9h.");
});
