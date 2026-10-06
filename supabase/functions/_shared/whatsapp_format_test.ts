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
