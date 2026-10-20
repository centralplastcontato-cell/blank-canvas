import { describe, expect, it } from "vitest";
import { senderDot } from "../messageSender";

describe("senderDot", () => {
  it("marca equipe, IA e celular; robô e cliente sem bolinha", () => {
    expect(senderDot({ from_me: true, metadata: { source: "platform" } })?.className).toBe("bg-yellow-400");
    expect(senderDot({ from_me: true, metadata: { source: "ai_agent" } })?.className).toBe("bg-purple-500");
    expect(senderDot({ from_me: true, metadata: { source: "bia" } })?.className).toBe("bg-purple-500");
    expect(senderDot({ from_me: true, metadata: { source: "phone" } })?.title).toBe("Enviado pelo celular do buffet");
    expect(senderDot({ from_me: true, metadata: { source: "auto_reminder", type: "follow_up_1" } })).toBeNull();
    expect(senderDot({ from_me: true, metadata: null })).toBeNull();
    expect(senderDot({ from_me: false, metadata: { source: "platform" } })).toBeNull();
  });
});
