// Vídeo (Reels) postado à mão no painel do Hub → Instagram: confere os dados antes de criar o post.
// Limites do Postaí/Instagram: legenda + hashtags até 2.200 caracteres e 30 hashtags.

export type DadosReels = { video?: unknown; capa?: unknown; legenda?: unknown; hashtags?: unknown; horario?: unknown; titulo?: unknown };
export type ReelsOk = { video: string; capa: string | null; legenda: string; hashtags: string; vaga: Date; titulo: string };

const ehLink = (v: unknown): v is string => typeof v === "string" && /^https:\/\/\S+$/.test(v.trim());

/** `minimo`: horário mais cedo aceito (o Postaí recusa horário no passado). */
export function validaReels(d: DadosReels, minimo: number): ReelsOk | { erro: string } {
  if (!ehLink(d.video)) return { erro: "Escolha o vídeo (link https)." };
  if (d.capa != null && d.capa !== "" && !ehLink(d.capa)) return { erro: "A capa precisa ser um link https." };
  const legenda = String(d.legenda ?? "").trim().slice(0, 2200);
  const hashtags = String(d.hashtags ?? "").trim().slice(0, 600);
  if (!legenda) return { erro: "Escreva a legenda." };
  if ((legenda + " " + hashtags).length > 2200) return { erro: "Legenda + hashtags passam de 2.200 caracteres." };
  if ((legenda.match(/#/g) || []).length + (hashtags.match(/#/g) || []).length > 30) return { erro: "O Instagram aceita no máximo 30 hashtags." };
  const vaga = new Date(String(d.horario ?? ""));
  if (Number.isNaN(vaga.getTime())) return { erro: "Escolha a data e a hora da publicação." };
  if (vaga.getTime() < minimo) return { erro: "Escolha um horário com pelo menos 15 minutos de folga." };
  vaga.setUTCSeconds(0, 0);
  const titulo = String(d.titulo ?? "").trim().slice(0, 120) || "Vídeo";
  return { video: String(d.video).trim(), capa: d.capa ? String(d.capa).trim() : null, legenda, hashtags, vaga, titulo };
}
