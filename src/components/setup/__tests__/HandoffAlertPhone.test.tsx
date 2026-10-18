import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HandoffAlertPhone } from "../HandoffAlertPhone";

const update = vi.fn((_patch: unknown) => ({ eq: async () => ({ error: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { handoff_alert_phone: null } }) }) }),
      update: (patch: unknown) => update(patch),
    }),
  },
}));

describe("HandoffAlertPhone", () => {
  it("vazio por padrão e salva só os números", async () => {
    render(<HandoffAlertPhone companyId="c" />);
    const input = await screen.findByLabelText("WhatsApp do alerta");
    expect((input as HTMLInputElement).value).toBe("");
    fireEvent.change(input, { target: { value: "(15) 99999-0000" } });
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ handoff_alert_phone: "15999990000" }));
  });
});
