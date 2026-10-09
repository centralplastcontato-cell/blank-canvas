import { describe, expect, it } from "vitest";
import { CLEARABLE_EVENT_CHILDREN, blockingTable } from "../eventDelete";

describe("blockingTable", () => {
  it("lê a tabela do detalhe do erro do banco", () => {
    expect(
      blockingTable({
        message: 'update or delete on table "company_events" violates foreign key constraint "contrato_responses_event_id_fkey" on table "contrato_responses"',
        details: 'Key (id)=(5b1c…) is still referenced from table "contrato_responses".',
      }),
    ).toBe("contrato_responses");
  });

  it("sem detalhe, usa a última tabela da mensagem", () => {
    expect(
      blockingTable({
        message: 'update or delete on table "company_events" violates foreign key constraint "x" on table "maintenance_entries"',
        details: null,
      }),
    ).toBe("maintenance_entries");
  });

  it("não inventa tabela", () => {
    expect(blockingTable({ message: "algo deu errado", details: "" })).toBeNull();
  });

  it("financeiro nunca está na lista do que pode ser apagado antes", () => {
    for (const t of ["event_payments", "event_payment_entries", "event_extras", "event_discounts", "event_financial_timeline"]) {
      expect(CLEARABLE_EVENT_CHILDREN.has(t)).toBe(false);
    }
  });
});
