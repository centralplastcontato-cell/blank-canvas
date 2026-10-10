// "Não lida" de verdade: a conversa conta como não lida só quando o cliente mandou a
// última mensagem. Quando a equipe responde pelo celular, o contador do sistema não
// zera; antes essas conversas ficavam "não lidas" para sempre (no Planeta eram 801
// de 1.131). A IA marca 99 quando passa a conversa para a equipe: essa sempre conta.
export const AI_HANDOFF_UNREAD = 99;

export interface UnreadLike {
  unread_count?: number | null;
  last_message_from_me?: boolean | null;
}

export function isAwaitingRead(c: UnreadLike): boolean {
  const n = c.unread_count || 0;
  if (n <= 0) return false;
  return !c.last_message_from_me || n >= AI_HANDOFF_UNREAD;
}

/** Filtro do banco com a mesma regra (somar com .gt("unread_count", 0)) */
export const AWAITING_READ_OR_FILTER = `last_message_from_me.is.false,last_message_from_me.is.null,unread_count.gte.${AI_HANDOFF_UNREAD}`;
