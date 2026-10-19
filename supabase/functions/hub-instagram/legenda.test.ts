import { assert, assertEquals } from "jsr:@std/assert@1";
import { CHAMADA, FATOS, TEMAS, promptDaFoto } from "./catalogo.ts";
import { legendaReserva, problemaNoTexto, validaResposta } from "./legenda.ts";

Deno.test("aceita o que o site diz", () => {
  for (const ok of [
    CHAMADA,
    "Crie sua conta grátis em hubcelebrei.com.br.",
    "Crie a conta do seu buffet grátis.",
    "No site dá para agendar uma demonstração gratuita.",
    "O atendimento responde no WhatsApp 24 horas por dia.",
    "Atendimento 24h, de dia e de noite.",
  ]) assertEquals(problemaNoTexto(ok), null, ok);
});

Deno.test("recusa preço, plano, número inventado, garantia, grátis que não existe e convite fora do site", () => {
  assertEquals(problemaNoTexto("A partir de R$ 299"), "citou preço ou plano");
  assertEquals(problemaNoTexto("Conheça o plano Pró"), "citou preço ou plano");
  assertEquals(problemaNoTexto("Aumente suas festas em 40%"), "citou porcentagem");
  assertEquals(problemaNoTexto("Mais de 500 festas fechadas"), "citou número que não está nos fatos");
  assertEquals(problemaNoTexto("Setup em 48h"), "citou número que não está nos fatos");
  assertEquals(problemaNoTexto("Resultado garantido"), "prometeu garantia");
  assertEquals(problemaNoTexto("O atendimento automático é grátis para sempre"), "disse que algo além da conta ou da demonstração é grátis");
  assertEquals(problemaNoTexto("Chama a gente no WhatsApp!"), "convidou para o WhatsApp em vez do site");
  assertEquals(problemaNoTexto("Manda uma mensagem pelo WhatsApp"), "convidou para o WhatsApp em vez do site");
  assertEquals(problemaNoTexto("Fale com a gente no direct"), "convidou para o direct em vez do site");
});

Deno.test("todo texto pronto do catálogo passa nas regras (títulos, perguntas, cartões, fatos)", () => {
  for (const tema of TEMAS) {
    for (const t of [...tema.titulos, ...tema.perguntas, ...tema.pontos.flatMap((p) => [p.titulo, p.texto])]) {
      assertEquals(problemaNoTexto(t), null, `${tema.id}: ${t}`);
    }
    for (const t of tema.titulos) assert(t.length <= 32, `${tema.id}: título longo "${t}"`);
    for (const t of tema.perguntas) assert(t.length <= 48 && t.endsWith("?"), `${tema.id}: pergunta "${t}"`);
  }
  for (const f of FATOS) assert(!/R\$|%/.test(f), f);
});

Deno.test("os dois assuntos têm temas e os prompts de imagem pedem foto sem texto", () => {
  assert(TEMAS.filter((t) => t.publico === "vendas").length >= 3);
  assert(TEMAS.filter((t) => t.publico === "gestao").length >= 3);
  for (const t of TEMAS) {
    const p = promptDaFoto(t.imagem, t.cenarios[0]);
    assert(/NO text/.test(p) && /no children/i.test(p), t.id);
  }
});

Deno.test("legendas de reserva passam nas próprias regras e cabem no Instagram", () => {
  for (const tema of TEMAS) {
    for (const tipo of ["foto", "pergunta", "carrossel"] as const) {
      const t = legendaReserva(tema, tipo, 7);
      const tudo = [t.titulo, t.pergunta || "", t.legenda, ...(t.pontos || []).flatMap((p) => [p.titulo, p.texto])].join("\n");
      assertEquals(problemaNoTexto(tudo), null, `${tema.id}/${tipo}: ${tudo}`);
      assert((t.legenda + " " + t.hashtags).length <= 2200);
      const n = t.hashtags.split(" ").length;
      assert(n >= 8 && n <= 12, `${tema.id}: ${n} hashtags`);
      assert(t.hashtags.includes("#celebrei"));
      assert(t.legenda.includes("hubcelebrei.com.br"));
      assert(t.titulo.length <= 32, `${tema.id}: título longo "${t.titulo}"`);
    }
  }
});

Deno.test("validaResposta: aproveita a IA quando está tudo certo e garante #celebrei", () => {
  const tema = TEMAS[0];
  const r = validaResposta(
    {
      titulo: "Quem responde primeiro, fecha.",
      legenda: "A mãe pediu orçamento para cinco buffets? Não, para vários.\n\nCom a Celebrei, seu buffet responde no WhatsApp na hora, com fotos e pacotes.\n\nCrie sua conta grátis em hubcelebrei.com.br.",
      hashtags: ["Buffet Infantil", "#festainfantil", "dono de buffet", "atendimento", "funildevendas", "vendas", "festas", "eventos", "festas2026"],
      pontos: [{ titulo: "Resposta em segundos", texto: "O atendimento responde com os pacotes do buffet." }, { titulo: "Convite para a visita", texto: "O cliente já é convidado para conhecer o espaço." }],
    },
    tema,
    "carrossel",
    legendaReserva(tema, "carrossel", 1),
  );
  assertEquals(r.origem, "ia");
  assertEquals(r.titulo, "Quem responde primeiro, fecha");
  assert(r.hashtags.startsWith("#celebrei "));
  assert(r.hashtags.includes("#buffetinfantil"));
  assert(!/2026/.test(r.hashtags), r.hashtags);
  assertEquals(r.pontos?.length, 2);
});

Deno.test("validaResposta: carrossel sem os 2 cartões, com preço ou chamando no WhatsApp cai na reserva", () => {
  const tema = TEMAS[0];
  const reserva = legendaReserva(tema, "carrossel", 1);
  const pontos = [{ titulo: "A", texto: "um texto de exemplo ok" }, { titulo: "B", texto: "outro texto de exemplo" }];
  const semPontos = validaResposta({ titulo: "Oi", legenda: "x".repeat(80) }, tema, "carrossel", reserva);
  assertEquals(semPontos.origem, "reserva");
  const comPreco = validaResposta(
    { titulo: "Oi", legenda: "Planos a partir de R$ 299 por mês, crie sua conta grátis em hubcelebrei.com.br hoje mesmo!", pontos },
    tema,
    "carrossel",
    reserva,
  );
  assertEquals(comPreco.origem, "reserva");
  assert(comPreco.erro?.includes("preço"));
  const comWhats = validaResposta(
    { titulo: "Seu buffet atendendo", legenda: "A Celebrei responde seus leads na hora. Chama a gente no WhatsApp e conheça a plataforma hoje mesmo!", pontos },
    tema,
    "carrossel",
    reserva,
  );
  assertEquals(comWhats.origem, "reserva");
  assert(comWhats.erro?.includes("WhatsApp"));
});
