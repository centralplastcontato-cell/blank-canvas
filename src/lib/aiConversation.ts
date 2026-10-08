// Situação da IA numa conversa da Central (ícone roxo na lista e filtros "IA")
export type AiConversationState = "atendendo" | "equipe" | "participou";

interface AiConvLike {
  bot_step?: string | null;
  bot_enabled?: boolean | null;
  bot_data?: unknown;
}

/**
 * null: a IA nunca atendeu esta conversa.
 * atendendo: a IA está respondendo agora.
 * equipe: a IA passou a conversa para a equipe.
 * participou: a IA atendeu antes e a equipe assumiu (botão Assumir).
 */
export function aiConversationState(conv: AiConvLike): AiConversationState | null {
  const bd = (conv.bot_data && typeof conv.bot_data === "object" ? conv.bot_data : {}) as Record<string, unknown>;
  if (bd.ai_agent !== "on") return null;
  if (conv.bot_step === "ai_agent" && conv.bot_enabled !== false) return "atendendo";
  if (conv.bot_step === "human_takeover" && bd.ai_handoff) return "equipe";
  return "participou";
}

export const AI_STATE_LABEL: Record<AiConversationState, string> = {
  atendendo: "IA atendendo",
  equipe: "A IA passou para a equipe",
  participou: "A IA atendeu antes; agora está com a equipe",
};
