import { describe, expect, it } from "vitest";
import { matchesExpenseSearch } from "../expenseSearch";

const pama = { description: "Pama - Comercio de alimentos", category: "alimentacao", notes: "Referente compra de insumos pra cozinha de produção", expense_date: "2026-04-01", amount: 1325.41 };
const aluguel = { description: "Aluguel", category: "Aluguel", expense_date: "2026-04-01", amount: 5000 };

describe("busca de despesas", () => {
  it("por nome, sem diferenciar maiúscula e acento", () => {
    expect(matchesExpenseSearch(pama, "pama")).toBe(true);
    expect(matchesExpenseSearch(pama, "PRODUCAO")).toBe(true);
    expect(matchesExpenseSearch(aluguel, "claro")).toBe(false);
  });
  it("por data", () => {
    expect(matchesExpenseSearch(pama, "01/04")).toBe(true);
    expect(matchesExpenseSearch(pama, "01/04/2026")).toBe(true);
    expect(matchesExpenseSearch(pama, "1/4/2026")).toBe(true);
    expect(matchesExpenseSearch(pama, "04/2026")).toBe(true);
    expect(matchesExpenseSearch(pama, "abril")).toBe(true);
    expect(matchesExpenseSearch(pama, "02/04")).toBe(false);
  });
  it("por valor", () => {
    expect(matchesExpenseSearch(pama, "1.325,41")).toBe(true);
    expect(matchesExpenseSearch(pama, "1325")).toBe(true);
    expect(matchesExpenseSearch(aluguel, "5.000")).toBe(true);
  });
  it("várias palavras: todas precisam bater", () => {
    expect(matchesExpenseSearch(aluguel, "aluguel abril")).toBe(true);
    expect(matchesExpenseSearch(aluguel, "aluguel maio")).toBe(false);
  });
  it("vazio mostra tudo", () => {
    expect(matchesExpenseSearch(aluguel, "  ")).toBe(true);
  });
});
