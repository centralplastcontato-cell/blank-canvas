// "Retomar com a IA agora" (botão na conversa): a IA volta e escreve na hora,
// sem esperar mensagem nova do cliente, continuando de onde a conversa parou.
// Caso que originou (Juliana Siqueira, VENDAS 2, 24/10): a IA disse "vou te
// mostrar o nosso espaço", o envio foi segurado, ela passou para a equipe e as
// fotos, o vídeo e o PDF nunca saíram.

// Depois disso sem resposta nossa, a IA abre pedindo desculpas pela demora
export const RESUME_APOLOGY_AFTER_MS = 60 * 60 * 1000;
// Dois cliques seguidos não disparam duas retomadas
export const RESUME_COOLDOWN_MS = 60 * 1000;

// Mensagem que entra no lugar da "mensagem do cliente" quando ele não escreveu
export const RESUME_TRIGGER_TEXT = "[Sistema] Retome a conversa com o cliente agora.";

export interface ResumeContext {
  /** Tempo desde a última mensagem da conversa (nossa ou do cliente) */
  gapMs: number;
  /** O cliente escreveu depois da nossa última mensagem */
  clientWaiting: boolean;
  /** Fotos, vídeo e PDF vão logo depois desta resposta */
  materialsPending: boolean;
}

export function resumeNote(ctx: ResumeContext): string {
  const parts = [
    "a equipe pediu para você RETOMAR esta conversa agora. Você não está respondendo a uma mensagem nova: continue de onde a conversa parou, como se nada tivesse acontecido.",
    "Não se apresente de novo e não repita o que já foi dito (nome, data, convidados, diferenciais).",
    "Se a sua última mensagem disse que alguém da equipe ia continuar, não explique nem fale de equipe, sistema ou falha: só siga a conversa.",
  ];
  if (ctx.clientWaiting) parts.push("O cliente mandou mensagem depois da sua última resposta: responda a ela primeiro.");
  if (ctx.gapMs >= RESUME_APOLOGY_AFTER_MS) parts.push('Faz um tempo desde a última mensagem: comece com um pedido de desculpas curto e leve pela demora (ex.: "Desculpa a demora 😊").');
  if (ctx.materialsPending) parts.push("As fotos do espaço, o vídeo e o PDF ainda NÃO foram enviados a este cliente: siga o aviso de MATERIAIS NESTE TURNO.");
  return parts.join(" ");
}

/** Já tem uma retomada em andamento (clique duplo)? */
export function resumeTooSoon(lastResumeAt: unknown, nowMs: number): boolean {
  return typeof lastResumeAt === "string" && nowMs - Date.parse(lastResumeAt) < RESUME_COOLDOWN_MS;
}
