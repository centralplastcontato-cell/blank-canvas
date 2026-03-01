import { describe, it, expect, beforeEach } from "vitest";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";

const DEFAULT_COMPANY_ID = "a0000000-0000-0000-0000-000000000001";

describe("getCurrentCompanyId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default when localStorage is empty", () => {
    expect(getCurrentCompanyId()).toBe(DEFAULT_COMPANY_ID);
  });

  it("returns stored value from localStorage", () => {
    localStorage.setItem("selected_company_id", "custom-id-123");
    expect(getCurrentCompanyId()).toBe("custom-id-123");
  });

  it("returns default when stored value is empty string", () => {
    localStorage.setItem("selected_company_id", "");
    expect(getCurrentCompanyId()).toBe(DEFAULT_COMPANY_ID);
  });
});
