import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MaterialsQuickSetup } from "../MaterialsQuickSetup";

vi.mock("@/lib/aiMaterials", () => ({
  loadAiMaterials: vi.fn(async () => [
    { id: "1", type: "pdf_package", name: "Pacotes", file_url: "https://x/a.pdf", photo_urls: null, guest_count: null },
    { id: "2", type: "pdf_package", name: "Pacotes 70", file_url: "https://x/b.pdf", photo_urls: null, guest_count: 70 },
  ]),
  uploadAiMaterial: vi.fn(),
  removeAiMaterial: vi.fn(),
}));

describe("MaterialsQuickSetup", () => {
  it("lista os PDFs com a faixa de convidados", async () => {
    render(<MaterialsQuickSetup companyId="c" unit="u" sitePhotos={["https://x/f.jpg"]} />);
    expect(await screen.findByText("Para todas as quantidades")).toBeTruthy();
    expect(screen.getByText("Para 70 convidados")).toBeTruthy();
    expect(screen.getByText("Adicionar outro PDF")).toBeTruthy();
    expect(screen.getByText(/Usamos as 1 foto/)).toBeTruthy();
  });
});
