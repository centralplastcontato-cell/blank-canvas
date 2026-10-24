// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { campaignPromptNote, loadCampaignContext } from "./campaign-context.ts";

Deno.test("campaignPromptNote: diz quando e o que o cliente recebeu", () => {
  const now = Date.parse("2026-10-24T15:00:00Z");
  const note = campaignPromptNote({ name: "Novembro", message: "Oi Ana! Datas livres em novembro", hasImage: true, sentAt: "2026-10-23T12:00:00Z" }, now);
  assertEquals(note.includes('recebeu ontem a campanha "Novembro" do buffet (com uma imagem)'), true);
  assertEquals(note.includes('"Oi Ana! Datas livres em novembro"'), true);
  assertEquals(note.includes("Não invente desconto"), true);
  const onlyImage = campaignPromptNote({ name: "X", message: "", hasImage: true, sentAt: "2026-10-24T12:00:00Z" }, now);
  assertEquals(onlyImage.includes("recebeu hoje") && onlyImage.includes("(só uma imagem, sem texto)"), true);
});

Deno.test("loadCampaignContext: monta a mensagem da variação enviada", async () => {
  const calls: string[] = [];
  const q: any = {
    from: (t: string) => { calls.push(t); return q; },
    select: () => q, eq: () => q, gte: () => q, order: () => q,
    like: (_c: string, v: string) => { calls.push(v); return q; },
    limit: () => Promise.resolve({ data: [{ lead_name: "Ana", variation_index: 3, sent_at: "2026-10-23T12:00:00Z",
      campaigns: { name: "Promo", message_variations: [{ text: "A {nome}" }, { text: "B {nome} - {empresa}" }], image_url: null } }] }),
  };
  const ctx = await loadCampaignContext(q, "c1", "+55 (15) 99111-2222", "Buffet X", Date.parse("2026-10-24T12:00:00Z"));
  assertEquals(ctx, { name: "Promo", message: "B Ana - Buffet X", hasImage: false, sentAt: "2026-10-23T12:00:00Z" });
  assertEquals(calls, ["campaign_recipients", "%91112222"]);
  assertEquals(await loadCampaignContext(q, "c1", "123", "X"), null);
});
