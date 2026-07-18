import { describe, it, expect } from "vitest";
import {
  calcCardFee,
  splitNonAntecipadoInstallments,
  type CardFeeRow,
} from "@/lib/cardFees";

// Operadora igual à "Infinite Pay" usada na festa da Manuella (crédito 5x = 5,49%).
const infinitePay: CardFeeRow = {
  id: "op-infinite",
  operator_name: "Infinite Pay",
  antecipado: true,
  taxa_debito: 1.5,
  prazo_recebimento_dias: 1,
  taxa_credito_1x: 3.5,
  taxa_credito_5x: 5.49,
  taxa_credito_12x: 12,
};

describe("calcCardFee — quanto o buffet recebe (líquido) no cartão", () => {
  // CASO REAL — festa da Manuella. O valor JÁ COM DESCONTO é R$ 7.641,50
  // (festa 7.400 + suco 483 − desconto 241,50). No crédito 5x (5,49%), o
  // líquido tem que ser R$ 7.221,98. É este número que o caixa deve dar baixa.
  it("festa da Manuella: R$ 7.641,50 no crédito 5x (5,49%) → líquido R$ 7.221,98", () => {
    const r = calcCardFee({
      grossAmount: 7641.5,
      method: "cartao_credito",
      installments: 5,
      operator: infinitePay,
    });
    expect(r.feePercent).toBe(5.49);
    expect(r.feeAmount).toBe(419.52);
    expect(r.netAmount).toBe(7221.98);
  });

  it("método que não é cartão (pix) não desconta taxa — recebe o valor cheio", () => {
    const r = calcCardFee({ grossAmount: 1000, method: "pix", installments: 1, operator: infinitePay });
    expect(r.feeAmount).toBe(0);
    expect(r.netAmount).toBe(1000);
  });

  it("sem operadora configurada, devolve o valor cheio (não inventa taxa)", () => {
    const r = calcCardFee({ grossAmount: 1000, method: "cartao_credito", installments: 3, operator: null });
    expect(r.netAmount).toBe(1000);
  });

  it("débito usa a taxa de débito e força 1 parcela", () => {
    const r = calcCardFee({ grossAmount: 1000, method: "cartao_debito", installments: 5, operator: infinitePay });
    expect(r.installments).toBe(1);
    expect(r.feePercent).toBe(1.5);
    expect(r.feeAmount).toBe(15);
    expect(r.netAmount).toBe(985);
  });

  it("crédito à vista (1x) usa a taxa de 1x", () => {
    const r = calcCardFee({ grossAmount: 1000, method: "cartao_credito", installments: 1, operator: infinitePay });
    expect(r.feePercent).toBe(3.5);
    expect(r.netAmount).toBe(965);
  });

  it("acima de 12x, limita a 12 parcelas (usa a taxa de 12x)", () => {
    const r = calcCardFee({ grossAmount: 1000, method: "cartao_credito", installments: 15, operator: infinitePay });
    expect(r.installments).toBe(12);
    expect(r.feePercent).toBe(12);
    expect(r.netAmount).toBe(880);
  });
});

describe("splitNonAntecipadoInstallments — parcelas líquidas quando NÃO há antecipação", () => {
  it("1 parcela não é dividida (retorna null)", () => {
    expect(splitNonAntecipadoInstallments(1000, 5, 1, "2026-01-10", 30)).toBeNull();
  });

  it("divide o líquido em N parcelas e a soma fecha com o líquido total", () => {
    const slices = splitNonAntecipadoInstallments(1000, 5, 2, "2026-01-10", 30)!;
    expect(slices).toHaveLength(2);
    const soma = Math.round(slices.reduce((s, p) => s + p.amount, 0) * 100) / 100;
    expect(soma).toBe(950); // 1000 − 5%
  });

  it("com resto (3x), a diferença de centavos vai na última parcela e a soma fecha", () => {
    const slices = splitNonAntecipadoInstallments(1000, 5, 3, "2026-01-10", 30)!;
    expect(slices).toHaveLength(3);
    const soma = Math.round(slices.reduce((s, p) => s + p.amount, 0) * 100) / 100;
    expect(soma).toBe(950);
  });

  it("1ª parcela cai em +prazo dias; as seguintes a cada +30 dias", () => {
    const slices = splitNonAntecipadoInstallments(1000, 5, 2, "2026-01-10", 30)!;
    expect(slices[0].due_date).toBe("2026-02-09"); // 10/01 + 30
    expect(slices[1].due_date).toBe("2026-03-11"); // + 30
  });
});
