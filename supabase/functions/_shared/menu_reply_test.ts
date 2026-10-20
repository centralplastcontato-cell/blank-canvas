import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { keycapsToDigits } from "./menu-reply.ts";

Deno.test("emoji de número vira dígito (1️⃣2️⃣ = 12, não 1)", () => {
  assertEquals(keycapsToDigits("1️⃣2️⃣"), "12");
  assertEquals(keycapsToDigits("1⃣1⃣"), "11");
  assertEquals(keycapsToDigits("🔟"), "10");
  assertEquals(keycapsToDigits("3️⃣ - Sábado"), "3 - Sábado");
  assertEquals(keycapsToDigits("Dezembro"), "Dezembro");
  assertEquals(keycapsToDigits("2"), "2");
});
