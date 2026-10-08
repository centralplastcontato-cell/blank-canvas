import { describe, expect, it } from "vitest";
import { aiConversationState } from "../aiConversation";

describe("situação da IA na conversa", () => {
  it("sem IA: nada", () => {
    expect(aiConversationState({ bot_step: "welcome", bot_enabled: true, bot_data: {} })).toBeNull();
    expect(aiConversationState({ bot_step: "ai_agent", bot_enabled: true, bot_data: { ai_agent: "off" } })).toBeNull();
    expect(aiConversationState({ bot_step: null, bot_data: null })).toBeNull();
  });
  it("IA atendendo, passou para a equipe ou equipe assumiu", () => {
    expect(aiConversationState({ bot_step: "ai_agent", bot_enabled: true, bot_data: { ai_agent: "on" } })).toBe("atendendo");
    expect(aiConversationState({ bot_step: "human_takeover", bot_enabled: false, bot_data: { ai_agent: "on", ai_handoff: { at: "x" } } })).toBe("equipe");
    expect(aiConversationState({ bot_step: "ai_agent", bot_enabled: false, bot_data: { ai_agent: "on" } })).toBe("participou");
    expect(aiConversationState({ bot_step: "human_takeover", bot_enabled: false, bot_data: { ai_agent: "on" } })).toBe("participou");
  });
});
