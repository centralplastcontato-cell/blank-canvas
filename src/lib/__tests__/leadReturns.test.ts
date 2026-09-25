import { describe, it, expect } from "vitest";
import { mergeLeadUpdate, summarizeLegacyReturns, withReturnInfo } from "@/lib/leadReturns";

describe("summarizeLegacyReturns", () => {
  it("counts returns per lead and keeps the latest date", () => {
    const map = summarizeLegacyReturns([
      { lead_id: "a", created_at: "2026-05-01T10:00:00Z" },
      { lead_id: "a", created_at: "2026-07-01T10:00:00Z" },
      { lead_id: "a", created_at: "2026-06-01T10:00:00Z" },
      { lead_id: "b", created_at: "2026-03-01T10:00:00Z" },
      { lead_id: null, created_at: "2026-03-01T10:00:00Z" },
    ]);
    expect(map.get("a")).toEqual({ count: 3, lastAt: "2026-07-01T10:00:00Z" });
    expect(map.get("b")).toEqual({ count: 1, lastAt: "2026-03-01T10:00:00Z" });
    expect(map.size).toBe(2);
  });
});

describe("withReturnInfo", () => {
  const legacy = summarizeLegacyReturns([
    { lead_id: "a", created_at: "2026-05-01T10:00:00Z" },
    { lead_id: "a", created_at: "2026-06-01T10:00:00Z" },
  ]);

  it("uses the history when the lead has no stored returns", () => {
    const lead = withReturnInfo({ id: "a", return_count: 0, last_return_at: null }, legacy);
    expect(lead.return_count).toBe(2);
    expect(lead.last_return_at).toBe("2026-06-01T10:00:00Z");
    expect(lead.has_return).toBe(true);
  });

  it("prefers the stored count and the most recent date", () => {
    const lead = withReturnInfo({ id: "a", return_count: 3, last_return_at: "2026-09-20T10:00:00Z" }, legacy);
    expect(lead.return_count).toBe(3);
    expect(lead.last_return_at).toBe("2026-09-20T10:00:00Z");
  });

  it("marks leads that never returned", () => {
    const lead = withReturnInfo({ id: "z" }, legacy);
    expect(lead.return_count).toBe(0);
    expect(lead.last_return_at).toBeNull();
    expect(lead.has_return).toBe(false);
  });
});

describe("mergeLeadUpdate", () => {
  type L = { id: string; name: string; return_count?: number; last_return_at?: string | null; has_follow_up?: boolean };
  const list: L[] = [
    { id: "1", name: "Ana" },
    { id: "2", name: "Bia", has_follow_up: true, return_count: 2, last_return_at: "2026-06-01T10:00:00Z" },
  ];

  it("keeps position and extra info on a regular update", () => {
    const out = mergeLeadUpdate(list, { id: "2", name: "Bia Souza", return_count: 0, last_return_at: null });
    expect(out.map((l) => l.id)).toEqual(["1", "2"]);
    expect(out[1]).toMatchObject({ name: "Bia Souza", has_follow_up: true, return_count: 2, last_return_at: "2026-06-01T10:00:00Z" });
  });

  it("moves a lead that just returned to the top", () => {
    const out = mergeLeadUpdate(list, { id: "2", name: "Bia", return_count: 3, last_return_at: "2026-09-25T10:00:00Z" });
    expect(out.map((l) => l.id)).toEqual(["2", "1"]);
    expect(out[0]).toMatchObject({ return_count: 3, last_return_at: "2026-09-25T10:00:00Z", has_follow_up: true });
  });

  it("ignores leads that are not in the list", () => {
    expect(mergeLeadUpdate(list, { id: "9", name: "X" })).toBe(list);
  });
});
