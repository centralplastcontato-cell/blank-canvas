import { describe, expect, it } from "vitest";
import { aiConversationState, friendlyLastMessage, openAiHandoff, teamRepliedSince } from "../aiConversation";

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

describe("passagem da IA esperando a equipe", () => {
  const handedOff = (h: Record<string, unknown>) => ({ bot_step: "human_takeover", bot_enabled: false, bot_data: { ai_agent: "on", ai_handoff: h } });

  it("openAiHandoff: em aberto, atrasada (alerta disparado) ou já respondida", () => {
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z" }))).toEqual({ at: "2026-10-09T00:39:00Z", late: false });
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z", alerted_at: "2026-10-09T12:12:00Z" }))?.late).toBe(true);
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z", alerted_at: "respondido" }))).toBeNull();
    expect(openAiHandoff({ bot_step: "ai_agent", bot_enabled: true, bot_data: { ai_agent: "on" } })).toBeNull();
  });

  it("teamRepliedSince: só mensagem de gente da equipe conta", () => {
    const since = "2026-10-09T00:39:00Z";
    expect(teamRepliedSince([{ from_me: true, timestamp: "2026-10-09T12:20:00Z", metadata: { source: "platform" } }], since)).toBe(true);
    expect(teamRepliedSince([{ from_me: true, timestamp: "2026-10-09T12:20:00Z", metadata: null }], since)).toBe(true); // celular
    expect(teamRepliedSince([{ from_me: true, timestamp: "2026-10-09T01:00:00Z", metadata: { source: "ai_agent" } }], since)).toBe(false);
    expect(teamRepliedSince([{ from_me: true, timestamp: "2026-10-09T12:20:00Z", metadata: { source: "reaction" } }], since)).toBe(false);
    expect(teamRepliedSince([{ from_me: false, timestamp: "2026-10-09T12:20:00Z" }], since)).toBe(false);
  });

  it("friendlyLastMessage: reação na lista", () => {
    expect(friendlyLastMessage("[Reação] ❤️", true)).toBe("Você reagiu ❤️");
    expect(friendlyLastMessage("[Reação] 🙏", false)).toBe("Reagiu 🙏");
    expect(friendlyLastMessage("Oi", false)).toBe("Oi");
  });
});
