import { describe, expect, it } from "vitest";
import { cleanImageUrl, DEFAULT_AI_FOLLOWUP, delayLabel, followUpConfigProblem, joinDelay, normalizeFollowUpConfig, splitDelay } from "../aiFollowUp";

describe("aiFollowUp", () => {
  it("vazio usa o padrão; limites e ordem", () => {
    expect(normalizeFollowUpConfig(null)).toEqual(DEFAULT_AI_FOLLOWUP);
    const c = normalizeFollowUpConfig({
      inactivity: { enabled: false, minutes: 1 },
      steps: [{ delay_hours: 300, goal: "b" }, { delay_hours: 24, goal: "a" }],
      auto_lost: { enabled: false, hours: 99999 },
    });
    expect(c.inactivity).toEqual({ enabled: false, minutes: 5, second_minutes: null });
    expect(c.steps.map((s) => s.goal)).toEqual(["a", "b"]);
    expect(c.auto_lost).toEqual({ enabled: false, hours: 2160 });
  });

  it("prazo em dias ou horas", () => {
    expect(splitDelay(72)).toEqual({ value: 3, unit: "dias" });
    expect(splitDelay(36)).toEqual({ value: 36, unit: "horas" });
    expect(joinDelay(3, "dias")).toBe(72);
    expect(joinDelay(0, "horas")).toBe(0);
    expect(delayLabel(24)).toBe("1 dia");
    expect(delayLabel(288)).toBe("12 dias");
  });

  it("problemas ao salvar", () => {
    expect(followUpConfigProblem(DEFAULT_AI_FOLLOWUP)).toBeNull();
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, steps: [{ delay_hours: 24, goal: " " }] })).toMatch(/objetivo/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, steps: [{ delay_hours: 24, goal: "a" }, { delay_hours: 24, goal: "b" }] })).toMatch(/mesmo prazo/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, steps: [{ delay_hours: 0, goal: "a" }] })).toMatch(/pelo menos 1 hora/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, steps: [{ delay_hours: 24 * 91, goal: "a" }] })).toMatch(/90 dias/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, auto_lost: { enabled: true, hours: 0 } })).toMatch(/Perdido/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, auto_lost: { enabled: false, hours: 0 } })).toBeNull();
  });

  it("festa distante e lembretes antes da festa", () => {
    expect(normalizeFollowUpConfig(null).far_months).toBe(3);
    expect(normalizeFollowUpConfig(null).reactivation).toEqual({ enabled: true, days_before: [60, 30], image_url: null });
    expect(normalizeFollowUpConfig({ far_months: 40, reactivation: { enabled: false, days_before: [30, 90, 30] } })).toMatchObject({
      far_months: 12,
      reactivation: { enabled: false, days_before: [90, 30] },
    });
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, reactivation: { enabled: true, days_before: [0] } })).toMatch(/1 a 180/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, far_months: 0 })).toMatch(/1 e 12/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, reactivation: { enabled: true, days_before: [30, 30] } })).toMatch(/mesmo número/);
  });

  it("arte opcional nas etapas e nos lembretes", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/sales-materials/c/followups/bia_etapa1_1.jpg";
    const c = normalizeFollowUpConfig({ steps: [{ delay_hours: 24, goal: "a", image_url: url }], reactivation: { enabled: true, days_before: [30], image_url: "nada" } });
    expect(c.steps[0].image_url).toBe(url);
    expect(c.reactivation.image_url).toBeNull();
    expect(cleanImageUrl("http://x.com/a.jpg")).toBeNull();
  });

  it("2º lembrete de inatividade: padrão ligado, configuração antiga sem ele", () => {
    expect(normalizeFollowUpConfig(null).inactivity).toEqual({ enabled: true, minutes: 30, second_minutes: 180 });
    expect(normalizeFollowUpConfig({ inactivity: { enabled: true, minutes: 15 } }).inactivity.second_minutes).toBeNull();
    expect(normalizeFollowUpConfig({ inactivity: { enabled: true, minutes: 15, second_minutes: 9999 } }).inactivity.second_minutes).toBe(600);
  });

  it("chave geral só vale com a data de ativação", () => {
    expect(normalizeFollowUpConfig(null).enabled).toBe(false);
    expect(normalizeFollowUpConfig({ enabled: true }).enabled).toBe(false);
    expect(normalizeFollowUpConfig({ enabled: true, since: "2026-10-07T12:00:00Z" }).enabled).toBe(true);
  });
});
