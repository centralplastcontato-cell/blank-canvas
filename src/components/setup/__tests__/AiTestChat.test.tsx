import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AiTestChat } from "../AiTestChat";

const invoke = vi.fn(async () => ({ data: { state: { sandbox: {} }, replies: [{ kind: "text", text: "Oi! Para 70 pessoas no sábado fica R$ 3.900,00 ✨" }], handoff: false, left: 19 }, error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...(a as [])) } } }));

describe("AiTestChat", () => {
  it("manda a mensagem do cliente e mostra a resposta da IA", async () => {
    render(<AiTestChat open onOpenChange={() => {}} companyId="c" />);
    fireEvent.click(screen.getByText("Oi, quanto fica uma festa pra 70 pessoas?"));
    expect(await screen.findByText(/R\$ 3\.900,00/)).toBeTruthy();
    expect(screen.getByText("19 mensagem(ns) restante(s) neste teste")).toBeTruthy();
    expect(invoke).toHaveBeenCalledWith("ai-simulator", { body: expect.objectContaining({ action: "chat", company_id: "c", state: null }) });
  });
});
