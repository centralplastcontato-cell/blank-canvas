import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Comecar from "../Comecar";
import LegalPage from "../LegalPage";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() }, auth: {} } }));

const wrap = (ui: React.ReactNode) => render(<HelmetProvider><MemoryRouter>{ui}</MemoryRouter></HelmetProvider>);

describe("Termos no cadastro", () => {
  it("só libera o botão depois de aceitar os termos", () => {
    wrap(<Comecar />);
    const btn = screen.getByRole("button", { name: /Criar conta e começar/ });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(btn).toBeEnabled();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/termos");
  });

  it("mostra as páginas de termos e privacidade", () => {
    wrap(<LegalPage doc="termos" />);
    expect(screen.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeInTheDocument();
    expect(screen.getByText("13. Foro")).toBeInTheDocument();
  });
});
