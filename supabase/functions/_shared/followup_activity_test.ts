import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { activeConversations } from "./followup-activity.ts";

Deno.test("mensagem da equipe pelo celular segura o follow-up (caso Vanessa)", () => {
  const a = activeConversations([{ conversation_id: "v", from_me: true, metadata: null }]);
  assertEquals(a.has("v"), true);
});

Deno.test("cliente escreveu segura; envios automáticos não seguram", () => {
  const a = activeConversations([
    { conversation_id: "cli", from_me: false, metadata: null },
    { conversation_id: "fu", from_me: true, metadata: { source: "auto_reminder" } },
    { conversation_id: "mat", from_me: true, metadata: { source: "platform", automation: true } },
    { conversation_id: "central", from_me: true, metadata: { source: "platform" } },
  ]);
  assertEquals([...a].sort(), ["central", "cli"]);
});
