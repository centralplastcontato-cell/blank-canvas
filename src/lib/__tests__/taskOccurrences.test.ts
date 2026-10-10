import { describe, expect, it } from "vitest";
import {
  describeRecurrence,
  isSeriesActive,
  nextSeriesDate,
  seriesDates,
  tasksInRange,
  withoutDuplicateSeries,
  type RecurringTask,
} from "../taskOccurrences";

const t = (id: string, due: string | null, over: Partial<RecurringTask> = {}): RecurringTask => ({ id, due_date: due, status: "pendente", ...over });
const monthly = (id: string, due: string, over: Partial<RecurringTask> = {}) =>
  t(id, due, { is_recurring: true, recurrence_type: "mensal", ...over });
const child = (id: string, parent: string, due: string, status = "pendente") => t(id, due, { parent_task_id: parent, status });

describe("seriesDates", () => {
  it("mensal: no dia da 1ª vez, a partir dela", () => {
    expect(seriesDates(monthly("m", "2026-04-27"), "2026-03-01", "2026-06-30")).toEqual(["2026-04-27", "2026-05-27", "2026-06-27"]);
  });

  it("mensal no dia 31: último dia nos meses mais curtos", () => {
    expect(seriesDates(monthly("m", "2026-01-31"), "2026-02-01", "2026-04-30")).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("semanal: só nos dias escolhidos; sem dia = todo dia", () => {
    const s = t("s", "2026-10-01", { is_recurring: true, recurrence_type: "semanal", recurrence_days: [1, 3] });
    expect(seriesDates(s, "2026-10-01", "2026-10-11")).toEqual(["2026-10-05", "2026-10-07"]);
    const every = t("e", "2026-10-01", { is_recurring: true, recurrence_type: "semanal", recurrence_days: [] });
    expect(seriesDates(every, "2026-10-01", "2026-10-03")).toHaveLength(3);
  });

  it("respeita a data final e ignora tarefa que não é modelo", () => {
    expect(seriesDates(monthly("m", "2026-01-10", { recurrence_end_date: "2026-03-01" }), "2026-01-01", "2026-12-31")).toEqual(["2026-01-10", "2026-02-10"]);
    expect(seriesDates(child("c", "m", "2026-02-10"), "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("withoutDuplicateSeries", () => {
  it("tira o modelo quando já existe a repetição do mesmo dia", () => {
    const list = [monthly("m", "2026-10-27"), child("c", "m", "2026-10-27"), t("x", "2026-10-27")];
    expect(withoutDuplicateSeries(list).map((x) => x.id)).toEqual(["c", "x"]);
  });

  it("mantém o modelo quando ele é a 1ª vez", () => {
    const list = [monthly("m", "2026-04-27", { status: "concluida" }), child("c", "m", "2026-05-27")];
    expect(withoutDuplicateSeries(list).map((x) => x.id)).toEqual(["m", "c"]);
  });
});

describe("tasksInRange", () => {
  const today = "2026-10-10";
  // Como no Planeta: modelo de abril, robô criou as repetições até outubro
  const tasks = [
    monthly("m", "2026-04-27", { status: "concluida" }),
    child("c9", "m", "2026-09-27"),
    child("c10", "m", "2026-10-27"),
    t("solta", "2026-10-15"),
  ];

  it("outubro: repetição real, sem a fantasma do modelo", () => {
    const occ = tasksInRange(tasks, "2026-10-01", "2026-10-31", today);
    expect(occ.map((o) => [o.task.id, o.date, o.forecast])).toEqual([
      ["solta", "2026-10-15", false],
      ["c10", "2026-10-27", false],
    ]);
  });

  it("novembro: prevista (o robô ainda não criou)", () => {
    const occ = tasksInRange(tasks, "2026-11-01", "2026-11-30", today);
    expect(occ.map((o) => [o.task.id, o.date, o.forecast])).toEqual([["m", "2026-11-27", true]]);
  });

  it("mês passado: só o que existe, sem previsão", () => {
    const occ = tasksInRange(tasks, "2026-08-01", "2026-08-31", today);
    expect(occ).toEqual([]);
  });

  it("série parada não prevê mais nada", () => {
    const stopped = tasks.map((x) => (x.id === "m" ? { ...x, recurrence_end_date: "2026-10-10" } : x));
    expect(tasksInRange(stopped, "2026-11-01", "2026-11-30", today)).toEqual([]);
  });

  it("série nova (robô ainda não rodou): prevê depois da 1ª vez", () => {
    const fresh = [t("d", "2026-10-10", { is_recurring: true, recurrence_type: "diaria" })];
    const occ = tasksInRange(fresh, "2026-10-10", "2026-10-12", today);
    expect(occ.map((o) => [o.date, o.forecast])).toEqual([
      ["2026-10-10", false],
      ["2026-10-11", true],
      ["2026-10-12", true],
    ]);
  });
});

describe("série", () => {
  const today = "2026-10-10";
  it("ativa até a data final", () => {
    expect(isSeriesActive(monthly("m", "2026-01-01"), today)).toBe(true);
    expect(isSeriesActive(monthly("m", "2026-01-01", { recurrence_end_date: "2026-10-10" }), today)).toBe(true);
    expect(isSeriesActive(monthly("m", "2026-01-01", { recurrence_end_date: "2026-10-09" }), today)).toBe(false);
    expect(isSeriesActive(child("c", "m", "2026-10-27"), today)).toBe(false);
  });

  it("próxima vez: a repetição pendente ou a prevista", () => {
    const m = monthly("m", "2026-04-27", { status: "concluida" });
    expect(nextSeriesDate(m, [m, child("c10", "m", "2026-10-27")], today)).toBe("2026-10-27");
    expect(nextSeriesDate(m, [m, child("c10", "m", "2026-10-27", "concluida")], today)).toBe("2026-11-27");
  });

  it("descrição", () => {
    expect(describeRecurrence(monthly("m", "2026-04-27"))).toBe("Todo mês, dia 27");
    expect(describeRecurrence(t("s", null, { recurrence_type: "semanal", recurrence_days: [3, 1] }))).toBe("Toda semana: Seg, Qua");
    expect(describeRecurrence(t("d", null, { recurrence_type: "diaria" }))).toBe("Todo dia");
  });
});
