import { describe, expect, it } from "vitest";
import { groupSilentAlerts } from "../SilentInstanceBanner";

describe("groupSilentAlerts", () => {
  it("junta os alertas de número mudo por unidade e usa o horário mais antigo", () => {
    const rows = [
      { id: "1", created_at: "2026-10-02T15:18:00Z", data: { unit: "VENDAS 1", webhook_silent: true, last_webhook_event_at: "2026-10-02T14:30:00Z" } },
      { id: "2", created_at: "2026-10-02T22:57:00Z", data: { unit: "VENDAS 1", webhook_silent: true, last_webhook_event_at: "2026-10-02T14:30:05Z" } },
      { id: "3", created_at: "2026-10-02T14:18:00Z", data: { unit: "VENDAS 2", webhook_silent: true } },
    ];
    expect(groupSilentAlerts(rows)).toEqual([
      { unit: "VENDAS 1", since: "2026-10-02T14:30:00Z", notificationIds: ["1", "2"] },
      { unit: "VENDAS 2", since: "2026-10-02T14:18:00Z", notificationIds: ["3"] },
    ]);
  });

  it("ignora alertas que não são de número mudo", () => {
    expect(groupSilentAlerts([
      { id: "4", created_at: "2026-10-02T15:12:00Z", data: { unit: "VENDAS 3", webhook_silent: false } },
      { id: "5", created_at: "2026-10-02T15:12:00Z", data: null },
    ])).toEqual([]);
  });
});
