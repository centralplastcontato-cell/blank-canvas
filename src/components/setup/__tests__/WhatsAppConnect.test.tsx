import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WhatsAppConnect } from "../WhatsAppConnect";

const calls: string[] = [];
let connected = false;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: async (_fn: string, { body }: { body: { action: string } }) => {
        calls.push(body.action);
        if (body.action === "state") return { data: { status: "none" }, error: null };
        if (body.action === "start") return { data: { status: "pending" }, error: null };
        if (body.action === "qr") return { data: connected ? { status: "connected", phone: "5515999990000" } : { status: "pending", qrcode: "data:image/png;base64,AAA" }, error: null };
        if (body.action === "pair") return { data: { status: "pending", code: "ABCD-EFGH" }, error: null };
        return { data: { status: "pending" }, error: null };
      },
    },
  },
}));

describe("WhatsAppConnect", () => {
  it("cria, mostra o QR e avisa quando conecta", async () => {
    render(<WhatsAppConnect companyId="c" />);
    fireEvent.click(await screen.findByText("Conectar meu WhatsApp"));
    expect(await screen.findByAltText("QR Code do WhatsApp")).toHaveAttribute("src", "data:image/png;base64,AAA");
    expect(calls).toEqual(["state", "start", "qr"]);
    connected = true;
    await waitFor(() => expect(screen.getByText(/WhatsApp conectado: \(15\) 99999-0000/)).toBeInTheDocument(), { timeout: 7000 });
  }, 10000);

  it("no celular: gera o código de pareamento", async () => {
    connected = false;
    calls.length = 0;
    render(<WhatsAppConnect companyId="c" defaultPhone="15999990000" />);
    fireEvent.click(await screen.findByText("Conectar meu WhatsApp"));
    fireEvent.click(await screen.findByText("Estou no celular"));
    fireEvent.click(screen.getByText("Gerar código"));
    expect(await screen.findByText("ABCD-EFGH")).toBeInTheDocument();
    expect(calls).toContain("pair");
  });
});
