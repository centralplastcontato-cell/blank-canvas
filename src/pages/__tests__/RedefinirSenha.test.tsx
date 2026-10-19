import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import RedefinirSenha from "../RedefinirSenha";
import { RECOVERY_FLAG, detectRecovery } from "@/lib/passwordRecovery";

const reset = vi.fn(async (..._a: unknown[]) => ({ error: null }));
const updateUser = vi.fn(async (..._a: unknown[]) => ({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...a: unknown[]) => reset(...a),
      updateUser: (...a: unknown[]) => updateUser(...a),
      getSession: async () => ({ data: { session: { user: { id: "u" } } } }),
    },
  },
}));

const wrap = () => render(<HelmetProvider><RedefinirSenha /></HelmetProvider>);

describe("detectRecovery", () => {
  it("reconhece o link de recuperação e o link vencido", () => {
    expect(detectRecovery("#access_token=x&type=recovery", "")).toBe("recovery");
    expect(detectRecovery("#error=access_denied&error_code=otp_expired", "")).toBe("expired");
    expect(detectRecovery("#access_token=x&type=signup", "")).toBeNull();
    expect(detectRecovery("", "")).toBeNull();
  });
});

describe("RedefinirSenha", () => {
  beforeEach(() => sessionStorage.clear());

  it("sem link: pede o e-mail e manda o link para /redefinir-senha", async () => {
    wrap();
    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: " Dono@Buffet.com " } });
    fireEvent.click(screen.getByText("Mandar link"));
    await waitFor(() => expect(reset).toHaveBeenCalledWith("dono@buffet.com", { redirectTo: `${window.location.origin}/redefinir-senha` }));
    expect(await screen.findByText("Confira o seu e-mail")).toBeInTheDocument();
  });

  it("pelo link: troca a senha", async () => {
    sessionStorage.setItem(RECOVERY_FLAG, "recovery");
    wrap();
    fireEvent.change(await screen.findByLabelText("Senha nova"), { target: { value: "novaSenha1" } });
    fireEvent.change(screen.getByLabelText("Repita a senha nova"), { target: { value: "outra" } });
    fireEvent.click(screen.getByText("Salvar senha nova"));
    expect(await screen.findByText("As duas senhas não são iguais.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Repita a senha nova"), { target: { value: "novaSenha1" } });
    fireEvent.click(screen.getByText("Salvar senha nova"));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "novaSenha1" }));
    expect(await screen.findByText("Senha trocada!")).toBeInTheDocument();
    expect(sessionStorage.getItem(RECOVERY_FLAG)).toBeNull();
  });

  it("link vencido: oferece pedir outro", async () => {
    sessionStorage.setItem(RECOVERY_FLAG, "expired");
    wrap();
    fireEvent.click(await screen.findByText("Pedir link novo"));
    expect(screen.getByText("Esqueci minha senha")).toBeInTheDocument();
  });
});
