import { describe, expect, it } from "vitest";
import { aiConversationState, dismissAiHandoff, friendlyLastMessage, openAiHandoff, teamRepliedSince } from "../aiConversation";

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

  const now = Date.parse("2026-10-10T12:00:00Z");

  it("openAiHandoff: em aberto, atrasada (alerta disparado) ou já respondida", () => {
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z" }), now)).toEqual({ at: "2026-10-09T00:39:00Z", late: false });
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z", alerted_at: "2026-10-09T12:12:00Z" }), now)?.late).toBe(true);
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z", alerted_at: "respondido" }), now)).toBeNull();
    expect(openAiHandoff({ bot_step: "ai_agent", bot_enabled: true, bot_data: { ai_agent: "on" } }, now)).toBeNull();
  });

  it("openAiHandoff: some com 'Não precisa responder' e depois de 3 dias", () => {
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z", dismissed_at: "2026-10-09T10:00:00Z" }), now)).toBeNull();
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z" }), Date.parse("2026-10-12T00:00:00Z"))).not.toBeNull();
    expect(openAiHandoff(handedOff({ at: "2026-10-09T00:39:00Z" }), Date.parse("2026-10-12T01:00:00Z"))).toBeNull();
  });

  it("dismissAiHandoff: marca a passagem e cala o alerta do servidor", () => {
    const bd = dismissAiHandoff({ ai_agent: "on", ai_handoff: { at: "2026-10-09T00:39:00Z" } }, "2026-10-09T10:00:00Z");
    expect(bd).toEqual({ ai_agent: "on", ai_handoff: { at: "2026-10-09T00:39:00Z", dismissed_at: "2026-10-09T10:00:00Z", alerted_at: "respondido" } });
    const late = dismissAiHandoff({ ai_handoff: { at: "x", alerted_at: "2026-10-09T12:12:00Z" } }, "y");
    expect((late.ai_handoff as Record<string, unknown>).alerted_at).toBe("2026-10-09T12:12:00Z");
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
