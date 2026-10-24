import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { type LostCandidate, shouldResendLost } from "./lost-first-message.ts";

const now = Date.parse("2026-10-22T13:45:00Z");
const at = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();
const msg = (minAgo: number, meta: Record<string, unknown> = { source: "reactivation_engine" }, status = "sent", type = "text"): LostCandidate =>
  ({ timestamp: at(minAgo), status, message_type: type, metadata: meta });
const ok = { conversationMovedOn: false, instanceDeliveredSince: true };

Deno.test("reativação só com um tique há 30+ min e o número entregando: reenvia", () => {
  assertEquals(shouldResendLost(msg(45), ok, now), true);
});

Deno.test("antes de 15 min ou depois de 6 h: não reenvia", () => {
  assertEquals(shouldResendLost(msg(10), ok, now), false);
  assertEquals(shouldResendLost(msg(20), ok, now), true);
  assertEquals(shouldResendLost(msg(7 * 60), ok, now), false);
});

Deno.test("entregue, lida ou com erro: não reenvia", () => {
  assertEquals(shouldResendLost(msg(45, undefined, "delivered"), ok, now), false);
  assertEquals(shouldResendLost(msg(45, undefined, "read"), ok, now), false);
  assertEquals(shouldResendLost(msg(45, undefined, "error"), ok, now), false);
});

Deno.test("só uma vez: nem a já reenviada nem o próprio reenvio", () => {
  assertEquals(shouldResendLost(msg(45, { source: "reactivation_engine", lost_resend: { at: at(10) } }), ok, now), false);
  assertEquals(shouldResendLost(msg(45, { source: "reactivation_engine", retry_of: "x" }), ok, now), false);
});

Deno.test("só automações e só texto", () => {
  assertEquals(shouldResendLost(msg(45, { source: "platform" }), ok, now), false);
  assertEquals(shouldResendLost(msg(45, {}), ok, now), false);
  assertEquals(shouldResendLost(msg(45, { source: "auto_reminder" }, "sent", "image"), ok, now), false);
  assertEquals(shouldResendLost(msg(45, { source: "auto_reminder" }), ok, now), true);
});

Deno.test("conversa andou ou número sem entregar nada depois: não reenvia", () => {
  assertEquals(shouldResendLost(msg(45), { conversationMovedOn: true, instanceDeliveredSince: true }, now), false);
  assertEquals(shouldResendLost(msg(45), { conversationMovedOn: false, instanceDeliveredSince: false }, now), false);
});
