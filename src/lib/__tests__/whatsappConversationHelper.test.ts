import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { getBrazilianPhoneVariants } from "../whatsappConversationHelper";

describe("getBrazilianPhoneVariants", () => {
  it("acha a conversa guardada sem o 9 a partir do lead com o 9", () => {
    const v = getBrazilianPhoneVariants("15996181147");
    expect(v).toContain("5515996181147");
    expect(v).toContain("551596181147");
  });

  it("acha a conversa guardada com o 9 a partir do número sem o 9", () => {
    const v = getBrazilianPhoneVariants("551596181147");
    expect(v).toContain("5515996181147");
  });
});
