import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/supabase-helpers", () => ({ getCurrentCompanyId: () => "c1" }));

import { visitMovesLeadStatus } from "../visitLeadStatus";

describe("visita registrada à mão muda o lead para Visita", () => {
  it("Novo, Negociando, Orçamento enviado e Cliente Retorno viram Visita", () => {
    for (const s of ["novo", "aguardando_resposta", "orcamento_enviado", "cliente_retorno"]) {
      expect(visitMovesLeadStatus("visita", "agendada", s)).toBe(true);
    }
  });

  it("Fechado, Perdido e outros ficam como estão", () => {
    for (const s of ["fechado", "perdido", "trabalhe_conosco", "fornecedor", "em_contato", null]) {
      expect(visitMovesLeadStatus("visita", "agendada", s)).toBe(false);
    }
  });

  it("atendimento (entrega/retirada) e visita já realizada não mudam", () => {
    expect(visitMovesLeadStatus("atendimento", "agendada", "novo")).toBe(false);
    expect(visitMovesLeadStatus("visita", "realizada", "novo")).toBe(false);
    expect(visitMovesLeadStatus(undefined, "confirmada", "novo")).toBe(true);
  });
});
