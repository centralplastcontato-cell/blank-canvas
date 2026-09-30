import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  collectStatusMessageIds,
  isPlayedStatus,
  mapProviderMessageStatus,
  statusesBelow,
  statusUpdateFilter,
} from "./message-status.ts";

Deno.test("mapProviderMessageStatus: Z-API RECEIVED vira entregue", () => {
  assertEquals(mapProviderMessageStatus("RECEIVED", undefined), "delivered");
  assertEquals(mapProviderMessageStatus("received", undefined), "delivered");
});

Deno.test("mapProviderMessageStatus: W-API por texto e por ack numérico", () => {
  assertEquals(mapProviderMessageStatus("DELIVERY_ACK", undefined), "delivered");
  assertEquals(mapProviderMessageStatus("READ", undefined), "read");
  assertEquals(mapProviderMessageStatus(undefined, 3), "delivered");
  assertEquals(mapProviderMessageStatus(undefined, "4"), "read");
  assertEquals(mapProviderMessageStatus("SENT", undefined), "sent");
});

Deno.test("mapProviderMessageStatus: PLAYED e READ_BY_ME não viram status genérico", () => {
  assertEquals(mapProviderMessageStatus("PLAYED", undefined), "unknown");
  assertEquals(mapProviderMessageStatus("READ_BY_ME", undefined), "unknown");
  assertEquals(isPlayedStatus("played", undefined), true);
  assertEquals(isPlayedStatus("READ", undefined), false);
});

Deno.test("statusesBelow: nunca regride o tique", () => {
  assertEquals(statusesBelow("delivered"), ["pending", "sent", "error"]);
  assertEquals(statusesBelow("read"), ["pending", "sent", "delivered", "error"]);
  assertEquals(statusesBelow("sent"), ["pending", "error"]);
  assertEquals(statusesBelow("pending"), []);
  assertEquals(statusesBelow("error"), ["pending", "sent"]);
});

Deno.test("statusUpdateFilter: filtro válido mesmo sem status inferior", () => {
  assertEquals(statusUpdateFilter("delivered"), "status.is.null,status.in.(pending,sent,error)");
  assertEquals(statusUpdateFilter("pending"), "status.is.null");
});

Deno.test("collectStatusMessageIds: junta messageId e ids da Z-API sem repetir", () => {
  assertEquals(collectStatusMessageIds("A", ["A", "B", "", null]), ["A", "B"]);
  assertEquals(collectStatusMessageIds(undefined, undefined), []);
  assertEquals(collectStatusMessageIds("  C ", "x"), ["C"]);
});
