import { beforeEach, describe, expect, it } from "vitest";
import { clearCampaignDraft, hasDraftContent, loadCampaignDraft, saveCampaignDraft } from "../campaignDraft";

const empty = { name: "", description: "", variations: [], selectedLeadIds: [] as string[] };

describe("rascunho da campanha", () => {
  beforeEach(() => localStorage.clear());

  it("tela vazia não vira rascunho", () => {
    expect(hasDraftContent(empty)).toBe(false);
    saveCampaignDraft("c1", 0, empty);
    expect(loadCampaignDraft("c1")).toBeNull();
  });

  it("guarda e devolve, sem a lista de leads", () => {
    saveCampaignDraft("c1", 1, { ...empty, name: "Promo", leads: [{ id: "x" }], selectedLeadIds: ["a"] });
    const saved = loadCampaignDraft<typeof empty>("c1");
    expect(saved?.step).toBe(1);
    expect(saved?.draft).toEqual({ ...empty, name: "Promo", selectedLeadIds: ["a"] });
  });

  it("cada empresa tem o seu", () => {
    saveCampaignDraft("c1", 0, { ...empty, name: "A" });
    expect(loadCampaignDraft("c2")).toBeNull();
  });

  it("rascunho com mais de 7 dias é descartado", () => {
    saveCampaignDraft("c1", 0, { ...empty, name: "A" });
    const later = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(loadCampaignDraft("c1", later)).toBeNull();
  });

  it("apagar", () => {
    saveCampaignDraft("c1", 0, { ...empty, name: "A" });
    clearCampaignDraft("c1");
    expect(loadCampaignDraft("c1")).toBeNull();
  });
});
