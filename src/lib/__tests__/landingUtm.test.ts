import { describe, expect, it } from "vitest";
import { parseUtms } from "../landingUtm";

describe("parseUtms", () => {
  it("lê as 4 UTMs dos anúncios", () => {
    expect(parseUtms("?utm_source=meta&utm_medium=pago&utm_campaign=Mes%20Criancas&utm_content=conj-1&x=1")).toEqual({
      utm_source: "meta",
      utm_medium: "pago",
      utm_campaign: "Mes Criancas",
      utm_content: "conj-1",
    });
  });

  it("sem UTM devolve null", () => {
    expect(parseUtms("?origem=mesa")).toBeNull();
    expect(parseUtms("")).toBeNull();
  });

  it("ignora UTM vazia e corta textos longos", () => {
    expect(parseUtms("?utm_source=&utm_campaign=" + "a".repeat(150))).toEqual({ utm_campaign: "a".repeat(100) });
  });
});
