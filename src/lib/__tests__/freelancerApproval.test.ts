import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { DEFAULT_CANDIDATE_APPROVAL_MESSAGE, fillApprovalMessage, toApprovalTemplate } from "../freelancerApproval";

describe("mensagem de candidato aprovado", () => {
  it("preenche nome e empresa", () => {
    const text = fillApprovalMessage(DEFAULT_CANDIDATE_APPROVAL_MESSAGE, "Vitor", "Castelo da Diversão");
    expect(text.startsWith("Oi, Vitor! 😊")).toBe(true);
    expect(text).toContain("Aqui é do Castelo da Diversão.");
    expect(text).not.toMatch(/\{nome\}|\{empresa\}/);
    // Não promete vaga nem "faz parte do time"
    expect(text).not.toMatch(/faz(er)? parte|escalad/i);
  });

  it("texto editado volta a ser modelo para salvar como padrão", () => {
    const edited = "Oi, José! Aqui é do Castelo da Diversão. José, a gente te chama. Josefina não muda.";
    expect(toApprovalTemplate(edited, "José", "Castelo da Diversão"))
      .toBe("Oi, {nome}! Aqui é do {empresa}. {nome}, a gente te chama. Josefina não muda.");
  });
});
