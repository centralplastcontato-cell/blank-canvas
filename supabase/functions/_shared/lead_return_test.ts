import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  decideWhatsAppReturn,
  leadsWithActionSinceReturn,
  returnWindowHours,
  type ReturnDecisionInput,
} from "./lead-return.ts";

const DAY = 24;

Deno.test("returnWindowHours: sem follow-up ligado vale o mínimo de 15 dias", () => {
  assertEquals(returnWindowHours([]), 15 * DAY);
  assertEquals(returnWindowHours([{ follow_up_enabled: false }]), 15 * DAY);
});

Deno.test("returnWindowHours: sequência padrão + perdido automático + 7 dias", () => {
  // 24 + 48 + 72 + 96 = 240h (10 dias) + 48h de perdido automático + 7 dias = 19 dias
  const padrao = {
    follow_up_enabled: true, follow_up_delay_hours: 24,
    follow_up_2_enabled: true, follow_up_2_delay_hours: 48,
    follow_up_3_enabled: true, follow_up_3_delay_hours: 72,
    follow_up_4_enabled: true, follow_up_4_delay_hours: 96,
    auto_lost_enabled: true, auto_lost_delay_hours: 48,
  };
  assertEquals(returnWindowHours([padrao]), 19 * DAY);
});

Deno.test("returnWindowHours: sequência curta respeita o mínimo; vale o número mais longo", () => {
  const curto = { follow_up_enabled: true, follow_up_delay_hours: 24 };
  assertEquals(returnWindowHours([curto]), 15 * DAY);
  const longo = {
    follow_up_enabled: true, follow_up_delay_hours: 72,
    follow_up_2_enabled: true, follow_up_2_delay_hours: 168,
    follow_up_3_enabled: true, follow_up_3_delay_hours: 168,
  };
  // 72 + 168 + 168 = 408h (17 dias) + 7 = 24 dias
  assertEquals(returnWindowHours([curto, longo]), 24 * DAY);
});

const base = (over: Partial<ReturnDecisionInput>): ReturnDecisionInput => ({
  now: new Date("2026-09-25T12:00:00Z"),
  windowHours: 19 * DAY,
  status: "aguardando_resposta",
  lastClientMessageAt: null,
  leadLastEntryAt: "2026-01-10T12:00:00Z",
  lastReturnAt: null,
  manualLostAt: null,
  autoLostAt: null,
  ...over,
});

Deno.test("decideWhatsAppReturn: cliente que conversou há pouco não é retorno", () => {
  assertEquals(decideWhatsAppReturn(base({ lastClientMessageAt: "2026-09-20T12:00:00Z" })), null);
});

Deno.test("decideWhatsAppReturn: parado além do prazo do bufê é retorno", () => {
  assertEquals(decideWhatsAppReturn(base({ lastClientMessageAt: "2026-09-01T12:00:00Z" })), "tempo");
});

Deno.test("decideWhatsAppReturn: lead recém-chegado pelo site que escreve no WhatsApp não é retorno", () => {
  assertEquals(decideWhatsAppReturn(base({ leadLastEntryAt: "2026-09-25T11:55:00Z" })), null);
});

Deno.test("decideWhatsAppReturn: retorno recente conta como referência", () => {
  assertEquals(decideWhatsAppReturn(base({
    lastClientMessageAt: "2026-06-01T12:00:00Z",
    leadLastEntryAt: "2026-09-22T12:00:00Z",
    lastReturnAt: "2026-09-22T12:00:00Z",
  })), null);
});

Deno.test("decideWhatsAppReturn: Perdido marcado pela equipe volta na hora", () => {
  assertEquals(decideWhatsAppReturn(base({
    status: "perdido",
    lastClientMessageAt: "2026-09-24T12:00:00Z",
    manualLostAt: "2026-09-24T18:00:00Z",
  })), "perdido_manual");
});

Deno.test("decideWhatsAppReturn: Perdido já contado não conta de novo", () => {
  assertEquals(decideWhatsAppReturn(base({
    status: "perdido",
    lastClientMessageAt: "2026-09-25T11:00:00Z",
    manualLostAt: "2026-09-24T18:00:00Z",
    lastReturnAt: "2026-09-25T10:00:00Z",
    leadLastEntryAt: "2026-09-25T10:00:00Z",
  })), null);
});

Deno.test("decideWhatsAppReturn: perdido automático sozinho segue a regra do tempo", () => {
  const auto = { status: "perdido", autoLostAt: "2026-09-24T18:00:00Z" };
  assertEquals(decideWhatsAppReturn(base({ ...auto, lastClientMessageAt: "2026-09-20T12:00:00Z" })), null);
  // equipe marcou antes, mas o automático foi o último: também regra do tempo
  assertEquals(decideWhatsAppReturn(base({
    ...auto, manualLostAt: "2026-09-01T00:00:00Z", lastClientMessageAt: "2026-09-20T12:00:00Z",
  })), null);
});

Deno.test("leadsWithActionSinceReturn: ignora registros de antes do retorno", () => {
  const rows = [
    { lead_id: "a", created_at: "2026-05-01T00:00:00Z" },
    { lead_id: "b", created_at: "2026-05-01T00:00:00Z" },
    { lead_id: "c", created_at: "2026-09-24T00:00:00Z" },
  ];
  const returns = new Map([["a", "2026-09-01T00:00:00Z"], ["c", "2026-09-01T00:00:00Z"]]);
  assertEquals([...leadsWithActionSinceReturn(rows, returns)].sort(), ["b", "c"]);
});
