// Reações do WhatsApp (o cliente segura uma mensagem e toca num emoji).
//
// Chegam como uma mensagem "[Reação] ❤️" que aponta (quoted_message_id) para a
// mensagem que recebeu a reação. Na conversa, em vez de um balão separado, o
// emoji aparece pequeno embaixo da mensagem, como no WhatsApp.
// Reação sem a mensagem de destino carregada (ou antiga, sem o destino gravado)
// continua aparecendo como balão.

const REACTION_RE = /^\[Reação\]\s*/;

export interface ReactionSource {
  id: string;
  content: string | null;
  from_me: boolean;
  quoted_message_id?: string | null;
  metadata?: unknown;
}

export interface MessageReaction {
  emoji: string;
  fromMe: boolean;
  /** Nome de quem reagiu em grupo (quando o WhatsApp informa) */
  senderName?: string | null;
}

export const isReactionContent = (content: string | null | undefined) => !!content && REACTION_RE.test(content);

export function groupReactions<T extends ReactionSource>(messages: T[]): {
  reactionsByMessage: Map<string, MessageReaction[]>;
  hiddenIds: Set<string>;
} {
  const ids = new Set(messages.map((m) => m.id));
  // destino → quem reagiu → reação (a mais recente de cada pessoa vale, como no WhatsApp)
  const byTarget = new Map<string, Map<string, MessageReaction>>();
  const hiddenIds = new Set<string>();

  for (const m of messages) {
    const target = m.quoted_message_id;
    if (!isReactionContent(m.content) || !target || !ids.has(target)) continue;
    const meta = (m.metadata && typeof m.metadata === 'object' ? m.metadata : {}) as Record<string, unknown>;
    const participant = typeof meta.participant === 'string' ? meta.participant : '';
    const sender = m.from_me ? 'me' : participant || 'contact';
    const emoji = (m.content || '').replace(REACTION_RE, '').trim();
    hiddenIds.add(m.id);
    const reactions = byTarget.get(target) || new Map<string, MessageReaction>();
    if (emoji) {
      reactions.set(sender, {
        emoji,
        fromMe: m.from_me,
        senderName: typeof meta.sender_name === 'string' ? meta.sender_name : null,
      });
    } else {
      reactions.delete(sender); // reação removida
    }
    byTarget.set(target, reactions);
  }

  const reactionsByMessage = new Map<string, MessageReaction[]>();
  for (const [target, reactions] of byTarget) {
    if (reactions.size > 0) reactionsByMessage.set(target, [...reactions.values()]);
  }
  return { reactionsByMessage, hiddenIds };
}
