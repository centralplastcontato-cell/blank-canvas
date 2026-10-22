import { describe, it, expect } from "vitest";
import { buildAlerts, parseHubHealth } from "../hubAlerts";

const now = new Date("2026-10-22T03:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

// Formato devolvido por hub_health (dados próximos dos reais de 22/10)
const raw = [
  { id: "c", name: "Castelo", whatsapp_status: "connected", last_lead_at: hoursAgo(3), leads_7d: 47, leads_prev_7d: 92, leads_30d: 315, response_median_minutes: 1046, response_samples: 20, waiting: 22, oldest_waiting_at: hoursAgo(134) },
  { id: "p", name: "Planeta", whatsapp_status: "connected", last_lead_at: hoursAgo(5), leads_7d: 37, leads_prev_7d: 21, leads_30d: 121, response_median_minutes: 2.3, response_samples: 28, waiting: 7, oldest_waiting_at: hoursAgo(152) },
  { id: "m", name: "Mega", whatsapp_status: "connected", last_lead_at: hoursAgo(1), leads_7d: 38, leads_prev_7d: 34, leads_30d: 190, response_median_minutes: 1.5, response_samples: 27, waiting: 1, oldest_waiting_at: hoursAgo(40) },
  { id: "t", name: "Buffet teste", whatsapp_status: "disconnected", last_lead_at: null, leads_7d: 0, leads_prev_7d: 0, leads_30d: 0, response_median_minutes: null, response_samples: 0, waiting: 0, oldest_waiting_at: null },
  { id: "q", name: "Quieto", whatsapp_status: "disconnected", last_lead_at: hoursAgo(24 * 5), leads_7d: 0, leads_prev_7d: 4, leads_30d: 12, response_median_minutes: 200, response_samples: 2, waiting: 0, oldest_waiting_at: null },
];

describe("buildAlerts", () => {
  const alerts = buildAlerts(parseHubHealth(raw), now);
  const ids = alerts.map(a => a.id);

  it("flags the real problems and puts urgent ones first", () => {
    expect(ids).toEqual([
      "c:waiting", "c:response", "q:whatsapp",
      "c:drop", "p:waiting", "q:no-leads",
    ]);
    expect(alerts.find(a => a.id === "c:drop")?.title).toBe("Leads caíram 49% na semana");
    expect(alerts.find(a => a.id === "p:waiting")).toMatchObject({ severity: "warning", title: "7 clientes esperando resposta" });
    expect(alerts.find(a => a.id === "p:waiting")?.detail).toContain("6 dias");
    expect(alerts.find(a => a.id === "c:response")?.title).toBe("Equipe demora 17,4h para responder");
  });

  it("ignores test/idle units and small samples", () => {
    expect(ids.some(id => id.startsWith("t:") || id.startsWith("m:"))).toBe(false);
    expect(ids).not.toContain("q:response"); // só 2 conversas
  });

  it("returns nothing when all is fine", () => {
    expect(buildAlerts(parseHubHealth([raw[2]]), now)).toEqual([]);
    expect(buildAlerts(parseHubHealth(null), now)).toEqual([]);
  });
});
