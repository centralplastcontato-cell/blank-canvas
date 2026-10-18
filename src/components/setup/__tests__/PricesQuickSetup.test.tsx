import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { PricesQuickSetup, type PricesQuickSetupHandle } from "../PricesQuickSetup";

const invoke = vi.fn(async (_fn: string, { body }: { body: Record<string, unknown> }) =>
  body.action === "prices-load" ? { data: { guest_tiers: null, packages: [] }, error: null } : { data: { ok: true, packages: ["p1"] }, error: null });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...(a as [string, { body: Record<string, unknown> }])) } } }));

describe("PricesQuickSetup", () => {
  it("sem valores, pula sem chamar o servidor", async () => {
    const ref = createRef<PricesQuickSetupHandle>();
    render(<PricesQuickSetup ref={ref} companyId="c" />);
    await screen.findByText("Valores dos pacotes");
    invoke.mockClear();
    expect(await ref.current!.save()).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("valor digitado como app de banco e enviado em reais", async () => {
    const ref = createRef<PricesQuickSetupHandle>();
    render(<PricesQuickSetup ref={ref} companyId="c" />);
    const cell = await screen.findByLabelText("Pacote, 70 convidados, Sáb e Dom");
    fireEvent.change(cell, { target: { value: "390000" } });
    expect((cell as HTMLInputElement).value).toBe("3.900,00");
    invoke.mockClear();
    await act(async () => { expect(await ref.current!.save()).toBe(true); });
    const body = invoke.mock.calls[0][1].body as { guest_tiers: number[]; packages: Array<{ name: string; prices: Record<string, number> }> };
    expect(body.guest_tiers).toEqual([50, 70, 100]);
    expect(body.packages[0].prices["70_sab_dom"]).toBe(3900);
  });
});
