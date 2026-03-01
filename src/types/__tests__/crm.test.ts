import { describe, it, expect } from "vitest";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  ROLE_LABELS,
  type LeadStatus,
  type AppRole,
} from "@/types/crm";

const ALL_STATUSES: LeadStatus[] = [
  "novo", "em_contato", "orcamento_enviado", "aguardando_resposta",
  "fechado", "perdido", "transferido", "trabalhe_conosco",
  "fornecedor", "cliente_retorno", "outros",
];

const ALL_ROLES: AppRole[] = ["admin", "gestor", "comercial", "visualizacao"];

describe("CRM type maps", () => {
  it("every LeadStatus has a label", () => {
    ALL_STATUSES.forEach((s) => expect(LEAD_STATUS_LABELS[s]).toBeTruthy());
  });

  it("every LeadStatus has a color", () => {
    ALL_STATUSES.forEach((s) => expect(LEAD_STATUS_COLORS[s]).toBeTruthy());
  });

  it("labels and colors have the same keys", () => {
    expect(Object.keys(LEAD_STATUS_LABELS).sort()).toEqual(Object.keys(LEAD_STATUS_COLORS).sort());
  });

  it("every AppRole has a label", () => {
    ALL_ROLES.forEach((r) => expect(ROLE_LABELS[r]).toBeTruthy());
  });
});
