// ============= ÁUDIO E FOTO PARA A IA (BETA) =============
// A IA conversa por texto. Áudio do cliente vira texto (transcrição) e foto
// vira uma descrição curta — os dois feitos pela OpenAI, qualquer que seja o
// modelo de conversa escolhido. O resultado fica salvo na própria mensagem
// (wapi_messages.metadata.ai_media_text), então cada mídia é processada uma
// vez só, mesmo aparecendo de novo no histórico das próximas respostas.

// deno-lint-ignore-file no-explicit-any
import {
  estimateChatCostUsd,
  estimateTranscriptionCostUsd,
  normalizeOpenAiUsage,
  TRANSCRIBE_MODEL,
  VISION_MODEL,
} from "../_shared/ai-models.ts";

const MAX_MEDIA_BYTES = 20 * 1024 * 1024; // limite da transcrição da OpenAI é 25 MB

export interface MediaResult {
  text: string;
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

export async function fetchMediaBytes(url: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; mime: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.error(`[AI Media] download falhou (${res.status})`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_MEDIA_BYTES) {
      console.error(`[AI Media] tamanho fora do limite: ${buf.byteLength} bytes`);
      return null;
    }
    const mime = (res.headers.get("content-type") || "").split(";")[0].trim();
    return { bytes: buf, mime };
  } catch (err) {
    console.error("[AI Media] erro no download:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function audioFileName(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("mpeg") || m.includes("mp3")) return "audio.mp3";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "audio.m4a";
  if (m.includes("wav")) return "audio.wav";
  if (m.includes("webm")) return "audio.webm";
  // WhatsApp manda nota de voz em ogg/opus
  return "audio.ogg";
}

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 32768;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

export async function transcribeAudio(openaiKey: string, bytes: Uint8Array<ArrayBuffer>, mime: string): Promise<MediaResult | null> {
  const type = mime && mime.startsWith("audio/") ? mime : "audio/ogg";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), audioFileName(type));
  form.append("model", TRANSCRIBE_MODEL);
  form.append("language", "pt");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.error(`[AI Media] transcrição falhou (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const json = await res.json() as any;
  const text = String(json?.text || "").trim();
  if (!text) return null;
  const usage = json?.usage || {};
  const audioTokens = Number(usage?.input_token_details?.audio_tokens ?? usage?.input_tokens) || 0;
  const textOutputTokens = Number(usage?.output_tokens) || 0;
  return {
    text,
    model: TRANSCRIBE_MODEL,
    costUsd: estimateTranscriptionCostUsd({ audioTokens, textOutputTokens, seconds: Number(usage?.seconds) || 0 }),
    inputTokens: audioTokens,
    outputTokens: textOutputTokens,
  };
}

export async function describeImage(openaiKey: string, bytes: Uint8Array, mime: string): Promise<MediaResult | null> {
  const type = mime && mime.startsWith("image/") ? mime : "image/jpeg";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 200,
      temperature: 0.2,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "Um cliente mandou esta foto para um buffet infantil pelo WhatsApp. Descreva em português, em no máximo 2 frases, o que aparece. Se tiver texto legível (convite, print de conversa, tema, data, valores), transcreva o essencial.",
          },
          { type: "image_url", image_url: { url: `data:${type};base64,${toBase64(bytes)}`, detail: "low" } },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error(`[AI Media] descrição da foto falhou (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const json = await res.json() as any;
  const text = String(json?.choices?.[0]?.message?.content || "").trim();
  if (!text) return null;
  const usage = normalizeOpenAiUsage(json?.usage);
  return {
    text,
    model: VISION_MODEL,
    costUsd: estimateChatCostUsd(VISION_MODEL, usage),
    inputTokens: usage.inputTokens + usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
  };
}

// Como a mídia aparece para a IA no histórico da conversa.
export function mediaHistoryText(messageType: string, caption: string, aiMediaText: string | null | undefined): string {
  const cap = (caption || "").trim();
  const isPlaceholder = /^\[(áudio|audio|imagem|image)\]$/i.test(cap);
  const captionPart = cap && !isPlaceholder ? ` Legenda: ${cap}` : "";
  if (messageType === "audio") {
    return aiMediaText
      ? `[Áudio do cliente, transcrito]: ${aiMediaText}`
      : "[O cliente mandou um áudio que não foi possível ouvir]";
  }
  if (messageType === "image") {
    return aiMediaText
      ? `[Foto enviada pelo cliente — o que aparece: ${aiMediaText}]${captionPart}`
      : `[O cliente mandou uma foto que não foi possível ver]${captionPart}`;
  }
  return `[${messageType}] ${cap}`.trim();
}
