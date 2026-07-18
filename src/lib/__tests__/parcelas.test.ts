import { describe, it, expect } from "vitest";
import { buildParcelasDetails } from "@/lib/parcelas";

describe("buildParcelasDetails — a lista de parcelas acompanha o saldo (com desconto)", () => {
  // Festa da Manuella: saldo JÁ COM desconto = 7.641,50, em 5x. A soma das parcelas
  // TEM que fechar em 7.641,50 — nunca em 7.883 (o valor pré-desconto do bug).
  it("saldo com desconto (7.641,50) em 5 parcelas → soma 7.641,50, nunca 7.883", () => {
    const parcelas = buildParcelasDetails(5, 7641.5);
    expect(parcelas).toHaveLength(5);
    const soma = Math.round(parcelas.reduce((s, p) => s + (p.valor ?? 0), 0) * 100) / 100;
    expect(soma).toBe(7641.5);
    expect(soma).not.toBe(7883);
    expect(parcelas.every((p) => p.valor === 1528.3)).toBe(true); // 7641,50 / 5
  });

  it("distribui o resto de centavos nas primeiras parcelas e a soma fecha", () => {
    const parcelas = buildParcelasDetails(3, 100);
    expect(parcelas.map((p) => p.valor)).toEqual([33.34, 33.33, 33.33]);
    const soma = Math.round(parcelas.reduce((s, p) => s + (p.valor ?? 0), 0) * 100) / 100;
    expect(soma).toBe(100);
  });

  it("preserva as datas de vencimento já informadas, mas recalcula os valores pelo saldo novo", () => {
    const existing = [
      { valor: 999, vencimento: "2026-03-01" },
      { valor: 999, vencimento: "2026-04-01" },
    ];
    const parcelas = buildParcelasDetails(2, 1000, existing);
    expect(parcelas[0].vencimento).toBe("2026-03-01");
    expect(parcelas[1].vencimento).toBe("2026-04-01");
    expect(parcelas[0].valor).toBe(500);
    expect(parcelas[1].valor).toBe(500);
  });

  it("saldo zero/nulo devolve parcelas sem valor", () => {
    expect(buildParcelasDetails(2, 0)).toEqual([
      { valor: null, vencimento: "" },
      { valor: null, vencimento: "" },
    ]);
  });

  it("0 ou nenhuma parcela devolve lista vazia", () => {
    expect(buildParcelasDetails(0, 1000)).toEqual([]);
    expect(buildParcelasDetails(null, 1000)).toEqual([]);
  });
});
