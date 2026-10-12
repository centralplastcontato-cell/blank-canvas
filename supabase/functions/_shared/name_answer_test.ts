import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { askedForName, nameFromAnswer } from "./name-answer.ts";

Deno.test("reconhece quando a IA perguntou o nome", () => {
  assertEquals(askedForName("Oi! Eu sou a *Ana Castelo* 😊\n\nQual é o seu nome? 🎈"), true);
  assertEquals(askedForName("Como você se chama?"), true);
  assertEquals(askedForName("Me conta, como posso te ajudar?"), false);
});

Deno.test("resposta com o nome vira nome", () => {
  assertEquals(nameFromAnswer("alaide"), "Alaide");
  assertEquals(nameFromAnswer("Meu nome é ana paula"), "Ana Paula");
  assertEquals(nameFromAnswer("sou a Bruna!"), "Bruna");
  assertEquals(nameFromAnswer("Maria da Silva"), "Maria da Silva");
  assertEquals(nameFromAnswer("É a Lya 😊"), "Lya");
});

Deno.test("frase ou não-resposta não vira nome", () => {
  assertEquals(nameFromAnswer("não sei"), null);
  assertEquals(nameFromAnswer("oi"), null);
  assertEquals(nameFromAnswer("quero orçamento"), null);
  assertEquals(nameFromAnswer("festa para 50 pessoas"), null);
  assertEquals(nameFromAnswer("é para minha filha"), null);
  assertEquals(nameFromAnswer("ok"), null);
  assertEquals(nameFromAnswer("123"), null);
});
