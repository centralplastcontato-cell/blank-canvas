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
    expect(joinDelay(0, "horas")).toBe(1);
    expect(delayLabel(24)).toBe("1 dia");
    expect(delayLabel(288)).toBe("12 dias");
  });

  it("problemas ao salvar", () => {
    expect(followUpConfigProblem(DEFAULT_AI_FOLLOWUP)).toBeNull();
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, steps: [{ delay_hours: 24, goal: " " }] })).toMatch(/objetivo/);
    expect(followUpConfigProblem({ ...DEFAULT_AI_FOLLOWUP, steps: [{ delay_hours: 24, goal: "a" }, { delay_hours: 24, goal: "b" }] })).toMatch(/mesmo prazo/);
  });
});
