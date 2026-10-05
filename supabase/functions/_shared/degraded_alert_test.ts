import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { decideDegradedAlert } from "./degraded-alert.ts";

const NOW = new Date("2026-10-05T21:36:00Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();

Deno.test("decideDegradedAlert: primeira checagem estranha não avisa (caso VENDAS 2 de 05/10)", () => {
  assertEquals(
    decideDegradedAlert({ previousStatus: "connected", lastWebhookEventAt: minutesAgo(90), now: NOW }),
    { alert: false, reason: "first_detection" },
  );
});

Deno.test("decideDegradedAlert: número recebendo avisos do WhatsApp está vivo — não avisa", () => {
  assertEquals(
    decideDegradedAlert({ previousStatus: "degraded", lastWebhookEventAt: minutesAgo(5), now: NOW }),
    { alert: false, reason: "recent_activity" },
  );
});

Deno.test("decideDegradedAlert: problema confirmado na segunda checagem e sem atividade → avisa", () => {
  assertEquals(
    decideDegradedAlert({ previousStatus: "degraded", lastWebhookEventAt: minutesAgo(45), now: NOW }),
    { alert: true, reason: "confirmed" },
  );
  assertEquals(
    decideDegradedAlert({ previousStatus: "degraded", lastWebhookEventAt: null, now: NOW }).alert,
    true,
  );
});
