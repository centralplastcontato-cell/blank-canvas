import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { pickLatestIncoming, teamRepliedAfter } from "./ai-turn.ts";

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
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:03:00Z", metadata: { source: "platform" } }], since), true);
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:03:00Z", metadata: null }], since), true); // pelo celular
});
