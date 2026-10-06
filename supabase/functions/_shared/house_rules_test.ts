import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { enforceHouseRules, houseRuleNote, houseRuleViolatingSentences, houseRuleViolations, parseHouseRules, topicsAsked } from "./house-rules.ts";

const CADASTRO = [
  "Endereço: Rua X, 123",
  "Pode levar comida/bolo de fora?: Não, é tudo do buffet",
  "O espaço é coberto (funciona com chuva)?: Ao ar livre",
  "Animal de estimação: Não pode",
].join("\n");
const rules = parseHouseRules(CADASTRO);
const viol = (client: string, reply: string) => houseRuleViolations(reply, rules, topicsAsked(client)).map((r) => r.topic);

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
  assertEquals(topicsAsked("posso levar o bolo?"), ["comida"]);
  assertEquals(topicsAsked("minha tia faz os docinhos, pode?"), ["comida"]);
  assertEquals(topicsAsked("o bolo está incluso?"), []);
  assertEquals(topicsAsked("posso levar o bolo pra casa depois?"), []);
  assertEquals(topicsAsked("quantos convidados posso levar?"), []);
  assertEquals(topicsAsked("posso levar meu cachorro na festa?"), ["animal"]);
  assertEquals(topicsAsked("POSSO LEVAR MEU DOG?"), ["animal"]);
  assertEquals(topicsAsked("posso levar cachorro-quente de fora?"), ["comida"]);
  assertEquals(topicsAsked("o tema vai ser de cachorrinho, pode?"), []);
  assertEquals(topicsAsked("a festa é de cachorrinho e eu queria saber se pode"), []);
  assertEquals(topicsAsked("quanto fica para 60 convidados no sábado?"), []);
});

Deno.test("houseRuleNote traz a resposta exata do cadastro", () => {
  const note = houseRuleNote(rules, ["comida"]) || "";
  assertEquals(note.includes('"Não, é tudo do buffet"'), true);
  assertEquals(houseRuleNote(rules, []), null);
});

Deno.test("houseRuleViolations: pega a liberação contra o cadastro", () => {
  const sorvete = "quero contratar um carrinho de sorvete de fora, pode?";
  assertEquals(viol(sorvete, "Pode sim contratar o carrinho de sorvete de fora, Mariana! 🍦"), ["comida"]);
  assertEquals(viol(sorvete, "Pode sim! 😊 Só combinar com a equipe."), ["comida"]);
  assertEquals(viol(sorvete, "Pode sim, Mariana! 🍦"), ["comida"]);
  assertEquals(viol(sorvete, "Sem problema nenhum trazer o sorvete 🍦"), ["comida"]);
  const bolo = "posso levar o bolo de fora?";
  assertEquals(viol(bolo, "Pode trazer o bolo da sua confeiteira, a gente só não fornece a vela 🎂"), ["comida"]);
  assertEquals(viol(bolo, "Pode trazer o bolo, mas não esqueça de avisar a equipe 🎂"), ["comida"]);
  assertEquals(viol(bolo, "Pode trazer o bolo, não tem taxa 🎂"), ["comida"]);
  assertEquals(viol(bolo, "Pode sim, só não pode salgado 🎂"), ["comida"]);
  assertEquals(viol(bolo, "Não tem problema levar o bolo da confeiteira 🎂"), ["comida"]);
  assertEquals(viol(bolo, "Sim! O bolo da confeiteira é bem-vindo 🎂"), ["comida"]);
  const dog = "posso levar meu cachorro?";
  assertEquals(viol(dog, "Pode levar o cachorro sim, pets são bem-vindos! 🐶"), ["animal"]);
  assertEquals(viol(dog, "Pode levar ele sim, só não pode entrar no salão 🐶"), ["animal"]);
});

Deno.test("houseRuleViolations: resposta que segue o cadastro ou fala de outra coisa não conta", () => {
  const sorvete = "quero contratar um carrinho de sorvete de fora, pode?";
  assertEquals(viol(sorvete, "Ah, Mariana, aqui não pode: é tudo do buffet 😊 Mas o pacote já tem sorvete!"), []);
  assertEquals(viol(sorvete, "Infelizmente comida de fora não é permitida, é tudo do buffet. Pode ficar tranquila que tem muita coisa gostosa! 😋"), []);
  const bolo = "posso levar o bolo de fora?";
  assertEquals(viol(bolo, "O bolo de fora não pode, é tudo do buffet. Mas pode trazer as velinhas! 🎂"), []);
  assertEquals(viol(bolo, "Infelizmente não, Ana, aqui é tudo do buffet 😊 Qualquer dúvida, fique à vontade para perguntar!"), []);
  assertEquals(viol("posso levar o bolo da minha tia? quantos convidados posso levar?", "O bolo é feito pelo buffet, Ana 🎂 Pode levar até 80 convidados no pacote Diamante!"), []);
  assertEquals(viol("posso levar o bolo de fora? qual o valor p 50?", "O bolo já vem incluso no pacote, feito pela nossa equipe 🎂 Para 50 convidados fica R$ 4.990, sem problema parcelar!"), []);
  assertEquals(viol("posso levar o bolo da minha tia? e da pra visitar sabado?", "O bolo e os doces são feitos aqui pelo buffet, Ana 🎂 E pode sim visitar no sábado às 10h!"), []);
  assertEquals(viol("posso levar o bolo da minha tia? e da pra visitar sabado?", "Aqui o bolo é por nossa conta, Ana! 🎂\nPode sim visitar no sábado às 10h 😊"), []);
  assertEquals(viol("posso levar meu cachorro? e às 19h dá?", "Pode sim às 19h! 😊 Pets ficam em casa nesse dia, tá? 🐶"), []);
  assertEquals(viol("posso levar meu cachorro?", "Infelizmente não pode, Ana 😊 Mas você e sua família são super bem-vindos na visita!"), []);
  // Cliente não perguntou de comida de fora: nada a conferir
  assertEquals(viol("quantos convidados posso levar?", "Pode levar até 80 convidados, e o bolo e os docinhos já estão inclusos! 🎂"), []);
  assertEquals(viol("oi, qual valor p 50?", "Fica R$ 4.990! Pode sim parcelar em 10x, bolo e doces inclusos 😋"), []);
  assertEquals(viol("Dá pra escolher o sabor do bolo?", "Pode sim escolher o sabor do bolo! 🎂"), []);
  assertEquals(viol("o pacote inclui bolo?", "Inclui sim! E no final os convidados podem levar os docinhos para casa 🍬"), []);
  // Cadastro que libera: nada a conferir
  const liberal = parseHouseRules("Pode levar comida/bolo de fora?: À vontade");
  assertEquals(houseRuleViolations("Pode sim levar o bolo!", liberal, ["comida"]), []);
});

Deno.test("houseRuleViolatingSentences devolve a frase", () => {
  assertEquals(
    houseRuleViolatingSentences("Oi, Mariana! 😊 Pode sim contratar o carrinho de sorvete de fora. Qual o mês?", rules, ["comida"]),
    ["Pode sim contratar o carrinho de sorvete de fora."],
  );
});

Deno.test("enforceHouseRules tira a liberação e põe a resposta do cadastro no começo", () => {
  const reply = "Oi, Mariana! 😊 Pode sim contratar o carrinho de sorvete de fora. Qual o mês da festa?";
  const out = enforceHouseRules(reply, houseRuleViolations(reply, rules, ["comida"]));
  assertEquals(out.text, "Sobre levar ou contratar comida, bolo, doces ou sorvete de fora: não, é tudo do buffet.\n\nOi, Mariana! 😊 Qual o mês da festa?");
  assertEquals(out.removed, ["Pode sim contratar o carrinho de sorvete de fora."]);
  const yes = "Sim! Pode levar o bolo da sua confeiteira 🎂";
  assertEquals(enforceHouseRules(yes, houseRuleViolations(yes, rules, ["comida"])).text, "Sobre levar ou contratar comida, bolo, doces ou sorvete de fora: não, é tudo do buffet.");
  assertEquals(enforceHouseRules("Tudo certo!", []).text, "Tudo certo!");
});
