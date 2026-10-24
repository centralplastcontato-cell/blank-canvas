import { describe, expect, it } from "vitest";
import { bestVariation, groupFunnel } from "@/hooks/useCampaignResults";

describe("funil das campanhas", () => {
  it("soma as mensagens de cada campanha", () => {
    const out = groupFunnel([
      { campaign_id: "a", variation_index: 1, sent: 10, replied: 3, visited: 1, closed: 1 },
      { campaign_id: "a", variation_index: 0, sent: 12, replied: 1, visited: 0, closed: 0 },
      { campaign_id: "b", variation_index: 0, sent: 5, replied: 0, visited: 0, closed: 0 },
    ]);
    expect(out.a).toEqual({
      sent: 22, replied: 4, visited: 1, closed: 1,
      variations: [{ index: 0, sent: 12, replied: 1 }, { index: 1, sent: 10, replied: 3 }],
    });
    expect(out.b.sent).toBe(5);
  });

  it("só aponta a melhor mensagem quando dá para comparar", () => {
    expect(bestVariation([{ index: 0, sent: 12, replied: 1 }, { index: 1, sent: 10, replied: 3 }])).toBe(1);
    expect(bestVariation([{ index: 0, sent: 12, replied: 1 }, { index: 1, sent: 4, replied: 3 }])).toBe(null);
    expect(bestVariation([{ index: 0, sent: 10, replied: 2 }, { index: 1, sent: 10, replied: 2 }])).toBe(null);
    expect(bestVariation(undefined)).toBe(null);
  });
});
