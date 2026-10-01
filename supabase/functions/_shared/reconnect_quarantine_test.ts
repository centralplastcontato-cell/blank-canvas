import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { isLiveReplyToBotQuestion } from "./reconnect-quarantine.ts";

const NOW = new Date("2026-09-30T20:08:12Z").getTime();
const base = {
  fromMe: false,
  botEnabled: true,
  botStep: "convidados",
  lastBotMessageAt: "2026-09-30T19:56:28Z",
  incomingAt: "2026-09-30T20:08:11Z",
  now: NOW,
};

Deno.test("isLiveReplyToBotQuestion: resposta nova à pergunta do robô (caso Evelin) → responde", () => {
  assertEquals(isLiveReplyToBotQuestion(base), true);
});

Deno.test("isLiveReplyToBotQuestion: mensagem antiga reenviada (anterior à pergunta) → segura", () => {
  assertEquals(isLiveReplyToBotQuestion({ ...base, incomingAt: "2026-09-30T19:50:00Z" }), false);
});

Deno.test("isLiveReplyToBotQuestion: pergunta do robô velha demais → segura", () => {
  assertEquals(isLiveReplyToBotQuestion({ ...base, lastBotMessageAt: "2026-09-30T18:00:00Z" }), false);
});

Deno.test("isLiveReplyToBotQuestion: robô desligado, fluxo encerrado ou mensagem nossa → segura", () => {
  assertEquals(isLiveReplyToBotQuestion({ ...base, botEnabled: false }), false);
  assertEquals(isLiveReplyToBotQuestion({ ...base, botStep: "complete_final" }), false);
  assertEquals(isLiveReplyToBotQuestion({ ...base, botStep: "sending_materials" }), false);
  assertEquals(isLiveReplyToBotQuestion({ ...base, fromMe: true }), false);
  assertEquals(isLiveReplyToBotQuestion({ ...base, lastBotMessageAt: null }), false);
});
