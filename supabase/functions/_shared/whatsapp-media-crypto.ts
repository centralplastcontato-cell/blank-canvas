// Mídia recebida pelo WhatsApp vem criptografada no servidor dele (mmg.whatsapp.net).
// A Evolution Go entrega o link + mediaKey; aqui a gente baixa e abre o arquivo
// (mesmo algoritmo de todos os clientes do WhatsApp):
//   HKDF-SHA256(mediaKey, info do tipo) → 112 bytes: iv[0:16] | chave AES[16:48] | chave MAC[48:80]
//   arquivo = AES-256-CBC(conteúdo) + 10 bytes de HMAC-SHA256(iv + cifrado)

export type WaMediaType = "image" | "video" | "audio" | "document" | "sticker";

const HKDF_INFO: Record<WaMediaType, string> = {
  image: "WhatsApp Image Keys",
  sticker: "WhatsApp Image Keys",
  video: "WhatsApp Video Keys",
  audio: "WhatsApp Audio Keys",
  document: "WhatsApp Document Keys",
};

export const WHATSAPP_MEDIA_HOST = "https://mmg.whatsapp.net";

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Link do arquivo criptografado: o URL que veio ou o directPath no host do WhatsApp */
export function encryptedMediaUrl(url?: string | null, directPath?: string | null): string | null {
  if (url && /^https:\/\/[^/]*whatsapp\.net\//.test(url)) return url;
  if (directPath && directPath.startsWith("/")) return `${WHATSAPP_MEDIA_HOST}${directPath}`;
  return null;
}

async function expandKeys(mediaKey: Uint8Array, type: WaMediaType) {
  const base = await crypto.subtle.importKey("raw", new Uint8Array(mediaKey), "HKDF", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode(HKDF_INFO[type]) },
    base,
    112 * 8,
  ));
  return { iv: bits.slice(0, 16), cipherKey: bits.slice(16, 48), macKey: bits.slice(48, 80) };
}

/** Abre o arquivo baixado do WhatsApp. null = chave errada / arquivo corrompido */
export async function decryptWhatsAppMedia(encrypted: Uint8Array, mediaKeyB64: string, type: WaMediaType): Promise<Uint8Array | null> {
  if (encrypted.length <= 10) return null;
  const { iv, cipherKey, macKey } = await expandKeys(base64ToBytes(mediaKeyB64), type);
  const body = encrypted.slice(0, encrypted.length - 10);
  const mac = encrypted.slice(encrypted.length - 10);

  const hmacKey = await crypto.subtle.importKey("raw", macKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, new Uint8Array(concat(iv, body))));
  for (let i = 0; i < 10; i++) if (signed[i] !== mac[i]) return null;

  try {
    const aesKey = await crypto.subtle.importKey("raw", cipherKey, "AES-CBC", false, ["decrypt"]);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, new Uint8Array(body)));
  } catch {
    return null;
  }
}

/** Inverso (usado só nos testes, para gerar um arquivo igual ao do WhatsApp) */
export async function encryptWhatsAppMedia(plain: Uint8Array, mediaKeyB64: string, type: WaMediaType): Promise<Uint8Array> {
  const { iv, cipherKey, macKey } = await expandKeys(base64ToBytes(mediaKeyB64), type);
  const aesKey = await crypto.subtle.importKey("raw", cipherKey, "AES-CBC", false, ["encrypt"]);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesKey, new Uint8Array(plain)));
  const hmacKey = await crypto.subtle.importKey("raw", macKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, new Uint8Array(concat(iv, body))));
  return concat(body, signed.slice(0, 10));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
