import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { asksToStopMessages, phoneTail } from "./contact-block.ts";

Deno.test("final do número: mesmo contato em qualquer formato", () => {
  assertEquals(phoneTail("5515991670574@s.whatsapp.net"), "91670574");
  assertEquals(phoneTail("(15) 99167-0574"), "91670574");
  assertEquals(phoneTail("123"), "");
  assertEquals(phoneTail(null), "");
});

Deno.test("pedido para parar de receber mensagens", () => {
  for (const t of [
    "Sair da lista de transmissão",
    "me tira dessa lista por favor",
    "Não quero mais receber mensagens",
    "nao quero receber",
    "para de me mandar mensagem",
    "Parem de enviar isso",
    "não me mande mais nada",
    "quero me descadastrar",
    "SAIR",
    "stop",
  ]) assertEquals(asksToStopMessages(t), true, t);
  for (const t of [
    "Sim",
    "já fechei em outro buffet",
    "quero sair às 18h da festa",
    "vou parar pra pensar",
    "quero receber o orçamento",
    "Obrigada",
  ]) assertEquals(asksToStopMessages(t), false, t);
});
