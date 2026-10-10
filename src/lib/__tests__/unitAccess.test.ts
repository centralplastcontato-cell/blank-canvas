import { describe, expect, it } from "vitest";
import { visitUnitAccess } from "../unitAccess";

describe("visitUnitAccess", () => {
  it("quem vê tudo vê tudo", () => {
    expect(visitUnitAccess(true, ["Unidade A"], false)("Unidade B")).toBe(true);
  });

  it("restrito: só a unidade permitida (sem diferenciar maiúscula) e as sem unidade", () => {
    const can = visitUnitAccess(false, ["Unidade A"], false);
    expect(can("unidade a ")).toBe(true);
    expect(can("Unidade B")).toBe(false);
    expect(can(null)).toBe(true);
  });

  it("canal de venda ou carregando não restringe", () => {
    expect(visitUnitAccess(false, ["Vendas 1"], false)("Unidade B")).toBe(true);
    expect(visitUnitAccess(false, ["Unidade A"], true)("Unidade B")).toBe(true);
  });
});
