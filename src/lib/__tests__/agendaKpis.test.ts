import { describe, expect, it } from "vitest";
import { closedSummary, eventSummary, netEventValue, occupancy, type KpiEvent } from "../agendaKpis";

const ev = (over: Partial<KpiEvent>): KpiEvent => ({ status: "confirmado", total_value: 1000, event_date: "2026-10-10", ...over });

describe("eventSummary", () => {
  const today = "2026-10-15";
  const list = [
    ev({ event_date: "2026-10-01" }),
    ev({ event_date: "2026-10-15" }),
    ev({ event_date: "2026-10-20", status: "pendente", total_value: 500 }),
    ev({ event_date: "2026-10-21", status: "cancelado", total_value: 9999 }),
    ev({ event_date: "2026-10-22", is_permuta: true, total_value: 3000 }),
  ];
  const s = eventSummary(list, today);

  it("conta realizadas pela data e a de hoje ainda a realizar", () => {
    expect(s.total).toBe(5);
    expect(s.canceladas).toBe(1);
    expect(s.realizadas).toBe(1);
    expect(s.aRealizar).toBe(3);
  });

  it("agendado: confirmadas e pendentes separadas, sem cancelada e sem permuta", () => {
    expect(s.agendadoConfirmado).toBe(2000);
    expect(s.agendadoPendente).toBe(500);
  });
});

describe("closedSummary", () => {
  it("cancelada não conta como venda; permuta conta como venda mas sem faturamento", () => {
    const list = [ev({}), ev({ status: "cancelado" }), ev({ is_permuta: true })];
    const s = closedSummary(list, (e) => (e.total_value || 0) * 0.9);
    expect(s.count).toBe(2);
    expect(s.cancelled).toBe(1);
    expect(s.revenue).toBe(900);
  });
});

describe("occupancy", () => {
  it("dias com festa no total e por unidade (sem diferenciar maiúscula)", () => {
    const list = [
      ev({ event_date: "2026-10-01", unit: "Unidade A" }),
      ev({ event_date: "2026-10-01", unit: "unidade b" }),
      ev({ event_date: "2026-10-02", unit: "Unidade A" }),
      ev({ event_date: "2026-10-03", unit: "Unidade A", status: "cancelado" }),
    ];
    const o = occupancy(list, 31, ["Unidade A", "Unidade B"]);
    expect(o.days).toBe(2);
    expect(o.freeDays).toBe(29);
    expect(o.rate).toBe(6);
    expect(o.byUnit).toEqual([
      { unit: "Unidade A", days: 2, rate: 6 },
      { unit: "Unidade B", days: 1, rate: 3 },
    ]);
  });
});

describe("netEventValue", () => {
  const fees = [
    { id: "op1", taxa_debito: 1, taxa_credito_1x: 3, taxa_credito_3x: 5 },
    { id: "op2", taxa_debito: 2, taxa_credito_1x: 4, taxa_credito_3x: 8 },
  ];

  it("sem cartão: valor cheio", () => {
    expect(netEventValue(ev({ payment_details: { saldo_forma: "pix", saldo_valor: 1000 } }), fees)).toBe(1000);
  });

  it("usa a taxa gravada na festa, não a de hoje", () => {
    const pd = { saldo_forma: "cartao", saldo_valor: 1000, parcelas: 3, saldo_taxa_percent: 6, card_operator_id: "op1" };
    expect(netEventValue(ev({ payment_details: pd }), fees)).toBe(940);
  });

  it("sem taxa gravada: usa a operadora escolhida na festa", () => {
    const pd = { saldo_forma: "cartao", saldo_valor: 1000, parcelas: 3, card_operator_id: "op2" };
    expect(netEventValue(ev({ payment_details: pd }), fees)).toBe(920);
  });

  it("sem operadora na festa: a primeira da empresa; entrada e saldo somam", () => {
    const pd = { entrada_forma: "cartao_debito", entrada_valor: "R$ 200,00", saldo_forma: "cartao", saldo_valor: 800, parcelas: 1 };
    // débito 1% de 200 = 2; crédito 1x 3% de 800 = 24
    expect(netEventValue(ev({ payment_details: pd }), fees)).toBe(974);
  });

  it("taxa gravada vale mesmo sem operadoras cadastradas", () => {
    const pd = { saldo_forma: "cartao_debito", saldo_valor: 1000, saldo_taxa_percent: 1.5 };
    expect(netEventValue(ev({ payment_details: pd }), [])).toBe(985);
  });
});
