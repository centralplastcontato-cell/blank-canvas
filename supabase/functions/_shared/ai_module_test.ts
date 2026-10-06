import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { isAiConversationalEnabled } from "./ai-module.ts";

Deno.test("isAiConversationalEnabled: só com o módulo ligado explicitamente", () => {
  assertEquals(isAiConversationalEnabled({ enabled_modules: { ia_conversacional: true } }), true);
  assertEquals(isAiConversationalEnabled({ enabled_modules: { ia_conversacional: false } }), false);
  assertEquals(isAiConversationalEnabled({ enabled_modules: { whatsapp: true } }), false);
  assertEquals(isAiConversationalEnabled({}), false);
  assertEquals(isAiConversationalEnabled(null), false);
  assertEquals(isAiConversationalEnabled({ enabled_modules: { ia_conversacional: "true" } }), false);
});
