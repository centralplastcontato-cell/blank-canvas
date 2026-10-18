import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AiHandoffReasons, appendTaughtAnswer } from "../AiHandoffReasons";

const update = vi.fn((_patch: unknown) => ({ eq: async () => ({ error: null }) }));
const chain = (result: unknown) => {
  const c: Record<string, unknown> = {};
  for (const k of ["select", "eq", "gte", "order", "in"]) c[k] = () => c;
  c.limit = async () => result;
  c.maybeSingle = async () => result;
  c.then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r);
  return c;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => t === "lead_history"
      ? chain({ data: [{ id: "h1", created_at: "2026-10-17T15:00:00Z", lead_id: "l1", new_value: "Motivo: cliente perguntou se pode levar cachorro" }] })
      : t === "campaign_leads"
      ? chain({ data: [{ id: "l1", name: "Ana" }] })
      : { ...chain({ data: { extra_instructions: "Endereço: Rua X" } }), update: (p: unknown) => update(p) },
  },
}));

describe("AiHandoffReasons", () => {
  it("junta a resposta no fim das informações", () => {
    expect(appendTaughtAnswer("Endereço: Rua X", "pet", " Pode, na coleira ")).toBe('Endereço: Rua X\nSobre "pet": Pode, na coleira');
    expect(appendTaughtAnswer(null, "pet", "Pode")).toBe('Outras informações: Sobre "pet": Pode');
  });

  it("lista o motivo e salva a resposta ensinada", async () => {
    render(<AiHandoffReasons companyId="c" />);
    expect(await screen.findByText("cliente perguntou se pode levar cachorro")).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ensinar"));
    fireEvent.change(screen.getByLabelText("Resposta para a IA"), { target: { value: "Pode, na coleira" } });
    fireEvent.click(screen.getByText("Salvar resposta"));
    await waitFor(() => expect(update).toHaveBeenCalledWith({
      extra_instructions: 'Endereço: Rua X\nSobre "cliente perguntou se pode levar cachorro": Pode, na coleira',
    }));
    expect(await screen.findByText("Ensinado")).toBeInTheDocument();
  });
});
