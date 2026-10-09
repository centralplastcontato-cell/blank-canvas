// Depois que um número reconecta, o WhatsApp reenvia mensagens antigas e a
// plataforma segura a automação por alguns minutos nas conversas que já
// existiam. Mas uma resposta NOVA a uma pergunta que o robô acabou de fazer
// não é reenvio: precisa ser respondida (caso Evelin, VENDAS 2, 30/09 — o
// cliente respondeu "1" e o robô ficou parado para sempre na pergunta).

export const LIVE_REPLY_MAX_MINUTES = 60;

const STEPS_WAITING_ANSWER = [
  'welcome', 'tipo', 'nome', 'mes', 'dia', 'convidados', 'proximo_passo', 'proximo_passo_reminded',
  // Conversa com a IA: mensagem nova depois da última fala dela é conversa ao
  // vivo (caso "Ok obrigado" sem resposta, VENDAS 2, 09/10)
  'ai_agent',
];

export interface LiveReplyInput {
  fromMe: boolean;
  botEnabled: boolean | null | undefined;
  botStep: string | null | undefined;
  lastBotMessageAt: string | null | undefined;
  incomingAt: string;
  now: number;
}

export function isLiveReplyToBotQuestion(input: LiveReplyInput): boolean {
  if (input.fromMe || input.botEnabled !== true) return false;
  if (!STEPS_WAITING_ANSWER.includes(input.botStep || '')) return false;
  if (!input.lastBotMessageAt) return false;
  const botAt = new Date(input.lastBotMessageAt).getTime();
  const msgAt = new Date(input.incomingAt).getTime();
  if (!Number.isFinite(botAt) || !Number.isFinite(msgAt)) return false;
  // Pergunta recente e resposta posterior a ela: é conversa ao vivo.
  return msgAt >= botAt && input.now - botAt <= LIVE_REPLY_MAX_MINUTES * 60 * 1000;
}
