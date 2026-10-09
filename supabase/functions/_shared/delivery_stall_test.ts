import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { decideDeliveryStall, type OutgoingRow } from "./delivery-stall.ts";

const now = Date.parse("2026-10-09T19:00:00Z"); // 16h em Brasília
const at = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();
const row = (minAgo: number, status: string, conv: string, type = "text", source?: string): OutgoingRow =>
  ({ timestamp: at(minAgo), status, conversation_id: conv, message_type: type, metadata: source ? { source } : null });

Deno.test("nada chega para 2+ clientes há 20+ min: alerta", () => {
  const d = decideDeliveryStall([
    row(90, "read", "a"),
    row(60, "sent", "b"), row(50, "sent", "c"), row(30, "sent", "b"),
  ], now);
  assertEquals(d.stalled, true);
  assertEquals(d.kind, "all");
  assertEquals(d.stuck, 3);
  assertEquals(d.since, at(60));
});

Deno.test("um cliente só com o celular desligado: sem alerta", () => {
  const d = decideDeliveryStall([row(60, "sent", "a"), row(50, "sent", "a"), row(40, "sent", "a")], now);
  assertEquals(d.stalled, false);
});

Deno.test("algo enviado depois foi entregue: o número está vivo", () => {
  const d = decideDeliveryStall([
    row(60, "sent", "a"), row(50, "sent", "b"), row(45, "sent", "c"), row(25, "delivered", "d"),
  ], now);
  assertEquals(d.stalled, false);
});

Deno.test("mensagens recentes (menos de 20 min) ainda não contam", () => {
  const d = decideDeliveryStall([row(15, "sent", "a"), row(10, "sent", "b"), row(5, "sent", "c")], now);
  assertEquals(d.stalled, false);
});

Deno.test("só a mídia parou (textos chegam): alerta de mídia — caso VENDAS 2", () => {
  const d = decideDeliveryStall([
    row(170, "read", "x", "image"),
    row(150, "sent", "a", "document"), row(120, "sent", "b", "image"), row(119, "sent", "b", "image"),
    row(60, "sent", "c", "image"), row(59, "sent", "c", "document"),
    row(58, "read", "c", "text"), row(30, "delivered", "d", "text"),
  ], now);
  assertEquals(d.stalled, true);
  assertEquals(d.kind, "media");
  assertEquals(d.conversations, 3);
});

Deno.test("avisos do sistema e reações não contam", () => {
  const d = decideDeliveryStall([
    row(60, "sent", "a", "text", "system_alert"), row(50, "sent", "b", "text", "reaction"), row(40, "sent", "c"),
  ], now);
  assertEquals(d.stalled, false);
});

Deno.test("mais de 3 horas atrás fica de fora", () => {
  const d = decideDeliveryStall([row(250, "sent", "a"), row(240, "sent", "b"), row(230, "sent", "c")], now);
  assertEquals(d.stalled, false);
});
