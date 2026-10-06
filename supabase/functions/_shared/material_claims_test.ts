import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  claimedMaterials,
  falseMaterialClaims,
  hasMaterialClaim,
  hasSubstance,
  type MaterialKind,
  refersToMaterial,
  sentenceParts,
  stripFalseMaterialClaims,
} from "./material-claims.ts";

const none = new Set<MaterialKind>();

Deno.test("claimedMaterials: afirmações de envio", () => {
  assertEquals(claimedMaterials("Já te mandei as fotos, o vídeo e o PDF 😍"), ["fotos", "video", "pacotes"]);
  assertEquals(claimedMaterials("Te mandei as fotos do salão e o vídeo"), ["fotos", "video"]);
  assertEquals(claimedMaterials("Acabei de te enviar o vídeo do espaço!"), ["video"]);
  assertEquals(claimedMaterials("Te enviei agora há pouco o vídeo"), ["video"]);
  assertEquals(claimedMaterials("Seguem as fotos do salão 📸"), ["fotos"]);
  assertEquals(claimedMaterials("As fotos foram enviadas aqui em cima"), ["fotos"]);
  assertEquals(claimedMaterials("Fotos enviadas! 📸"), ["fotos"]);
  assertEquals(claimedMaterials("Vídeo enviado ✅"), ["video"]);
  assertEquals(claimedMaterials("Enviada a foto!"), ["fotos"]);
  assertEquals(claimedMaterials("Te passei as fotos"), ["fotos"]);
  assertEquals(claimedMaterials("Deixei aqui o vídeo"), ["video"]);
  assertEquals(claimedMaterials("Aí estão as fotos"), ["fotos"]);
  assertEquals(claimedMaterials("As fotos estão aí em cima"), ["fotos"]);
  assertEquals(claimedMaterials("Olha as fotos que eu te mandei"), ["fotos"]);
  assertEquals(claimedMaterials("Que bom que gostou das fotos que te enviamos!"), ["fotos"]);
  assertEquals(claimedMaterials("Te mandei o arquivo dos pacotes"), ["pacotes"]);
  assertEquals(claimedMaterials("Te mandei os materiais aqui em cima"), ["any"]);
  assertEquals(claimedMaterials("Já te mandei o vídeo e as fotos, só o PDF que não foi enviado ainda"), ["fotos", "video"]);
  assertEquals(claimedMaterials("Te mandei o vídeo, não foi?"), ["video"]);
  assertEquals(claimedMaterials("Não tem problema, mandei as fotos aqui em cima"), ["fotos"]);
});

Deno.test("claimedMaterials: o que não é afirmação de envio", () => {
  for (const s of [
    "Vou te mandar as fotos agora",
    "Te mando o vídeo assim que você me disser o mês",
    "Quer que eu te mande as fotos?",
    "Ainda não te mandei o PDF",
    "Te mandei os valores dos pacotes acima",
    "Me segue no insta @buffet, tem muitas fotos lá! Qual o mês?",
    "Segue a gente no Instagram, lá tem várias fotos das festas 😍",
    "Temos sim! Segue o nosso Instagram com várias fotos das festas: @castelo 📸",
    "Sim, a festa segue até 18h e o fotógrafo tira muitas fotos!",
    "O vídeo segue o mesmo padrão das fotos",
    "Os convidados seguem para o salão e tiram fotos",
    "Mandamos as fotos assim que você me disser o mês da festa 😊",
    "Assim que você me contar o mês, enviamos o vídeo e as fotos!",
    "Se quiser, enviamos o PDF por e-mail",
    "Encaminhei seu pedido para a equipe, que vai te enviar as fotos em seguida 😊",
    "Enviei seu pedido para a equipe, eles vão te mandar o vídeo",
    "Te enviei a localização, e o vídeo vai em seguida",
    "Mandei uma mensagem pra equipe pedir as fotos pra você",
    "A foto que você mandou ficou linda!",
  ]) assertEquals(claimedMaterials(s), [], s);
});

Deno.test("hasMaterialClaim", () => {
  assertEquals(hasMaterialClaim("Oi, Ana! 😊\nJá te mandei as fotos. Qual o mês da festa?"), true);
  assertEquals(hasMaterialClaim("Quer que eu te mande as fotos?"), false);
});

Deno.test("falseMaterialClaims: só o que não saiu", () => {
  const text = "Já te enviei as fotos 📸 Também te mandei o vídeo 🎬 Qual o mês da festa?";
  assertEquals(falseMaterialClaims(text, new Set<MaterialKind>(["fotos"])), ["Também te mandei o vídeo 🎬"]);
  assertEquals(falseMaterialClaims(text, new Set<MaterialKind>(["fotos", "video"])), []);
  assertEquals(falseMaterialClaims("Te mandei os materiais 😊", new Set<MaterialKind>(["pacotes"])), []);
  assertEquals(falseMaterialClaims("Te mandei os materiais 😊", none), ["Te mandei os materiais 😊"]);
});

Deno.test("stripFalseMaterialClaims tira só a frase falsa", () => {
  const text = "Que legal, Vanessa! 🎉 Já te mandei as fotos, o vídeo e o PDF dos pacotes. Me conta: qual o mês da festa? 😊";
  const out = stripFalseMaterialClaims(text, none);
  assertEquals(out.text, "Que legal, Vanessa! 🎉 Me conta: qual o mês da festa? 😊");
  assertEquals(out.removed.length, 1);
  const same = stripFalseMaterialClaims(text, new Set<MaterialKind>(["fotos", "video", "pacotes"]));
  assertEquals(same.text, text);
  assertEquals(same.removed, []);
  assertEquals(stripFalseMaterialClaims("Já te mandei as fotos 📸 me conta: qual o mês da festa?", none).text, "me conta: qual o mês da festa?");
});

Deno.test("sentenceParts: emoji separa frase, ponto de milhar não, e junta de volta igual", () => {
  const line = "Já te enviei as fotos 📸 Também te mandei o vídeo 🎬 O Premium fica R$ 5.490,00. Qual o mês?";
  const parts = sentenceParts(line);
  assertEquals(parts.join(""), line);
  assertEquals(parts.map((p) => p.trim()), ["Já te enviei as fotos 📸", "Também te mandei o vídeo 🎬", "O Premium fica R$ 5.490,00.", "Qual o mês?"]);
  for (const l of ["... Qual o mês?", "!!! Que legal", "Te mandei as fotos 👍🏽 Qual o mês?", "Oba 🇧🇷 Vamos!"]) {
    assertEquals(sentenceParts(l).join(""), l, l);
  }
  assertEquals(sentenceParts("Te mandei as fotos 👍🏽 Qual o mês?").length, 2);
  const withMoney = stripFalseMaterialClaims("Te mandei o PDF, o Premium fica R$ 5.490,00 para 60. Qual o mês? 😊", none);
  assertEquals(withMoney.text, "Qual o mês? 😊");
});

Deno.test("hasSubstance e refersToMaterial", () => {
  assertEquals(hasSubstance("😊 🎉!"), false);
  assertEquals(hasSubstance("Que dia?"), true);
  assertEquals(refersToMaterial("O que achou delas?"), true);
  assertEquals(refersToMaterial("Qual o mês da festa?"), false);
});
