import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { decideUnconfirmedMedia, MEDIA_ACK_TIMEOUT_MS, mediaAckMetadata, waitForMediaAck } from "./media-ack.ts";

const NOW = Date.parse("2026-10-06T02:00:00Z");
const old = new Date(NOW - MEDIA_ACK_TIMEOUT_MS - 1000).toISOString();
const fresh = new Date(NOW - 30 * 1000).toISOString();

Deno.test("mediaAckMetadata: guarda o link para reenviar; base64 não", () => {
  assertEquals(mediaAckMetadata("send-video", { mediaUrl: "https://x/v.mp4", caption: "Oi" }, { automation: true }), {
    ack: "awaiting",
    automation: true,
    retry_of: null,
    resend: { action: "send-video", mediaUrl: "https://x/v.mp4", caption: "Oi", fileName: undefined },
  });
  assertEquals(mediaAckMetadata("send-image", { mediaUrl: "data:image/png;base64,AAA" }, {}).resend, null);
});

Deno.test("decideUnconfirmedMedia: espera, reenvia uma vez, depois erro", () => {
  const auto = mediaAckMetadata("send-video", { mediaUrl: "https://x/v.mp4" }, { automation: true });
  assertEquals(decideUnconfirmedMedia({ timestamp: fresh, metadata: auto }, NOW, true), "wait");
  assertEquals(decideUnconfirmedMedia({ timestamp: old, metadata: auto }, NOW, true), "retry");
  // reenvio que também não confirmou
  assertEquals(decideUnconfirmedMedia({ timestamp: old, metadata: { ...auto, retry_of: "row1" } }, NOW, true), "fail");
  // envio manual da equipe: não reenvia sozinho, só marca erro
  assertEquals(decideUnconfirmedMedia({ timestamp: old, metadata: { ...auto, automation: false } }, NOW, true), "fail");
  // instância sem avisos de status: não dá para julgar
  assertEquals(decideUnconfirmedMedia({ timestamp: old, metadata: auto }, NOW, false), "skip");
});

Deno.test("waitForMediaAck: separa confirmadas, com erro e sem resposta", async () => {
  const rows = [
    { message_id: "a", status: "sent" },
    { message_id: "b", status: "pending" },
    { message_id: "c", status: "error" },
    { message_id: "d", status: "read" },
  ];
  const fake = { from: () => ({ select: () => ({ in: async () => ({ data: rows }) }) }) };
  assertEquals(await waitForMediaAck(fake, ["a", "b", "c", "d"], 0), { confirmed: ["a", "d"], failed: ["c"], pending: ["b"] });
});
