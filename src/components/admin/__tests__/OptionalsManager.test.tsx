import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { calls, rows } = vi.hoisted(() => ({
  calls: [] as { op: string; payload?: unknown }[],
  rows: [{ id: "o1", name: "Massa Show", description: null, value: null, valor_por_pessoa: 18, is_active: true, sort_order: 0 }],
}));

vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({ currentCompany: { id: "c1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => {
  const chain = (op: string, payload?: unknown) => {
    calls.push({ op, payload });
    const result = { data: op === "select" ? rows : null, error: null };
    const q: Record<string, unknown> = {};
    for (const m of ["eq", "order", "select"]) q[m] = () => q;
    q.then = (resolve: (v: unknown) => void) => resolve(result);
    return q;
  };
  return {
    supabase: {
      from: () => ({
        select: () => chain("select"),
        update: (p: unknown) => chain("update", p),
        delete: () => chain("delete"),
        insert: (p: unknown) => chain("insert", p),
      }),
    },
  };
});

import { OptionalsManager } from "../OptionalsManager";

describe("OptionalsManager", () => {
  beforeEach(() => { calls.length = 0; });

  it("a lixeira pergunta antes de apagar", async () => {
    render(<OptionalsManager />);
    await screen.findByText("Massa Show");
    fireEvent.click(screen.getByLabelText("Excluir opcional"));
    expect(await screen.findByText('Excluir o opcional "Massa Show"?')).toBeTruthy();
    expect(calls.some((c) => c.op === "delete")).toBe(false);
    fireEvent.click(screen.getByText("Excluir"));
    await waitFor(() => expect(calls.some((c) => c.op === "delete")).toBe(true));
  });

  it("pausar não apaga, só marca como inativo", async () => {
    render(<OptionalsManager />);
    await screen.findByText("Massa Show");
    fireEvent.click(screen.getByLabelText("Pausar opcional"));
    await waitFor(() => expect(calls.find((c) => c.op === "update")?.payload).toEqual({ is_active: false }));
    expect(screen.getByText("Pausado")).toBeTruthy();
    expect(calls.some((c) => c.op === "delete")).toBe(false);
  });
});
