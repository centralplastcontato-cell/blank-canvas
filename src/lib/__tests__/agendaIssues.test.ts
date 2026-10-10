import { describe, expect, it } from "vitest";
import { countIssues, eventIssues, type IssueEvent } from "../agendaIssues";

const ev = (over: Partial<IssueEvent> = {}): IssueEvent => ({ status: "confirmado", total_value: 5000, start_time: "14:00", unit: "Unidade A", ...over });
const ctx = { hasUnits: true, hasOverduePayment: false };

describe("eventIssues", () => {
  it("festa completa e em dia: nada a resolver", () => {
    expect(eventIssues(ev(), ctx)).toEqual([]);
  });

  it("aponta o que falta, na ordem de importância", () => {
    expect(eventIssues(ev({ status: "pendente", total_value: null, start_time: null, unit: " " }), { hasUnits: true, hasOverduePayment: true }))
      .toEqual(["parcela_vencida", "pendente", "sem_valor", "sem_horario", "sem_unidade"]);
  });

  it("permuta não precisa de valor", () => {
    expect(eventIssues(ev({ total_value: 0, is_permuta: true }), ctx)).toEqual([]);
  });

  it("sem unidade só conta quando a empresa tem unidades", () => {
    expect(eventIssues(ev({ unit: null }), { hasUnits: false, hasOverduePayment: false })).toEqual([]);
  });

  it("cancelada não entra", () => {
    expect(eventIssues(ev({ status: "cancelado", total_value: null }), { hasUnits: true, hasOverduePayment: true })).toEqual([]);
  });
});

describe("countIssues", () => {
  it("conta festas por problema e esconde os zerados", () => {
    expect(countIssues([["sem_valor"], ["sem_valor", "pendente"], []])).toEqual([
      { issue: "pendente", count: 1 },
      { issue: "sem_valor", count: 2 },
    ]);
  });
});
