import { describe, it, expect, vi, beforeEach } from "vitest";
import { csvCell, exportLeadsToCSV } from "@/components/admin/exportLeads";
import type { Lead } from "@/types/crm";

const mockLead: Lead = {
  id: "1",
  name: "João Silva",
  whatsapp: "5511999887766",
  unit: "Unidade 1",
  month: "Janeiro",
  day_of_month: 15,
  day_preference: null,
  guests: "50",
  campaign_id: "camp1",
  campaign_name: "Campanha Teste",
  created_at: "2025-06-15T10:00:00Z",
  status: "novo",
  responsavel_id: null,
  observacoes: "Teste obs",
};

describe("exportLeadsToCSV", () => {
  let blobContent: string;

  beforeEach(() => {
    blobContent = "";

    vi.stubGlobal("Blob", class MockBlob {
      constructor(parts: any[]) {
        blobContent = parts.join("");
      }
      size = 0;
      type = "text/csv";
    });

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);
    vi.spyOn(document, "createElement").mockReturnValue({
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    } as unknown as HTMLElement);
  });

  it("includes correct headers", () => {
    exportLeadsToCSV({ leads: [mockLead], responsaveis: [] });
    expect(blobContent).toContain("Nome");
    expect(blobContent).toContain("WhatsApp");
    expect(blobContent).toContain("Status");
    expect(blobContent).toContain("Responsável");
  });

  it("masks phone when canViewContact is false", () => {
    exportLeadsToCSV({ leads: [mockLead], responsaveis: [], canViewContact: false });
    expect(blobContent).not.toContain("5511999887766");
    expect(blobContent).toContain("5511****7766");
  });

  it("shows full phone when canViewContact is true", () => {
    exportLeadsToCSV({ leads: [mockLead], responsaveis: [], canViewContact: true });
    expect(blobContent).toContain("5511999887766");
  });

  it("includes lead data in CSV", () => {
    exportLeadsToCSV({ leads: [mockLead], responsaveis: [] });
    expect(blobContent).toContain("João Silva");
    expect(blobContent).toContain("Unidade 1");
    expect(blobContent).toContain("Novo");
  });

  it("aspas no nome não quebram a planilha", () => {
    exportLeadsToCSV({ leads: [{ ...mockLead, name: 'Ana "Festa"', observacoes: "linha 1\nlinha 2" }], responsaveis: [] });
    expect(blobContent).toContain('"Ana ""Festa"""');
    expect(blobContent).toContain('"linha 1 linha 2"');
  });

  it("mostra o nome da campanha", () => {
    exportLeadsToCSV({ leads: [mockLead], responsaveis: [] });
    expect(blobContent).toContain("Campanha Teste");
  });
});

describe("csvCell", () => {
  it("texto que parece fórmula ganha apóstrofo", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+55 11")).toBe('"\'+55 11"');
    expect(csvCell("@maria")).toBe('"\'@maria"');
    expect(csvCell("-")).toBe('"\'-"');
  });

  it("vazio e números", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(50)).toBe('"50"');
    expect(csvCell("João")).toBe('"João"');
  });
});
