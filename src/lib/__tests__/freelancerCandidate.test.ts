import { describe, expect, it } from "vitest";
import { haversineKm, matchOptions, readPrefill } from "../freelancerCandidate";

describe("freelancerCandidate", () => {
  it("distância em linha reta", () => {
    // Sorocaba (centro) → Votorantim: ~ 7 km
    const km = haversineKm({ lat: -23.5015, lng: -47.4526 }, { lat: -23.5446, lng: -47.4378 });
    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(6);
    expect(haversineKm({ lat: -23.5, lng: -47.4 }, { lat: -23.5, lng: -47.4 })).toBe(0);
  });

  it("vagas do link marcam as opções do formulário", () => {
    const opts = ["Monitor", "Garçom", "Segurança", "Cozinha (fritadeira)", "Cozinha (auxiliar)"];
    expect(matchOptions("monitor,garcom", opts)).toEqual(["Monitor", "Garçom"]);
    expect(matchOptions("cozinha", opts)).toEqual(["Cozinha (fritadeira)", "Cozinha (auxiliar)"]);
    expect(matchOptions("fritadeira", opts)).toEqual(["Cozinha (fritadeira)"]);
    expect(matchOptions("astronauta", opts)).toEqual([]);
    expect(matchOptions("", opts)).toEqual([]);
    expect(matchOptions("a,de", opts)).toEqual([]);
  });

  it("link da Bia", () => {
    expect(readPrefill("?nome=Ana%20Souza&tel=5515999990000&vagas=monitor&via=bia")).toEqual({ name: "Ana Souza", phone: "5515999990000", roles: "monitor", source: "bia" });
    expect(readPrefill("")).toEqual({ name: null, phone: null, roles: null, source: "link" });
  });
});
