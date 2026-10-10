import { describe, expect, it } from "vitest";
import { leadPermissions } from "../leadPermissions";

const base = { ready: true, isAdmin: false, roleCanEdit: true, isViewOnly: false, has: () => true };

describe("leadPermissions", () => {
  it("sem registro libera (regra de sempre)", () => {
    const p = leadPermissions(base);
    expect(p.canEditLeads && p.canViewContact && p.canDeleteLeads && p.canExportLeads).toBe(true);
  });

  it("carregando: nada liberado (só admin)", () => {
    const p = leadPermissions({ ...base, ready: false });
    expect(p.canEditLeads || p.canViewContact || p.canDeleteLeads || p.canExportLeads).toBe(false);
    expect(leadPermissions({ ...base, ready: false, isAdmin: true }).canEditLeads).toBe(true);
  });

  it("Visualização nunca edita nem exclui, mas pode ver", () => {
    const p = leadPermissions({ ...base, isViewOnly: true });
    expect(p.canEditLeads || p.canEditName || p.canDeleteLeads || p.canTransferLeads).toBe(false);
    expect(p.canViewContact && p.canExportLeads).toBe(true);
  });

  it("permissão negada bloqueia", () => {
    const p = leadPermissions({ ...base, roleCanEdit: false, has: (c) => c !== "leads.edit" && c !== "leads.contact.view" });
    expect(p.canEditLeads).toBe(false);
    expect(p.canViewContact).toBe(false);
  });
});
