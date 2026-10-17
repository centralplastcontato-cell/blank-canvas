import { describe, it, expect } from "vitest";
import { buildSiteDraft, isSiteBuilderPage, isValidSiteSlug, normalizeCustomDomain, offerTitleFromPrice, siteSubdomain, slugFromSiteHost } from "../siteBuilder";

describe("endereço do site", () => {
  it("subdomínio do buffet no domínio da Celebrei", () => {
    expect(siteSubdomain("buffet-alegria")).toBe("buffet-alegria.hubcelebrei.com.br");
    expect(slugFromSiteHost("buffet-alegria.hubcelebrei.com.br")).toBe("buffet-alegria");
  });

  it("o Hub, o www e os subdomínios do sistema não viram site de buffet", () => {
    expect(slugFromSiteHost("hubcelebrei.com.br")).toBeNull();
    expect(slugFromSiteHost("www.hubcelebrei.com.br")).toBeNull();
    expect(slugFromSiteHost("evolution.hubcelebrei.com.br")).toBeNull();
    expect(slugFromSiteHost("evolution-go.hubcelebrei.com.br")).toBeNull();
    expect(slugFromSiteHost("buffet.outrodominio.com.br")).toBeNull();
    expect(isValidSiteSlug("Buffet_X")).toBe(false);
    expect(isValidSiteSlug("-buffet")).toBe(false);
  });

  it("domínio próprio digitado de qualquer jeito vira o domínio limpo", () => {
    expect(normalizeCustomDomain("https://www.MeuBuffet.com.br/")).toBe("meubuffet.com.br");
    expect(normalizeCustomDomain("meubuffet.com.br/contato")).toBe("meubuffet.com.br");
    expect(normalizeCustomDomain("meu buffet")).toBeNull();
    expect(normalizeCustomDomain("x.hubcelebrei.com.br")).toBeNull();
  });
});

describe("rascunho do site", () => {
  it("nasce do cadastro, abre o WhatsApp e sem números inventados", () => {
    const d = buildSiteDraft({ companyName: "Buffet Alegria", city: "Sorocaba", state: "SP", photoUrls: ["a.jpg", "b.jpg"], whatsapp: "(15) 99999-0000" });
    expect(d.hero.cta_mode).toBe("whatsapp");
    expect(d.hero.whatsapp_number).toBe("15999990000");
    expect(d.hero.subtitle).toContain("em Sorocaba/SP");
    expect(d.hero.background_image_url).toBe("a.jpg");
    expect(d.gallery.photos).toEqual(["a.jpg", "b.jpg"]);
    expect(d.benefits.trust_badges).toEqual([]);
    expect(d.benefits.no_default_badges).toBe(true);
    expect(d.social_proof.enabled).toBe(false);
    expect(d.testimonials.enabled).toBe(false);
    expect(isSiteBuilderPage(d.hero)).toBe(true);
  });

  it("sem fotos a galeria fica desligada", () => {
    expect(buildSiteDraft({ companyName: "X" }).gallery.enabled).toBe(false);
  });

  it("páginas feitas à mão não são do site automático", () => {
    expect(isSiteBuilderPage({ title: "Castelo" })).toBe(false);
    expect(isSiteBuilderPage(null)).toBe(false);
  });

  it("preço do pacote", () => {
    expect(offerTitleFromPrice("3.900")).toBe("Pacotes a partir de R$ 3.900");
    expect(offerTitleFromPrice("3.900,00")).toBe("Pacotes a partir de R$ 3.900");
    expect(offerTitleFromPrice("")).toBe("Conheça nossos pacotes");
  });
});
