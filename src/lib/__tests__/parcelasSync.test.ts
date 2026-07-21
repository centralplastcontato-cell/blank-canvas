import { describe, it, expect } from "vitest";
import {
  pendingPlanParcelas,
  computeAdjustment,
  isAdjustmentRow,
  ADJUSTMENT_NOTE_PREFIX,
} from "../parcelasSync";

// Caso real: Herly Meschke Costa (Mega Magic), festa 25/07/2026.
// Plano de 6 parcelas somando 13.113,39; saldo registrado 11.532,40 (dado torto,
// +1.580,99); parcelas 1 e 2 pagas (3.000,00 + 2.420,97 = 5.420,97).
const HERLY_PLAN = [
  { valor: 3000.0, vencimento: "2026-03-31" },
  { valor: 2420.97, vencimento: "2026-05-28" },
  { valor: 2245.8, vencimento: "2026-06-01" },
  { valor: 1906.29, vencimento: "2026-07-01" },
  { valor: 2360.33, vencimento: "2026-07-01" },
  { valor: 1180.0, vencimento: "2026-07-17" },
];
const HERLY_PAID = [
  { amount: 3000.0, status: "paid", type: "parcela" },
  { amount: 2420.97, status: "paid", type: "parcela" },
];

describe("isAdjustmentRow", () => {
  it("reconhece a parcela de ajuste pelo prefixo das notas", () => {
    expect(isAdjustmentRow({ amount: 1, notes: `${ADJUSTMENT_NOTE_PREFIX} (R$ 6111.43)` })).toBe(true);
    expect(isAdjustmentRow({ amount: 1, notes: "Parcela 2/6" })).toBe(false);
    expect(isAdjustmentRow({ amount: 1 })).toBe(false);
  });
});

describe("pendingPlanParcelas", () => {
  it("caso Herly (plano ≠ saldo): NÃO recria do plano (retorna null) — recriar cobraria a mais", () => {
    expect(pendingPlanParcelas(HERLY_PLAN, 11532.4, HERLY_PAID)).toBeNull();
  });

  it("plano consistente com pagas casando: recria só as pendentes, preservando datas", () => {
    // Mesmo plano do Herly, mas com o saldo batendo com a soma (13.113,39)
    const out = pendingPlanParcelas(HERLY_PLAN, 13113.39, HERLY_PAID);
    expect(out).not.toBeNull();
    expect(out!.map((p) => p.valor)).toEqual([2245.8, 1906.29, 2360.33, 1180.0]);
    expect(out![0].vencimento).toBe("2026-06-01");
  });

  it("todas pagas: retorna lista vazia (nada a criar)", () => {
    const plan = [
      { valor: 500, vencimento: "2026-01-10" },
      { valor: 500, vencimento: "2026-02-10" },
    ];
    const paid = [
      { amount: 500, status: "paid" },
      { amount: 500, status: "paid" },
    ];
    expect(pendingPlanParcelas(plan, 1000, paid)).toEqual([]);
  });

  it("parcela paga que não casa com o plano: null (plano mudou depois do pagamento)", () => {
    const plan = [
      { valor: 600, vencimento: "" },
      { valor: 400, vencimento: "" },
    ];
    const paid = [{ amount: 350, status: "paid" }];
    expect(pendingPlanParcelas(plan, 1000, paid)).toBeNull();
  });

  it("parcelas pagas de cartão casam pelo bruto (gross_amount), não pelo líquido", () => {
    const plan = [
      { valor: 1000, vencimento: "2026-04-01" },
      { valor: 1000, vencimento: "2026-05-01" },
    ];
    const paid = [{ amount: 945.1, gross_amount: 1000, status: "paid" }];
    const out = pendingPlanParcelas(plan, 2000, paid);
    expect(out).not.toBeNull();
    expect(out!.map((p) => p.vencimento)).toEqual(["2026-05-01"]);
  });

  it("valores iguais no plano: cada paga consome UMA parcela (em ordem)", () => {
    const plan = [
      { valor: 500, vencimento: "2026-01-10" },
      { valor: 500, vencimento: "2026-02-10" },
      { valor: 500, vencimento: "2026-03-10" },
    ];
    const paid = [{ amount: 500, status: "paid" }];
    const out = pendingPlanParcelas(plan, 1500, paid);
    expect(out!.map((p) => p.vencimento)).toEqual(["2026-02-10", "2026-03-10"]);
  });

  it("sem plano, plano com valor vazio, ou sem saldo: null (não arriscar)", () => {
    expect(pendingPlanParcelas([], 1000, [])).toBeNull();
    expect(pendingPlanParcelas(null, 1000, [])).toBeNull();
    expect(
      pendingPlanParcelas([{ valor: null, vencimento: "" }, { valor: 500, vencimento: "" }], 1000, []),
    ).toBeNull();
    expect(pendingPlanParcelas([{ valor: 500, vencimento: "" }], null, [])).toBeNull();
  });
});

describe("computeAdjustment", () => {
  const OPTS = { tolerance: 1, eventDate: "2026-07-25", today: "2026-07-21" };

  it("parcelas cobrem o total: nada a fazer", () => {
    const rows = [
      { amount: 5000, status: "paid" },
      { amount: 5000, status: "pending" },
    ];
    expect(computeAdjustment(10000, rows, OPTS)).toEqual({ action: "none" });
  });

  it("caso Herly hoje: pagas 5.420,97 + ajuste pendente 6.111,43 já correto → NADA (fim do loop)", () => {
    const rows = [
      { amount: 3000, status: "paid", type: "parcela" },
      { amount: 2420.97, status: "paid", type: "parcela" },
      { amount: 6111.43, status: "pending", notes: `${ADJUSTMENT_NOTE_PREFIX} (R$ 6111.43)` },
    ];
    expect(computeAdjustment(11532.4, rows, OPTS)).toEqual({ action: "none" });
  });

  it("falta valor e não há ajuste: INSERE vencendo na data da festa (não 'hoje')", () => {
    const rows = [
      { amount: 3000, status: "paid" },
      { amount: 2420.97, status: "paid" },
    ];
    expect(computeAdjustment(11532.4, rows, OPTS)).toEqual({
      action: "insert",
      amount: 6111.43,
      dueDate: "2026-07-25",
    });
  });

  it("festa já passou: ajuste novo vence hoje (nunca em data passada)", () => {
    const rows = [{ amount: 3000, status: "paid" }];
    const r = computeAdjustment(4000, rows, { tolerance: 1, eventDate: "2026-07-10", today: "2026-07-21" });
    expect(r).toEqual({ action: "insert", amount: 1000, dueDate: "2026-07-21" });
  });

  it("total mudou (ex.: novo opcional): ATUALIZA o ajuste existente em vez de duplicar", () => {
    const rows = [
      { amount: 5420.97, status: "paid" },
      { amount: 6111.43, status: "pending", notes: `${ADJUSTMENT_NOTE_PREFIX} (R$ 6111.43)` },
    ];
    expect(computeAdjustment(11832.4, rows, OPTS)).toEqual({ action: "update", amount: 6411.43 });
  });

  it("parcelas do plano passaram a cobrir o total: REMOVE o ajuste sobrando", () => {
    const rows = [
      { amount: 5420.97, status: "paid" },
      { amount: 6111.43, status: "pending", type: "parcela" }, // parcela real recriada do plano
      { amount: 6111.43, status: "pending", notes: `${ADJUSTMENT_NOTE_PREFIX} (R$ 6111.43)` },
    ];
    expect(computeAdjustment(11532.4, rows, OPTS)).toEqual({ action: "delete" });
  });

  it("ajuste PAGO conta como dinheiro real (não é removido nem recriado)", () => {
    const rows = [
      { amount: 5420.97, status: "paid" },
      { amount: 6111.43, status: "paid", notes: `${ADJUSTMENT_NOTE_PREFIX} (R$ 6111.43)` },
    ];
    expect(computeAdjustment(11532.4, rows, OPTS)).toEqual({ action: "none" });
  });

  it("resíduo de centavos no cartão parcelado: tolerância maior evita linha fantasma", () => {
    const rows = [{ amount: 950, gross_amount: 1000, status: "paid" }];
    // R$ 3,50 de resíduo com tolerância 5 (cartão sem antecipação): nada
    expect(computeAdjustment(1003.5, rows, { tolerance: 5, eventDate: null, today: "2026-07-21" })).toEqual({
      action: "none",
    });
  });
});
