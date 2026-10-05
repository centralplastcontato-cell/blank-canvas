import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { audioFileName, mediaHistoryText } from "./ai-media.ts";

Deno.test("mediaHistoryText: áudio transcrito chega para a IA como texto", () => {
  assertEquals(
    mediaHistoryText("audio", "[Áudio]", "Oi, queria saber se tem data em novembro"),
    "[Áudio do cliente, transcrito]: Oi, queria saber se tem data em novembro",
  );
  assertEquals(mediaHistoryText("audio", "[Áudio]", null), "[O cliente mandou um áudio que não foi possível ouvir]");
});

Deno.test("mediaHistoryText: foto com descrição e legenda (placeholder não vira legenda)", () => {
  assertEquals(
    mediaHistoryText("image", "Esse tema", "Convite de aniversário tema Stitch, 5 anos"),
    "[Foto enviada pelo cliente — o que aparece: Convite de aniversário tema Stitch, 5 anos] Legenda: Esse tema",
  );
  assertEquals(
    mediaHistoryText("image", "[Imagem]", null),
    "[O cliente mandou uma foto que não foi possível ver]",
  );
});

Deno.test("audioFileName: extensão certa para a transcrição aceitar", () => {
  assertEquals(audioFileName("audio/ogg"), "audio.ogg");
  assertEquals(audioFileName(""), "audio.ogg");
  assertEquals(audioFileName("audio/mpeg"), "audio.mp3");
  assertEquals(audioFileName("audio/mp4"), "audio.m4a");
});
