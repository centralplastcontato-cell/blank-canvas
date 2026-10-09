import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { decryptWhatsAppMedia, encryptedMediaUrl, encryptWhatsAppMedia } from "./whatsapp-media-crypto.ts";

const key = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => (i * 7 + 3) % 256)));
const otherKey = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => (i * 11 + 1) % 256)));
const pdf = new TextEncoder().encode("%PDF-1.4 orçamento do Castelo — conteúdo de teste com mais de um bloco AES");

Deno.test("abre o arquivo do WhatsApp com a mediaKey certa", async () => {
  const enc = await encryptWhatsAppMedia(pdf, key, "document");
  assertEquals(await decryptWhatsAppMedia(enc, key, "document"), pdf);
});

Deno.test("chave errada, tipo errado ou arquivo mexido: não abre", async () => {
  const enc = await encryptWhatsAppMedia(pdf, key, "document");
  assertEquals(await decryptWhatsAppMedia(enc, otherKey, "document"), null);
  assertEquals(await decryptWhatsAppMedia(enc, key, "image"), null);
  const broken = enc.slice();
  broken[5] ^= 1;
  assertEquals(await decryptWhatsAppMedia(broken, key, "document"), null);
  assertEquals(await decryptWhatsAppMedia(new Uint8Array(4), key, "document"), null);
});

Deno.test("figurinha usa a mesma chave da imagem", async () => {
  const enc = await encryptWhatsAppMedia(pdf, key, "image");
  assertEquals(await decryptWhatsAppMedia(enc, key, "sticker"), pdf);
});

Deno.test("link do arquivo: URL do WhatsApp ou directPath", () => {
  assertEquals(encryptedMediaUrl("https://mmg.whatsapp.net/o1/v/t24/x?oh=1", "/o1/v/t24/x"), "https://mmg.whatsapp.net/o1/v/t24/x?oh=1");
  assertEquals(encryptedMediaUrl(null, "/v/t62/y?ccb=1"), "https://mmg.whatsapp.net/v/t62/y?ccb=1");
  assertEquals(encryptedMediaUrl("https://x.supabase.co/storage/a.jpg", null), null);
  assertEquals(encryptedMediaUrl(null, null), null);
});
