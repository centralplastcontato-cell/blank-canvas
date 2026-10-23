import { describe, expect, it } from "vitest";
import { buildTimeline, DEFAULT_SCHEDULE, parseSchedule, partyPhase, readiness } from "../partyDay";

const at = (s: string) => new Date(s); // horário local

describe("parseSchedule", () => {
  it("sem roteiro salvo usa o padrão", () => {
    expect(parseSchedule(null)).toEqual(DEFAULT_SCHEDULE);
    expect(parseSchedule({ party_schedule: [] })).toEqual(DEFAULT_SCHEDULE);
  });
  it("lê e limpa o roteiro salvo", () => {
    expect(parseSchedule({ party_schedule: [{ label: " Parabéns ", anchor: "end", offset: "-60" }, { label: "" }] }))
      .toEqual([{ label: "Parabéns", anchor: "end", offset: -60 }]);
  });
});

describe("buildTimeline", () => {
  const steps = [
    { label: "Equipe chega", anchor: "start" as const, offset: -60 },
    { label: "Início", anchor: "start" as const, offset: 0 },
    { label: "Parabéns", anchor: "end" as const, offset: -60 },
    { label: "Fim", anchor: "end" as const, offset: 0 },
  ];
  it("no dia marca feito e próximo", () => {
    const t = buildTimeline(steps, "19:00:00", "23:00:00", "2026-10-24", at("2026-10-24T18:30:00"));
    expect(t.map((i) => `${i.time} ${i.state}`)).toEqual(["18:00 done", "19:00 next", "22:00 later", "23:00 later"]);
  });
  it("em outro dia só mostra os horários", () => {
    const t = buildTimeline(steps, "13:00", "17:00", "2026-10-24", at("2026-10-22T20:00:00"));
    expect(t.every((i) => i.state === "later")).toBe(true);
    expect(t[0].time).toBe("12:00");
  });
  it("festa sem horário não tem roteiro", () => {
    expect(buildTimeline(steps, null, null, "2026-10-24", at("2026-10-24T10:00:00"))).toEqual([]);
  });
  it("sem horário de fim, pula os momentos ligados ao fim", () => {
    expect(buildTimeline(steps, "19:00", null, "2026-10-24", at("2026-10-22T10:00:00")).map((i) => i.label)).toEqual(["Equipe chega", "Início"]);
  });
});

describe("partyPhase", () => {
  it("antes, durante e depois", () => {
    expect(partyPhase("2026-10-24", "19:00", "23:00", at("2026-10-24T16:55:00")).text).toBe("Começa em 2h 05min");
    expect(partyPhase("2026-10-24", "19:00", "23:00", at("2026-10-24T21:00:00")).text).toBe("Acontecendo agora · termina em 2h");
    expect(partyPhase("2026-10-24", "19:00", "23:00", at("2026-10-24T23:10:00")).kind).toBe("after");
  });
  it("dias antes", () => {
    expect(partyPhase("2026-10-24", "19:00", "23:00", at("2026-10-23T20:00:00")).text).toBe("É amanhã");
    expect(partyPhase("2026-10-24", "19:00", "23:00", at("2026-10-22T08:00:00")).text).toBe("Faltam 2 dias");
  });
});

describe("readiness", () => {
  it("checklist e formulários do cliente", () => {
    expect(readiness({ total: 10, completed: 6 }, [true, true])).toBe(87);
    expect(readiness({ total: 0, completed: 0 }, [true, false])).toBe(50);
    expect(readiness({ total: 0, completed: 0 }, [])).toBeNull();
  });
});
