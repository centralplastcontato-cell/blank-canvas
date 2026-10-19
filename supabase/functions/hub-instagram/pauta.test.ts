import { assert, assertEquals } from "jsr:@std/assert@1";
import { horarioBrasilia, horarioDeTeste, publicoDaOrdem, vagasProximas } from "./pauta.ts";

// Meia-noite e um minuto de 20/10/2026 em Brasília.
const agora = new Date("2026-10-20T00:01:00-03:00");

Deno.test("1ª semana: 3 posts por dia (09:00, 12:30, 18:30)", () => {
  const v = vagasProximas("2026-10-20", 3, agora);
  assertEquals(v.length, 9);
  assertEquals(v.slice(0, 3).map((x) => horarioBrasilia(x.vaga)), [
    "2026-10-20T09:00:00-03:00",
    "2026-10-20T12:30:00-03:00",
    "2026-10-20T18:30:00-03:00",
  ]);
  assertEquals(v.map((x) => x.ordem), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

Deno.test("tipos: foto, pergunta-ou-carrossel alternando por dia, foto", () => {
  const v = vagasProximas("2026-10-20", 2, agora);
  assertEquals(v.map((x) => x.tipo), ["foto", "carrossel", "foto", "foto", "pergunta", "foto"]);
});

Deno.test("assunto: 2 de vendas, 1 de gestão", () => {
  assertEquals([0, 1, 2, 3, 4, 5].map(publicoDaOrdem), ["vendas", "vendas", "gestao", "vendas", "vendas", "gestao"]);
});

Deno.test("2ª semana: 2 por dia; depois: 1 por dia às 12:00 com rodízio", () => {
  const dia8 = vagasProximas("2026-10-20", 1, new Date("2026-10-27T00:01:00-03:00"));
  assertEquals(dia8.map((x) => horarioBrasilia(x.vaga).slice(11, 16)), ["12:00", "18:30"]);
  assertEquals(dia8[0].ordem, 21); // 7 dias × 3
  const depois = vagasProximas("2026-10-20", 3, new Date("2026-11-03T00:01:00-03:00"));
  assertEquals(depois.length, 3);
  assertEquals(depois[0].ordem, 21 + 14); // + 7 dias × 2
  assertEquals(depois.map((x) => horarioBrasilia(x.vaga).slice(11, 16)), ["12:00", "12:00", "12:00"]);
  assertEquals(new Set(depois.map((x) => x.tipo)).size, 3);
});

Deno.test("só vagas a pelo menos 45 min no futuro", () => {
  const v = vagasProximas("2026-10-20", 1, new Date("2026-10-20T11:50:00-03:00"));
  assertEquals(v.map((x) => horarioBrasilia(x.vaga).slice(11, 16)), ["18:30"]);
});

Deno.test("dias antes do início contam como 1ª semana", () => {
  const v = vagasProximas("2026-10-25", 1, agora);
  assertEquals(v.length, 3);
});

Deno.test("horário do teste: +30 min arredondado para cima de 5 em 5", () => {
  assertEquals(horarioDeTeste(new Date("2026-10-20T10:03:20-03:00")).toISOString(), new Date("2026-10-20T10:35:00-03:00").toISOString());
  assertEquals(horarioDeTeste(new Date("2026-10-20T10:05:00-03:00")).toISOString(), new Date("2026-10-20T10:35:00-03:00").toISOString());
});

Deno.test("horarioBrasilia sempre com -03:00", () => {
  const h = horarioBrasilia(new Date("2026-10-20T15:00:00Z"));
  assertEquals(h, "2026-10-20T12:00:00-03:00");
  assert(h.endsWith("-03:00"));
});
