import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { taskReminders } from "./task-reminders.ts";

const t = (id: string, over: Record<string, unknown> = {}) => ({ id, assigned_to: null, created_by: "criador", ...over });

Deno.test("taskReminders: responsável, senão quem criou", () => {
  const out = taskReminders([t("a", { assigned_to: "ana" }), t("b"), t("c", { created_by: null })]);
  assertEquals(out.map((r) => [r.task.id, r.userId]), [["a", "ana"], ["b", "criador"]]);
});

Deno.test("taskReminders: modelo e repetição do mesmo dia avisam uma vez", () => {
  const out = taskReminders([t("m", { is_recurring: true }), t("c", { parent_task_id: "m" }), t("solo", { is_recurring: true })]);
  assertEquals(out.map((r) => r.task.id), ["c", "solo"]);
});
