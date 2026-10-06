import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { enforceHouseRules, houseRuleNote, houseRuleViolatingSentences, houseRuleViolations, parseHouseRules, topicsAsked } from "./house-rules.ts";

const CADASTRO = [
  "Endereço: Rua X, 123",
  "Pode levar comida/bolo de fora?: Não, é tudo do buffet",
  "O espaço é coberto (funciona com chuva)?: Ao ar livre",
  "Animal de estimação: Não pode",
].join("\n");
const rules = parseHouseRules(CADASTRO);

Deno.test("parseHouseRules lê as respostas do cadastro", () => {
  assertEquals(rules, [
    { topic: "comida", answer: "Não, é tudo do buffet", forbidden: true },
    { topic: "animal", answer: "Não pode", forbidden: true },
  ]);
  assertEquals(parseHouseRules("Pode levar comida/bolo de fora?: Só bolo e doces\nAnimal de estimação: Pode levar"), [
    { topic: "comida", answer: "Só bolo e doces", forbidden: false },
    { topic: "animal", answer: "Pode levar", forbidden: false },
  ]);
  assertEquals(parseHouseRules(null), []);
});

Deno.test("topicsAsked: comida de fora e animal", () => {
  assertEquals(topicsAsked("quero contratar um carrinho de sorvete de fora, pode?"), ["comida"]);
  assertEquals(topicsAsked("o bolo ta incluso? posso levar um bolo da minha confeiteira"), ["comida"]);
  assertEquals(topicsAsked("o bolo está incluso?"), []);
  assertEquals(topicsAsked("posso levar meu cachorro na festa?"), ["animal"]);
  assertEquals(topicsAsked("posso levar cachorro-quente de fora?"), ["comida"]);
  assertEquals(topicsAsked("o tema vai ser de cachorrinho, pode?"), []);
  assertEquals(topicsAsked("quanto fica para 60 convidados no sábado?"), []);
});

Deno.test("houseRuleNote traz a resposta exata do cadastro", () => {
  const note = houseRuleNote(rules, ["comida"]) || "";
  assertEquals(note.includes('"Não, é tudo do buffet"'), true);
  assertEquals(houseRuleNote(rules, []), null);
});

Deno.test("houseRuleViolations pega o 'pode sim' contra o cadastro", () => {
  const asked = topicsAsked("quero contratar um carrinho de sorvete de fora, pode?");
  assertEquals(houseRuleViolations("Pode sim contratar o carrinho de sorvete de fora, Mariana! 🍦", rules, asked).map((r) => r.topic), ["comida"]);
  assertEquals(houseRuleViolations("Pode sim! 😊 Só combinar com a equipe.", rules, asked).map((r) => r.topic), ["comida"]);
  assertEquals(houseRuleViolations("Sem problema nenhum trazer o sorvete 🍦", rules, asked).length, 1);
  // Seguiu o cadastro
  assertEquals(houseRuleViolations("Ah, Mariana, aqui não pode: é tudo do buffet 😊 Mas o pacote já tem sorvete!", rules, asked), []);
  assertEquals(houseRuleViolations("Infelizmente comida de fora não é permitida, é tudo do buffet. Pode ficar tranquila que tem muita coisa gostosa! 😋", rules, asked), []);
  // Restrição dita + outra coisa liberada
  assertEquals(houseRuleViolations("O bolo de fora não pode, é tudo do buffet. Mas pode trazer as velinhas! 🎂", rules, ["comida"]), []);
  // "Não tem problema" libera
  assertEquals(houseRuleViolations("Não tem problema levar o bolo da confeiteira 🎂", rules, ["comida"]).length, 1);
  // Animal
  assertEquals(houseRuleViolations("Pode levar o cachorro sim, pets são bem-vindos! 🐶", rules, ["animal"]).map((r) => r.topic), ["animal"]);
  assertEquals(houseRuleViolations("Animal de estimação não pode, Gustavo 🐶", rules, ["animal"]), []);
  // Cadastro que libera: nada a conferir
  const liberal = parseHouseRules("Pode levar comida/bolo de fora?: À vontade");
  assertEquals(houseRuleViolations("Pode sim levar o bolo!", liberal, ["comida"]), []);
  // Sem pergunta e sem falar do assunto: "pode sim" de outra coisa não conta
  assertEquals(houseRuleViolations("Pode sim agendar a visita no sábado! 😊", rules, []), []);
});

Deno.test("houseRuleViolatingSentences devolve a frase", () => {
  assertEquals(
    houseRuleViolatingSentences("Oi, Mariana! 😊 Pode sim contratar o carrinho de sorvete de fora. Qual o mês?", rules, ["comida"]),
    ["Pode sim contratar o carrinho de sorvete de fora."],
  );
});

Deno.test("enforceHouseRules troca a frase pela resposta do cadastro", () => {
  const asked = ["comida" as const];
  const reply = "Oi, Mariana! 😊 Pode sim contratar o carrinho de sorvete de fora. Qual o mês da festa?";
  const out = enforceHouseRules(reply, houseRuleViolations(reply, rules, asked), asked);
  assertEquals(out.text, "Oi, Mariana! 😊 Sobre levar ou contratar comida, bolo, doces ou sorvete de fora: não, é tudo do buffet. Qual o mês da festa?");
  assertEquals(out.removed, ["Pode sim contratar o carrinho de sorvete de fora."]);
  assertEquals(enforceHouseRules("Tudo certo!", [], asked).text, "Tudo certo!");
});
