import { describe, it, expect } from "vitest";
import {
  buildPeriodMetrics, computePreviousRange, formatMinutes, inRange, median, percentDelta, pointsDelta,
} from "../hubDashboardMetrics";

describe("computePreviousRange", () => {
  it("returns the window of the same length right before", () => {
    const range = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-31T00:00:00Z") };
    const prev = computePreviousRange(range);
    expect(prev.to.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(prev.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("inRange", () => {
  it("includes both ends", () => {
    const range = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-02T00:00:00Z") };
    expect(inRange("2026-10-01T00:00:00.000Z", range)).toBe(true);
    expect(inRange("2026-10-02T00:00:00.000Z", range)).toBe(true);
    expect(inRange("2026-10-02T00:00:01.000Z", range)).toBe(false);
  });
});

describe("percentDelta", () => {
  it("has no comparison when the previous period is zero", () => {
    expect(percentDelta(10, 0)).toBeNull();
  });
  it("formats growth, drop and flat", () => {
    expect(percentDelta(120, 100)).toEqual({ label: "+20%", direction: "up" });
    expect(percentDelta(75, 100)).toEqual({ label: "-25%", direction: "down" });
    expect(percentDelta(100, 100)).toEqual({ label: "0%", direction: "flat" });
  });
});

describe("pointsDelta", () => {
  it("formats percentage points with a comma", () => {
    expect(pointsDelta(6.6, 5.2)).toEqual({ label: "+1,4 p.p.", direction: "up" });
    expect(pointsDelta(4, 5.2)).toEqual({ label: "−1,2 p.p.", direction: "down" });
    expect(pointsDelta(5.2, 5.2).direction).toBe("flat");
  });
});

describe("median", () => {
  it("handles empty, odd and even lists", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
});

describe("formatMinutes", () => {
  it("picks a readable unit", () => {
    expect(formatMinutes(0.2)).toBe("< 1min");
    expect(formatMinutes(14)).toBe("14min");
    expect(formatMinutes(90)).toBe("1,5h");
    expect(formatMinutes(2880)).toBe("2,0d");
  });
});

describe("buildPeriodMetrics", () => {
  it("counts each company only from the rows it receives", () => {
    const [a, b] = buildPeriodMetrics({
      companies: [
        { id: "a", name: "A", logoUrl: null, whatsappStatus: "connected", whatsappPhone: null },
        { id: "b", name: "B", logoUrl: null, whatsappStatus: "unknown", whatsappPhone: null },
      ],
      leads: [
        { company_id: "a", status: "novo", created_at: "2026-10-22T10:00:00.000Z" },
        { company_id: "a", status: "perdido", created_at: "2026-10-01T10:00:00.000Z" },
        { company_id: "b", status: "novo", created_at: "2026-10-05T10:00:00.000Z" },
      ],
      convos: [{ company_id: "a", is_closed: false }, { company_id: "a", is_closed: true }],
      followUps: [{ company_id: "b" }],
      closedEvents: [{ company_id: "a" }],
      responseSamples: [{ company_id: "a", minutes: 4 }, { company_id: "a", minutes: 10 }],
      todayISO: "2026-10-22T03:00:00.000Z",
    });

    expect(a).toMatchObject({
      totalLeads: 2, leadsToday: 1, leadsNew: 1, leadsLost: 1, leadsClosed: 1,
      totalConversations: 2, activeConversations: 1, followUps: 0, responseMedianMinutes: 7,
      lastLeadAt: "2026-10-22T10:00:00.000Z",
    });
    expect(b).toMatchObject({ totalLeads: 1, followUps: 1, leadsClosed: 0, responseMedianMinutes: null });
  });
});
