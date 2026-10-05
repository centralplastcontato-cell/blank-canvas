import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { mergeConsecutiveTurns, pickLatestIncoming, teamRepliedAfter } from "./ai-turn.ts";

Deno.test("pickLatestIncoming: a última mensagem do cliente responde por todas", () => {
  assertEquals(pickLatestIncoming([
    { message_id: "A", timestamp: "2026-10-05T22:10:01Z" },
    { message_id: "C", timestamp: "2026-10-05T22:10:07Z" },
    { message_id: "B", timestamp: "2026-10-05T22:10:04Z" },
  ]), "C");
});

Deno.test("pickLatestIncoming: empate no mesmo segundo tem vencedor único", () => {
  const rows = [
    { message_id: "3EB0AAA", timestamp: "2026-10-05T22:10:07Z" },
    { message_id: "3EB0BBB", timestamp: "2026-10-05T22:10:07Z" },
  ];
  assertEquals(pickLatestIncoming(rows), "3EB0BBB");
  assertEquals(pickLatestIncoming([...rows].reverse()), "3EB0BBB");
});

Deno.test("teamRepliedAfter: só resposta de gente da equipe conta", () => {
  const since = "2026-10-05T22:00:00Z";
  assertEquals(teamRepliedAfter([
    { from_me: true, timestamp: "2026-10-05T21:59:00Z", metadata: { source: "platform" } }, // antes
    { from_me: false, timestamp: "2026-10-05T22:01:00Z", metadata: null }, // cliente
    { from_me: true, timestamp: "2026-10-05T22:02:00Z", metadata: { source: "auto_reminder" } }, // follow-up
  ], since), false);
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T23:30:00Z", metadata: { source: "platform" } }], since), true);
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:03:00Z", metadata: null }], since), true); // pelo celular
});

Deno.test("mergeConsecutiveTurns: perguntas picadas viram um turno só, contando as pendentes", () => {
  assertEquals(mergeConsecutiveTurns([
    { role: "assistant", content: "Oi! Qual seu nome?" },
    { role: "user", content: "Victor" },
    { role: "assistant", content: "Prazer, Victor!" },
    { role: "user", content: "vocês fazem festa à noite?" },
    { role: "user", content: "tem estacionamento?" },
  ]), {
    merged: [
      { role: "assistant", content: "Oi! Qual seu nome?" },
      { role: "user", content: "Victor" },
      { role: "assistant", content: "Prazer, Victor!" },
      { role: "user", content: "vocês fazem festa à noite?\ntem estacionamento?" },
    ],
    pendingUserMessages: 2,
  });
});

Deno.test("teamRepliedAfter: 'platform' de antes da marcação da IA não conta; celular conta", () => {
  const since = "2026-10-05T22:56:24Z"; // passagem às 19:56
  // resposta da IA antiga, gravada como se fosse do Celebrei
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:56:30Z", metadata: { source: "platform", provider: "zapi" } }], since), false);
  // depois da atualização, "platform" é gente da equipe
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T23:30:00Z", metadata: { source: "platform" } }], since), true);
  // pelo celular (sem metadata) sempre foi gente
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:58:00Z", metadata: null }], since), true);
});

Deno.test("teamRepliedAfter: mensagem da IA (ai_agent) não conta como equipe", () => {
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:03:00Z", metadata: { source: "ai_agent" } }], "2026-10-05T22:00:00Z"), false);
});
