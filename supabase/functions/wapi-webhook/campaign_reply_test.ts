import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { CAMPAIGN_REPLY_WINDOW_DAYS, campaignReplyNotice, campaignReplyState, clearCampaignMark } from "./campaign-reply.ts";

Deno.test("campaignReplyState: sem marca não é resposta de campanha", () => {
  assertEquals(campaignReplyState(null), null);
  assertEquals(campaignReplyState({ step: "x" }), null);
});

Deno.test("campaignReplyState: marca vence depois do prazo", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const recent = { campaign_pending_reply: "c1", campaign_marked_at: "2026-10-22T12:00:00Z", campaign_lead_name: "Ana" };
  assertEquals(campaignReplyState(recent, now)?.expired, false);
  const old = { ...recent, campaign_marked_at: new Date(now.getTime() - (CAMPAIGN_REPLY_WINDOW_DAYS + 1) * 86400000).toISOString() };
  assertEquals(campaignReplyState(old, now)?.expired, true);
  assertEquals(campaignReplyState({ campaign_pending_reply: "c1", campaign_soft: true }, now)?.soft, true);
});

Deno.test("clearCampaignMark: tira a marca e guarda a resposta", () => {
  const out = clearCampaignMark({ campaign_pending_reply: "c1", campaign_soft: false, other: 1 }, { campaignId: "c1", leadName: "Ana", at: "t" });
  assertEquals(out, { other: 1, campaign_replied_at: "t", campaign_replied_id: "c1", campaign_replied_name: "Ana" });
  assertEquals(clearCampaignMark({ campaign_pending_reply: "c1" }), {});
});

Deno.test("campaignReplyNotice: áudio, modo suave e IA", () => {
  assertEquals(campaignReplyNotice("Ana", "Promo", "team", "audio"), 'Ana mandou um áudio em resposta à campanha "Promo" e aguarda atendimento.');
  assertEquals(campaignReplyNotice("Ana", "Promo", "soft", "text").endsWith("continua com ele."), true);
  assertEquals(campaignReplyNotice("Ana", "Promo", "ai", "text").includes("A IA já está respondendo"), true);
});
