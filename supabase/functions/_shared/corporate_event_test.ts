import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { birthdayFlavored, corporateCaptions, mentionsCorporate } from "./corporate-event.ts";

Deno.test("mentionsCorporate: sinais de empresa", () => {
  assertEquals(mentionsCorporate("Quero orçamento de confraternização"), true);
  assertEquals(mentionsCorporate("é pra festa de fim de ano da empresa"), true);
  assertEquals(mentionsCorporate("somos uns 80 colaboradores"), true);
  assertEquals(mentionsCorporate("sou do RH da Metalúrgica Silva"), true);
  assertEquals(mentionsCorporate("Olá! Quero um orçamento de confraternização para minha empresa."), true);
  // Aniversário: não é empresa
  assertEquals(mentionsCorporate("vocês têm funcionários para cuidar das crianças?"), false);
  assertEquals(mentionsCorporate("festa de 5 anos do Pedro, 60 convidados"), false);
  assertEquals(mentionsCorporate("ok"), false);
});

Deno.test("legendas de empresa", () => {
  const c = corporateCaptions({ firstName: "Carla", companyName: "Castelo da Diversão", guests: 90 });
  assertEquals(c.pdfIntro, "E aqui estão os nossos pacotes pra 90 pessoas 📋✨");
  assertEquals(birthdayFlavored(c.photosIntro), false);
  assertEquals(birthdayFlavored("Já imaginou a carinha do aniversariante?"), true);
  assertEquals(birthdayFlavored("Olha a criançada brincando"), true);
});
