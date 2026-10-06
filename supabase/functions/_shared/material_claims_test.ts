import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { claimedMaterials, falseMaterialClaims, hasMaterialClaim, hasSubstance, type MaterialKind, stripFalseMaterialClaims } from "./material-claims.ts";

const none = new Set<MaterialKind>();

Deno.test("claimedMaterials: envio no passado conta, futuro e negação não", () => {
  assertEquals(claimedMaterials("Já te mandei as fotos, o vídeo e o PDF 😍"), ["fotos", "video", "pacotes"]);
  assertEquals(claimedMaterials("Acabei de te enviar o vídeo do espaço!"), ["video"]);
  assertEquals(claimedMaterials("Seguem as fotos do salão 📸"), ["fotos"]);
  assertEquals(claimedMaterials("As fotos foram enviadas aqui em cima"), ["fotos"]);
  assertEquals(claimedMaterials("Te mandei os materiais aqui em cima"), ["any"]);
  assertEquals(claimedMaterials("Vou te mandar as fotos agora"), []);
  assertEquals(claimedMaterials("Te mando o vídeo assim que você me disser o mês"), []);
  assertEquals(claimedMaterials("Ainda não te mandei o PDF"), []);
  assertEquals(claimedMaterials("Te mandei os valores dos pacotes acima"), []);
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
});

Deno.test("sentenceParts: emoji separa frase, ponto de milhar não, e junta de volta igual", async () => {
  const { sentenceParts } = await import("./material-claims.ts");
  const line = "Já te enviei as fotos 📸 Também te mandei o vídeo 🎬 O Premium fica R$ 5.490,00. Qual o mês?";
  const parts = sentenceParts(line);
  assertEquals(parts.join(""), line);
  assertEquals(parts.map((p) => p.trim()), ["Já te enviei as fotos 📸", "Também te mandei o vídeo 🎬", "O Premium fica R$ 5.490,00.", "Qual o mês?"]);
  const withMoney = stripFalseMaterialClaims("Te mandei o PDF, o Premium fica R$ 5.490,00 para 60. Qual o mês? 😊", none);
  assertEquals(withMoney.text, "Qual o mês? 😊");
});

Deno.test("hasSubstance: emoji e pontuação não contam", () => {
  assertEquals(hasSubstance("😊 🎉!"), false);
  assertEquals(hasSubstance("Qual o mês da festa? 😊"), true);
});
