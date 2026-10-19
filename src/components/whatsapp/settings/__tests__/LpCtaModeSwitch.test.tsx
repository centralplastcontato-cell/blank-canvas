import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LpCtaModeSwitch } from "../LpCtaModeSwitch";

const update = vi.fn((_p: unknown) => ({ eq: async () => ({ error: null }) }));
let admin = true;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u" } } }) },
    rpc: async () => ({ data: admin }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { hero: { title: "Oi", cta_text: "Quero fazer a festa!" } } }) }) }),
      update: (p: unknown) => update(p),
    }),
  },
}));

describe("LpCtaModeSwitch", () => {
  it("desliga as perguntas sem perder o resto da hero", async () => {
    render(<LpCtaModeSwitch companyId="c" />);
    const sw = await screen.findByRole("switch", { name: "Perguntas antes do WhatsApp" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ hero: { title: "Oi", cta_text: "Quero fazer a festa!", cta_mode: "whatsapp" } }));
  });

  it("quem não é da equipe Celebrei não vê", async () => {
    admin = false;
    const { container } = render(<LpCtaModeSwitch companyId="c" />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
  });
});
