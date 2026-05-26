import { describe, it, expect, beforeEach } from "vitest";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";

describe("getCurrentCompanyId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna null quando localStorage está vazio", () => {
    expect(getCurrentCompanyId()).toBeNull();
  });

  it("retorna o valor armazenado no localStorage", () => {
    localStorage.setItem("selected_company_id", "custom-id-123");
    expect(getCurrentCompanyId()).toBe("custom-id-123");
  });

  it("retorna null quando o valor armazenado é string vazia", () => {
    localStorage.setItem("selected_company_id", "");
    expect(getCurrentCompanyId()).toBeNull();
  });
});
