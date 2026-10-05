import { describe, expect, it } from "vitest";
import { hasLeadUtm, leadUtmShortLabel } from "../LeadUtm";

describe("UTMs do lead", () => {
  it("rótulo curto com fonte e campanha", () => {
    expect(leadUtmShortLabel({ utm_source: "meta", utm_campaign: "Mês das Crianças", utm_content: "Conj 1" })).toBe("meta · Mês das Crianças");
    expect(leadUtmShortLabel({ utm_content: "Conj 1" })).toBe("Conj 1");
  });

  it("sem UTM não mostra nada", () => {
    expect(hasLeadUtm({})).toBe(false);
    expect(hasLeadUtm({ utm_medium: "pago" })).toBe(false);
    expect(hasLeadUtm({ utm_source: "meta" })).toBe(true);
  });
});
