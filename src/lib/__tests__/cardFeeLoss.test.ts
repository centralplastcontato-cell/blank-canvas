import { describe, it, expect } from "vitest";
import { computeCardFeeLoss, operatorRate, isCardMethod, isDebitMethod } from "../cardFeeLoss";
import type { CardFeeRow } from "../cardFees";

const INFINITE: CardFeeRow = {
  id: "infinite",
  operator_name: "Infinite Pay",
  antecipado: true,
  taxa_debito: 1.99,
  taxa_credito_1x: 3.09,
  taxa_credito_5x: 5.49,
  taxa_credito_12x: 8.99,
};

describe("isCardMethod / isDebitMethod", () => {
  it("reconhece formas de cartão", () => {
    expect(isCardMethod("cartao")).toBe(true);
    expect(isCardMethod("cartao_credito")).toBe(true);
    expect(isCardMethod("cartao_debito")).toBe(true);
    expect(isCardMethod("Cartão")).toBe(true);
    expect(isCardMethod("pix")).toBe(false);
    expect(isCardMethod(null)).toBe(false);
  });
  it("reconhece débito", () => {
    expect(isDebitMethod("cartao_debito")).toBe(true);
    expect(isDebitMethod("cartao_credito")).toBe(false);
  });
});

describe("operatorRate", () => {
  it("usa taxa_debito no débito e taxa_credito_Nx no crédito", () => {
    expect(operatorRate(INFINITE, 1, true)).toBe(1.99);
    expect(operatorRate(INFINITE, 5, false)).toBe(5.49);
    expect(operatorRate(INFINITE, 12, false)).toBe(8.99);
    expect(operatorRate(null, 5, false)).toBe(0);
  });
});

describe("computeCardFeeLoss", () => {
  it("caso Manuella: bruto 7641,50 no crédito 5x (5,49%) → perda 419,52", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao", amount: 7221.98, gross_amount: 7641.5, card_fee_percent: 5.49, card_installments: 5, card_operator_id: "infinite" }],
      { card_operator_name: "Infinite Pay", saldo_taxa_percent: 5.49, parcelas: 5, card_operator_id: "infinite" },
      [INFINITE],
    );
    expect(r).not.toBeNull();
    expect(r!.operator).toBe("Infinite Pay");
    expect(r!.totalLoss).toBe(419.52);
    expect(r!.details[0]).toMatchObject({ bruto: 7641.5, taxa: 5.49, desconto: 419.52, parcelas: 5 });
  });

  it("registro legado (sem gross_amount): deriva o bruto do líquido pela taxa do snapshot", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao_credito", amount: 7221.98, gross_amount: null, card_installments: 5, card_operator_id: "infinite" }],
      { saldo_taxa_percent: 5.49, card_operator_name: "Infinite Pay" },
      [INFINITE],
    );
    expect(r!.details[0].bruto).toBe(7641.5);
    expect(r!.totalLoss).toBe(419.52);
  });

  it("sem pagamentos de cartão → null", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "pix", amount: 1000 }],
      {},
      [INFINITE],
    );
    expect(r).toBeNull();
  });

  it("débito: usa taxa_debito e 1 parcela", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao_debito", amount: 980.1, gross_amount: 1000, card_operator_id: "infinite" }],
      {},
      [INFINITE],
    );
    expect(r!.details[0]).toMatchObject({ taxa: 1.99, parcelas: 1, desconto: 19.9 });
    expect(r!.operator).toBe("Infinite Pay");
  });

  it("prioridade da taxa: carimbo da linha vence o snapshot e a operadora", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao", amount: 960, gross_amount: 1000, card_fee_percent: 4.0, card_installments: 5, card_operator_id: "infinite" }],
      { saldo_taxa_percent: 5.49 },
      [INFINITE],
    );
    expect(r!.details[0].taxa).toBe(4.0);
    expect(r!.totalLoss).toBe(40);
  });

  it("prioridade da taxa: snapshot vence a operadora quando não há carimbo", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao", amount: 950, gross_amount: 1000, card_installments: 5, card_operator_id: "infinite" }],
      { saldo_taxa_percent: 5.0 },
      [INFINITE],
    );
    expect(r!.details[0].taxa).toBe(5.0);
    expect(r!.totalLoss).toBe(50);
  });

  it("sem carimbo e sem snapshot: cai na taxa atual da operadora (taxa_credito_5x)", () => {
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao", amount: 945.1, gross_amount: 1000, card_installments: 5, card_operator_id: "infinite" }],
      {},
      [INFINITE],
    );
    expect(r!.details[0].taxa).toBe(5.49);
    expect(r!.totalLoss).toBe(54.9);
  });

  it("entrada usa o snapshot de entrada; soma entrada + parcela", () => {
    const r = computeCardFeeLoss(
      [
        { type: "entrada", payment_method: "cartao", amount: 969.1, gross_amount: 1000, card_operator_id: "infinite" },
        { type: "parcela", payment_method: "cartao", amount: 1890.2, gross_amount: 2000, card_fee_percent: 5.49, card_installments: 5, card_operator_id: "infinite" },
      ],
      { entrada_taxa_percent: 3.09, entrada_parcelas: 1 },
      [INFINITE],
    );
    // entrada: 1000 * 3,09% = 30,90 ; parcela: 2000 * 5,49% = 109,80
    expect(r!.totalLoss).toBe(140.7);
    expect(r!.details).toHaveLength(2);
  });

  it("taxa zero (operadora sem tarifa e sem snapshot) → linha ignorada → null", () => {
    const semTarifa: CardFeeRow = { id: "x", operator_name: "Sem Taxa" };
    const r = computeCardFeeLoss(
      [{ type: "parcela", payment_method: "cartao", amount: 1000, gross_amount: 1000, card_installments: 5, card_operator_id: "x" }],
      {},
      [semTarifa],
    );
    expect(r).toBeNull();
  });
});
