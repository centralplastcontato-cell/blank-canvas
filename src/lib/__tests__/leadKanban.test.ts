import { describe, expect, it } from "vitest";
import { kanbanColumnCount, neighborStatus } from "../leadKanban";

describe("neighborStatus", () => {
  it("anda dentro do funil e para em Fechado", () => {
    expect(neighborStatus("novo", -1)).toBeNull();
    expect(neighborStatus("novo", 1)).toBe("em_contato");
    expect(neighborStatus("orcamento_enviado", 1)).toBe("fechado");
    expect(neighborStatus("fechado", 1)).toBeNull();
  });

  it("as outras colunas não voltam para o funil", () => {
    expect(neighborStatus("perdido", -1)).toBeNull();
    expect(neighborStatus("perdido", 1)).toBe("transferido");
    expect(neighborStatus("fornecedor", 1)).toBe("outros");
    expect(neighborStatus("outros", 1)).toBeNull();
  });
});

describe("kanbanColumnCount", () => {
  const totals = { novo: 120, fechado: 47, realizada: 190, perdido: 3 };

  it("mostra o total real, não só os cartões carregados", () => {
    expect(kanbanColumnCount("novo", 50, totals)).toBe(120);
    expect(kanbanColumnCount("realizada", 190, totals)).toBe(190);
  });

  it("nunca menos que os cartões na tela; sem totais conta os cartões", () => {
    expect(kanbanColumnCount("perdido", 4, totals)).toBe(4);
    expect(kanbanColumnCount("outros", 2, totals)).toBe(2);
    expect(kanbanColumnCount("novo", 7)).toBe(7);
  });
});
