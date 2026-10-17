import { describe, it, expect } from "vitest";
import { buildPartySlots, monthsAhead, SETUP_SELECTS, signupStatus } from "../selfSetup";

describe("passo a passo do cadastro", () => {
  it("horários das festas no formato que a IA entende", () => {
    expect(buildPartySlots([{ start: "13:00", end: "17:00" }, { start: "19:00", end: "23:00" }, { start: "", end: "" }])).toBe("13:00-17:00, 19:00-23:00");
  });

  it("calendário: semana começa na segunda", () => {
    const [oct] = monthsAhead(new Date(2026, 9, 17), 1);
    expect(oct.key).toBe("2026-10");
    expect(oct.offset).toBe(3); // 01/10/2026 é quinta
    expect(oct.days).toHaveLength(31);
    expect(oct.days[0]).toBe("2026-10-01");
    expect(monthsAhead(new Date(2026, 11, 1), 2)[1].key).toBe("2027-01");
  });

  it("perguntas de resposta pronta usam as mesmas opções do Configurar IA", () => {
    expect(SETUP_SELECTS.map((q) => q.key)).toEqual(["comida_externa", "monitores"]);
    expect(SETUP_SELECTS.every((q) => q.options.length >= 2)).toBe(true);
  });

  it("status do cadastro", () => {
    expect(signupStatus({ signup: { status: "cadastro" } })).toBe("cadastro");
    expect(signupStatus({})).toBeNull();
    expect(signupStatus(null)).toBeNull();
  });
});
