import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { AI_WRITABLE_TABLES, AiWriteBlockedError, guardAiDb } from "./ai-db-guard.ts";

// deno-lint-ignore no-explicit-any
function assertThrows(fn: () => unknown, cls: any) {
  try { fn(); } catch (e) { if (e instanceof cls) return; throw e; }
  throw new Error("esperava erro");
}

const calls: string[] = [];
const builder = (t: string) => ({
  select: () => { calls.push(`select ${t}`); return "rows"; },
  insert: () => { calls.push(`insert ${t}`); return "ok"; },
  update: () => { calls.push(`update ${t}`); return "ok"; },
  upsert: () => { calls.push(`upsert ${t}`); return "ok"; },
  delete: () => { calls.push(`delete ${t}`); return "ok"; },
});
const fake = { from: builder, rpc: (fn: string) => `rpc ${fn}` };

Deno.test("guardAiDb: lê tudo, grava só nas tabelas liberadas", () => {
  const db = guardAiDb(fake);
  assertEquals(db.from("company_events").select(), "rows");
  assertEquals(db.from("pre_reservations").select(), "rows");
  for (const op of ["insert", "update", "upsert", "delete"] as const) {
    assertThrows(() => (db.from("company_events") as Record<string, () => unknown>)[op](), AiWriteBlockedError);
    assertThrows(() => (db.from("event_payments") as Record<string, () => unknown>)[op](), AiWriteBlockedError);
  }
  assertEquals(db.from("lead_visits").insert(), "ok");
  assertEquals(db.from("campaign_leads").update(), "ok");
  assertEquals(db.from("lead_history").insert(), "ok");
  assertEquals(db.rpc("get_company_notification_targets"), "rpc get_company_notification_targets");
  assertThrows(() => db.rpc("delete_event"), AiWriteBlockedError);
  assertEquals(calls.filter((c) => /company_events|event_payments/.test(c) && !c.startsWith("select")), []);
});

Deno.test("trava da IA: pode gravar o link curto do cadastro de candidatos", () => {
  assertEquals(AI_WRITABLE_TABLES.has("freelancer_invites"), true);
});

Deno.test("trava da IA: pode marcar que o cliente respondeu a confirmação da visita", () => {
  assertEquals(AI_WRITABLE_TABLES.has("visit_confirmation_history"), true);
});
