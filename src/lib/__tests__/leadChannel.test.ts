import { describe, it, expect } from "vitest";
import { leadChannel, leadChannelLabel, buildChannelBreakdown } from "@/lib/leadChannel";

describe("leadChannel", () => {
  it("prioritizes the recorded origin over the campaign", () => {
    expect(leadChannel({ origem: "mesa", campaign_id: "castelo-institucional" })).toBe("mesa");
    expect(leadChannel({ origem: "mesa", campaign_id: "whatsapp-bot" })).toBe("mesa");
  });

  it("classifies landing page chat leads as site", () => {
    expect(leadChannel({ campaign_id: "castelo-institucional" })).toBe("site");
    expect(leadChannel({ campaign_id: "lp-lead" })).toBe("site");
  });

  it("classifies every WhatsApp entry point as whatsapp", () => {
    for (const c of ["whatsapp-bot", "whatsapp-chat", "whatsapp-bot-cliente", "flow-builder", "ai-agent"]) {
      expect(leadChannel({ campaign_id: c })).toBe("whatsapp");
    }
  });

  it("classifies team-created leads as manual", () => {
    expect(leadChannel({ campaign_id: "manual" })).toBe("manual");
    expect(leadChannel({ campaign_id: "00000000-0000-0000-0000-000000000000" })).toBe("manual");
  });

  it("puts campaigns, imports and unknown sources in outros", () => {
    expect(leadChannel({ campaign_id: "importado" })).toBe("outros");
    expect(leadChannel({ campaign_id: "3f1c2a9e-1111-4a2b-9c3d-000000000abc" })).toBe("outros");
    expect(leadChannel({ campaign_id: null })).toBe("outros");
  });
});

describe("leadChannelLabel", () => {
  it("uses friendly names and capitalizes new origins", () => {
    expect(leadChannelLabel("mesa")).toBe("QR da mesa");
    expect(leadChannelLabel("whatsapp")).toBe("WhatsApp direto");
    expect(leadChannelLabel("instagram")).toBe("Instagram");
  });
});

describe("buildChannelBreakdown", () => {
  it("counts leads and closings per channel, largest first", () => {
    const rows = buildChannelBreakdown([
      { campaign_id: "castelo-institucional", status: "fechado" },
      { campaign_id: "castelo-institucional", status: "novo" },
      { campaign_id: "castelo-institucional", status: "novo" },
      { origem: "mesa", campaign_id: "castelo-institucional", status: "fechado" },
      { campaign_id: "whatsapp-bot", status: "novo" },
    ]);
    expect(rows.map(r => r.channel)).toEqual(["site", "mesa", "whatsapp"]);
    const site = rows[0];
    expect(site.count).toBe(3);
    expect(site.closed).toBe(1);
    expect(site.pct).toBeCloseTo(60);
    expect(site.conversion).toBeCloseTo(33.33, 1);
    expect(rows[1]).toMatchObject({ label: "QR da mesa", count: 1, closed: 1, conversion: 100 });
  });

  it("returns no rows when there are no leads", () => {
    expect(buildChannelBreakdown([])).toEqual([]);
  });
});
