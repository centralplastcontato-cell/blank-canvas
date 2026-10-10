import { describe, expect, it } from "vitest";
import { visitSummary, type KpiVisit } from "../visitKpis";

// 15/10/2026 às 15h em Brasília
const now = new Date("2026-10-15T18:00:00Z");
const v = (data: string, status: string, over: Partial<KpiVisit> = {}): KpiVisit => ({ data_visita: data, status_visita: status, horario_visita: "10:00", visit_type: "visita", ...over });

describe("visitSummary", () => {
  const list = [
    v("2026-10-01", "realizada"),
    v("2026-10-02", "realizada"),
    v("2026-10-03", "nao_compareceu"),
    v("2026-10-05", "confirmada"), // já passou, sem resultado
    v("2026-10-15", "agendada", { horario_visita: "17:00" }), // hoje, ainda vai acontecer
    v("2026-10-20", "remarcada"),
    v("2026-10-21", "cancelada"),
    v("2026-10-22", "agendada", { visit_type: "atendimento" }),
  ];
  const s = visitSummary(list, now);

  it("separa visitas de atendimentos", () => {
    expect(s.visitas).toBe(7);
    expect(s.atendimentos).toBe(1);
  });

  it("a acontecer x sem resultado", () => {
    expect(s.aAcontecer).toBe(2);
    expect(s.semResultado).toBe(1);
  });

  it("comparecimento só com quem tem resultado", () => {
    expect(s.vieram).toBe(2);
    expect(s.naoVieram).toBe(1);
    expect(s.comparecimento).toBe(67);
    expect(s.canceladas).toBe(1);
  });

  it("sem nenhum resultado: comparecimento vazio", () => {
    expect(visitSummary([v("2026-10-20", "agendada")], now).comparecimento).toBeNull();
  });
});
