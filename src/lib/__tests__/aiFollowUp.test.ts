import { describe, expect, it } from "vitest";
import { DEFAULT_AI_FOLLOWUP, delayLabel, followUpConfigProblem, joinDelay, normalizeFollowUpConfig, splitDelay } from "../aiFollowUp";

describe("aiFollowUp", () => {
  it("vazio usa o padrão; limites e ordem", () => {
    expect(normalizeFollowUpConfig(null)).toEqual(DEFAULT_AI_FOLLOWUP);
    const c = normalizeFollowUpConfig({
      inactivity: { enabled: false, minutes: 1 },
      steps: [{ delay_hours: 300, goal: "b" }, { delay_hours: 24, goal: "a" }],
      auto_lost: { enabled: false, hours: 99999 },
    });
    expect(c.inactivity).toEqual({ enabled: false, minutes: 5 });
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

  it("chave geral só vale com a data de ativação", () => {
    expect(normalizeFollowUpConfig(null).enabled).toBe(false);
    expect(normalizeFollowUpConfig({ enabled: true }).enabled).toBe(false);
    expect(normalizeFollowUpConfig({ enabled: true, since: "2026-10-07T12:00:00Z" }).enabled).toBe(true);
  });
});
