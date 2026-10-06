import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { formatBRLShort, formatDateLong, formatDayHeader, formatSlotLabel, formatSlotRange, packageEmoji, prettyPackageName } from "./whatsapp-format.ts";

Deno.test("formatDateLong: data por extenso", () => {
  assertEquals(formatDateLong("2026-12-26"), "sábado, 26 de dezembro");
  assertEquals(formatDateLong("2026-11-02"), "segunda, 2 de novembro");
});

Deno.test("formatSlotLabel: almoço/noite com a hora", () => {
  assertEquals(formatSlotLabel("13:00"), "almoço (13h)");
  assertEquals(formatSlotLabel("19:00"), "noite (19h)");
  assertEquals(formatSlotLabel("18:30"), "noite (18h30)");
});

Deno.test("formatBRLShort: sem centavos quando redondo", () => {
  assertEquals(formatBRLShort(6890), "R$ 6.890");
  assertEquals(formatBRLShort(6890.5), "R$ 6.890,50");
});

Deno.test("prettyPackageName / packageEmoji", () => {
  assertEquals(prettyPackageName("CASTELO PREMIUM"), "Castelo Premium");
  assertEquals(prettyPackageName("SUPER CASTELO"), "Super Castelo");
  assertEquals(prettyPackageName("Festa da Alegria"), "Festa da Alegria");
  assertEquals([packageEmoji("CASTELO"), packageEmoji("SUPER CASTELO"), packageEmoji("CASTELO PREMIUM"), packageEmoji("Outro")], ["🏰", "⭐", "👑", "🎉"]);
});

Deno.test("formatDayHeader / formatSlotRange: lista de datas da IA", () => {
  assertEquals(formatDayHeader("2026-12-01"), "📅 Terça, 1 de dezembro");
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
