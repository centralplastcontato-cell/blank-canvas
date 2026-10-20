import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { looksLikeBotMessage } from "./bot-loop-guard.ts";

Deno.test("cliente respondendo com emoji de número não parece robô (Mega Magic 17/10)", () => {
  assertEquals(looksLikeBotMessage("1️⃣2️⃣"), false);
  assertEquals(looksLikeBotMessage("2️⃣"), false);
  assertEquals(looksLikeBotMessage("3️⃣ Sábado"), false);
});

Deno.test("menu de robô com emojis em várias linhas continua sendo sinal", () => {
  assertEquals(looksLikeBotMessage("Escolha:\n1️⃣ Vendas\n2️⃣ Suporte\n3️⃣ Financeiro"), true);
  assertEquals(looksLikeBotMessage("Por favor, digite apenas o número"), true);
});
