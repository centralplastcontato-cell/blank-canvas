import { describe, expect, it } from "vitest";
import { buffetInfoProgress } from "../aiBuffetFields";

describe("buffetInfoProgress", () => {
  it("conta só os campos importantes (degustação detalhada e outros são opcionais)", () => {
    const empty = buffetInfoProgress(null);
    expect(empty.filled).toBe(0);
    const some = buffetInfoProgress("Endereço: Rua X\nDuração da festa: 4 horas\nOutras informações: algo");
    expect(some.filled).toBe(2);
    expect(some.total).toBe(empty.total);
  });
});
