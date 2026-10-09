import { describe, expect, it } from "vitest";
import { packageValueFromTotal, samePaymentPlan } from "../eventPaymentPlan";

describe("samePaymentPlan", () => {
  it("igual mesmo com as chaves em outra ordem (o banco reordena)", () => {
    const a = { entrada_valor: 500, saldo_valor: 1500, parcelas: 3, parcelas_details: [{ valor: 500, vencimento: "2026-11-10" }] };
    const b = { parcelas_details: [{ vencimento: "2026-11-10", valor: 500 }], parcelas: 3, saldo_valor: 1500, entrada_valor: 500 };
    expect(samePaymentPlan(a, b)).toBe(true);
  });

  it("diferente quando muda valor, parcela ou forma", () => {
    const a = { entrada_valor: 500, saldo_valor: 1500, saldo_forma: "pix" };
    expect(samePaymentPlan(a, { ...a, saldo_valor: 1600 })).toBe(false);
    expect(samePaymentPlan(a, { ...a, saldo_forma: "cartao" })).toBe(false);
    expect(samePaymentPlan(a, { ...a, parcelas: 2 })).toBe(false);
  });

  it("sem plano antes ou depois: trata como mudado", () => {
    expect(samePaymentPlan(null, { a: 1 })).toBe(false);
    expect(samePaymentPlan({ a: 1 }, null)).toBe(false);
  });

  it("chave com undefined conta como ausente", () => {
    expect(samePaymentPlan({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});

describe("packageValueFromTotal", () => {
  it("sem desconto: total menos opcionais", () => {
    expect(packageValueFromTotal({ total: 5000, optionalsTotal: 800 })).toBe(4200);
  });

  it("desconto % sobre o total com opcionais volta ao pacote certo (não encolhe)", () => {
    // pacote 4000 + opcionais 1000 = 5000; 10% = 4500
    expect(packageValueFromTotal({ total: 4500, optionalsTotal: 1000, discountType: "percentage", discountValue: 10, discountBase: "total" })).toBe(4000);
  });

  it("desconto % sobre o pacote", () => {
    // pacote 4000 × 0,9 = 3600 + opcionais 1000 = 4600
    expect(packageValueFromTotal({ total: 4600, optionalsTotal: 1000, discountType: "percentage", discountValue: 10, discountBase: "pacote" })).toBe(4000);
  });

  it("desconto fixo", () => {
    expect(packageValueFromTotal({ total: 4700, optionalsTotal: 1000, discountType: "fixed", discountValue: 300, discountBase: "total" })).toBe(4000);
    expect(packageValueFromTotal({ total: 4700, optionalsTotal: 1000, discountType: "fixed", discountValue: 300, discountBase: "pacote" })).toBe(4000);
  });

  it("100% de desconto não divide por zero", () => {
    expect(packageValueFromTotal({ total: 0, optionalsTotal: 0, discountType: "percentage", discountValue: 100 })).toBe(0);
  });

  it("sem total", () => {
    expect(packageValueFromTotal({ total: null, optionalsTotal: 0 })).toBeNull();
  });
});
