import { describe, it, expect } from "vitest";
import {
  countByStatus, formatMinutes, isIdle, parseHubDashboard, percentDelta, pointsDelta, sumTotals,
} from "../hubDashboardMetrics";

const rpcResponse = {
  companies_all: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
  companies: [
    {
      id: "a", name: "A", logo_url: null, whatsapp_status: "connected", whatsapp_phone: "5511",
      leads: 10, leads_today: 2, leads_new: 3, leads_lost: 1, last_lead_at: "2026-10-22T10:00:00Z",
      closed: 2, conversations: 8, active_conversations: 5, follow_ups: 4,
      msgs_sent: 100, msgs_received: 50, response_median_minutes: 12.5, response_samples: 7,
    },
    {
      id: "b", name: "B", logo_url: null, whatsapp_status: "weird", whatsapp_phone: null,
      leads: 0, leads_today: 0, leads_new: 0, leads_lost: 0, last_lead_at: null,
      closed: 0, conversations: 0, active_conversations: 0, follow_ups: 0,
      msgs_sent: 3, msgs_received: 0, response_median_minutes: null, response_samples: 0,
    },
  ],
  previous: { leads: 8, closed: "1" },
  response: { median_minutes: 9, samples: 7 },
  lead_buckets: [
    { company_id: "a", month: "2026-09", status: "novo", count: 2 },
    { company_id: "a", month: "2026-10", status: "novo", count: 1 },
    { company_id: "a", month: "2026-10", status: "fechado", count: 7 },
  ],
};

describe("parseHubDashboard", () => {
  it("maps the database response", () => {
    const data = parseHubDashboard(rpcResponse);
    expect(data.companiesAll).toHaveLength(2);
    expect(data.companies[0]).toMatchObject({
      companyId: "a", totalLeads: 10, leadsClosed: 2, messagesSent: 100, responseMedianMinutes: 12.5, followUps: 4,
    });
    expect(data.companies[1].whatsappStatus).toBe("unknown");
    expect(data.companies[1].responseMedianMinutes).toBeNull();
    expect(data.previous).toEqual({ leads: 8, closed: 1 });
    expect(data.response).toEqual({ medianMinutes: 9, samples: 7 });
    expect(data.leadBuckets[2]).toEqual({ companyId: "a", month: "2026-10", status: "fechado", count: 7 });
  });

  it("survives an empty response", () => {
    const data = parseHubDashboard(null);
    expect(data.companies).toEqual([]);
    expect(data.response.medianMinutes).toBeNull();
  });
});

describe("totals and grouping", () => {
  const data = parseHubDashboard(rpcResponse);
  it("sums companies", () => {
    expect(sumTotals(data.companies)).toMatchObject({ leads: 10, closed: 2, messagesSent: 103, followUps: 4 });
  });
  it("counts leads by status", () => {
    expect(countByStatus(data.leadBuckets)).toEqual({ novo: 3, fechado: 7 });
  });
  it("flags companies with no movement", () => {
    expect(isIdle(data.companies[0])).toBe(false);
    expect(isIdle(data.companies[1])).toBe(true);
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

describe("formatMinutes", () => {
  it("picks a readable unit", () => {
    expect(formatMinutes(0.2)).toBe("< 1min");
    expect(formatMinutes(14)).toBe("14min");
    expect(formatMinutes(90)).toBe("1,5h");
    expect(formatMinutes(2880)).toBe("2,0d");
  });
});
