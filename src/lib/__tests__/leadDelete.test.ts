import { describe, expect, it } from "vitest";
import { LEAD_DELETE_NOT_ALLOWED, leadDeleteOutcome } from "../leadDelete";

describe("leadDeleteOutcome", () => {
  it("apagou todos", () => {
    expect(leadDeleteOutcome(2, 2, null)).toEqual({ ok: true, deleted: 2 });
  });

  it("o banco não apagou nada (sem permissão): não diz que excluiu", () => {
    expect(leadDeleteOutcome(1, 0, null)).toEqual({ ok: false, deleted: 0, message: LEAD_DELETE_NOT_ALLOWED });
  });

  it("apagou só parte", () => {
    const r = leadDeleteOutcome(3, 1, null);
    expect(r.ok).toBe(false);
    expect(r.deleted).toBe(1);
  });

  it("travado por contrato ou outro erro", () => {
    expect(leadDeleteOutcome(1, 0, { code: "23503", message: "fk" }).ok).toBe(false);
    expect(leadDeleteOutcome(1, 0, { message: "falhou" })).toEqual({ ok: false, deleted: 0, message: "falhou" });
  });
});
