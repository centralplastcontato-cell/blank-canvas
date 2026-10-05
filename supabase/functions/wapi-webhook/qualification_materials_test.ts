import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { fillPdfIntro, firstNameOrEmpty } from "./qualification-materials.ts";

const DEFAULT = '📋 Oi {nome}! Segue o pacote completo para {convidados} no {empresa}. Qualquer dúvida é só chamar! 💜';

Deno.test("firstNameOrEmpty: só nome de verdade", () => {
  assertEquals(firstNameOrEmpty("victor hugo"), "Victor");
  assertEquals(firstNameOrEmpty("cliente"), "");
  assertEquals(firstNameOrEmpty(""), "");
  assertEquals(firstNameOrEmpty("5515981121710"), "");
});

Deno.test("fillPdfIntro: com nome real", () => {
  assertEquals(
    fillPdfIntro(DEFAULT, { nome: "Victor", convidados: "50 pessoas", empresa: "Castelo da Diversão" }),
    "📋 Oi Victor! Segue o pacote completo para 50 pessoas no Castelo da Diversão. Qualquer dúvida é só chamar! 💜",
  );
});

Deno.test("fillPdfIntro: sem nome, tira o 'Oi {nome}!' (nada de 'Oi cliente!')", () => {
  assertEquals(
    fillPdfIntro(DEFAULT, { nome: "", convidados: "50 pessoas", empresa: "Castelo da Diversão" }),
    "📋 Segue o pacote completo para 50 pessoas no Castelo da Diversão. Qualquer dúvida é só chamar! 💜",
  );
  assertEquals(
    fillPdfIntro("Prontinho, {nome}! Pacote para {convidados}.", { nome: "", convidados: "80 pessoas", empresa: "X" }),
    "Prontinho! Pacote para 80 pessoas.",
  );
});
