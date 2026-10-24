import { assertEquals } from "jsr:@std/assert@1";
import { validaReels } from "./reels.ts";

const agora = Date.parse("2026-10-24T12:00:00Z");
const base = { video: "https://hubcelebrei.com.br/videos/x.mp4", legenda: "Oi", hashtags: "#buffet", horario: "2026-10-24T22:00:00Z" };

Deno.test("reels: dados certos viram o post", () => {
  const r = validaReels({ ...base, capa: "https://hubcelebrei.com.br/videos/x.jpg", titulo: "Venda" }, agora);
  if ("erro" in r) throw new Error(r.erro);
  assertEquals(r.capa, "https://hubcelebrei.com.br/videos/x.jpg");
  assertEquals(r.vaga.toISOString(), "2026-10-24T22:00:00.000Z");
  assertEquals(r.titulo, "Venda");
});

Deno.test("reels: recusa vídeo sem link, horário passado e hashtags demais", () => {
  assertEquals("erro" in validaReels({ ...base, video: "arquivo.mp4" }, agora), true);
  assertEquals("erro" in validaReels({ ...base, horario: "2026-10-24T11:00:00Z" }, agora), true);
  assertEquals("erro" in validaReels({ ...base, hashtags: Array.from({ length: 31 }, (_, i) => `#h${i}`).join(" ") }, agora), true);
  assertEquals("erro" in validaReels({ ...base, legenda: "" }, agora), true);
});
