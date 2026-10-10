import { describe, expect, it } from "vitest";
import { applyLeadFilters, leadScopeIsEmpty, leadSearchOr, leadSelect, type LeadFilterBuilder } from "../leadQuery";
import type { LeadFilters } from "@/types/crm";

class Recorder implements LeadFilterBuilder<Recorder> {
  calls: string[] = [];
  private add(s: string) { this.calls.push(s); return this; }
  eq(c: string, v: unknown) { return this.add(`eq ${c} ${String(v)}`); }
  in(c: string, v: readonly unknown[]) { return this.add(`in ${c} ${v.join("|")}`); }
  is(c: string, v: null) { return this.add(`is ${c} ${String(v)}`); }
  gte(c: string, v: unknown) { return this.add(`gte ${c}`); }
  lte(c: string, v: unknown) { return this.add(`lte ${c}`); }
  or(f: string) { return this.add(`or ${f}`); }
}

const filters = (over: Partial<LeadFilters> = {}): LeadFilters => ({
  campaign: "all", unit: "all", status: "all", responsavel: "all", month: "all",
  startDate: undefined, endDate: undefined, search: "", hasScheduledVisit: false, ...over,
});

describe("leadSearchOr", () => {
  it("vírgula e parênteses não quebram a busca", () => {
    expect(leadSearchOr("Silva, Ana (mãe)")).toBe('name.ilike."%Silva, Ana (mãe)%",whatsapp.ilike."%Silva, Ana (mãe)%"');
  });

  it("aspas escapadas", () => {
    expect(leadSearchOr('Ana "Bia"')).toContain('"%Ana \\"Bia\\"%"');
  });

  it("telefone digitado com máscara também procura só os dígitos", () => {
    expect(leadSearchOr("(11) 98765-4321")).toContain('whatsapp.ilike."%11987654321%"');
    expect(leadSearchOr("11987654321")).not.toContain(",whatsapp.ilike.\"%11987654321%\",");
  });

  it("vazio não filtra", () => {
    expect(leadSearchOr("  ")).toBeNull();
  });
});

describe("applyLeadFilters", () => {
  it("restrito: só as unidades dele (e As duas)", () => {
    const q = applyLeadFilters(new Recorder(), { canViewAll: false, allowedUnits: ["Unidade A"], filters: filters() });
    expect(q.calls).toEqual(["in unit Unidade A|As duas"]);
  });

  it("filtros da tela e visitas agendadas no servidor", () => {
    const q = applyLeadFilters(new Recorder(), {
      canViewAll: true, allowedUnits: [],
      filters: filters({ status: "novo", responsavel: "unassigned", hasScheduledVisit: true }),
    });
    expect(q.calls).toEqual(["eq status novo", "is responsavel_id null", "eq wapi_conversations.has_scheduled_visit true"]);
    expect(leadSelect("*", { hasScheduledVisit: true })).toBe("*, wapi_conversations!inner(id)");
  });

  it("CRM ignora o filtro de situação quando pedido", () => {
    const q = applyLeadFilters(new Recorder(), { canViewAll: true, allowedUnits: [], filters: filters({ status: "novo" }) }, { ignoreStatus: true });
    expect(q.calls).toEqual([]);
  });

  it("Realizada ignora o período (histórico todo)", () => {
    const day = new Date(2026, 9, 10);
    const scope = { canViewAll: true, allowedUnits: [], filters: filters({ startDate: day, endDate: day }) };
    expect(applyLeadFilters(new Recorder(), scope).calls.map((c) => c.split(" ").slice(0, 2).join(" "))).toEqual(["gte last_entry_at", "lte last_entry_at"]);
    expect(applyLeadFilters(new Recorder(), scope, { ignorePeriod: true }).calls).toEqual([]);
  });

  it("sem unidade nenhuma: vazio", () => {
    expect(leadScopeIsEmpty({ canViewAll: false, allowedUnits: [], filters: filters() })).toBe(true);
    expect(leadScopeIsEmpty({ canViewAll: false, allowedUnits: ["all"], filters: filters() })).toBe(false);
  });
});
