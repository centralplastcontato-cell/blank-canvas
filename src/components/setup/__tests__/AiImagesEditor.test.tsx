import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AiImagesEditor } from "../AiImagesEditor";

const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { intro_image_url: "https://x/frente.jpg", followup_config: null } }) }) }),
      update: (patch: unknown) => update(patch),
    }),
    functions: { invoke: vi.fn() },
  },
}));

describe("AiImagesEditor", () => {
  it("mostra a imagem da 1ª mensagem e os follow-ups, e tira só a escolhida", async () => {
    render(<AiImagesEditor companyId="c" showFollowUps />);
    expect(await screen.findByText("Imagem da primeira mensagem")).toBeTruthy();
    expect(screen.getByText("1º follow-up")).toBeTruthy();
    expect(screen.getByText(/follow-ups ainda estão desligados/)).toBeTruthy();
    fireEvent.click(screen.getAllByLabelText("Tirar imagem")[0]);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ intro_image_url: null }));
  });
});
