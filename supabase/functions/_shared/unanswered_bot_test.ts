import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { botShouldHaveAnswered } from "./unanswered-bot.ts";

Deno.test("botShouldHaveAnswered: robô ligado → devia ter respondido", () => {
  assertEquals(botShouldHaveAnswered({ bot_enabled: true, test_mode_enabled: false }, false), true);
});

Deno.test("botShouldHaveAnswered: robô desligado ou sem configuração → silêncio proposital", () => {
  assertEquals(botShouldHaveAnswered({ bot_enabled: false, test_mode_enabled: false }, false), false);
  assertEquals(botShouldHaveAnswered(null, false), false);
});

Deno.test("botShouldHaveAnswered: modo de teste só vale para o número de teste", () => {
  assertEquals(botShouldHaveAnswered({ bot_enabled: true, test_mode_enabled: true }, false), false);
  assertEquals(botShouldHaveAnswered({ bot_enabled: false, test_mode_enabled: true }, true), true);
});
