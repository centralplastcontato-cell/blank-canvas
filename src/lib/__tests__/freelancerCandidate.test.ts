import { describe, expect, it } from "vitest";
import { ageOn, candidateScore, splitSavedAddress, dayIndex, distancePoints, haversineKm, matchOptions, readPrefill } from "../freelancerCandidate";

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

  it("nota: fim de semana, perto, buffet e experiência", () => {
    const full = candidateScore({ days: ["Quarta", "Sexta", "Sábado", "Domingo"], km: 1.2, workedBuffet: true, experience: true });
    expect(full.total).toBe(94);
    expect(full.parts.map((p) => p.got)).toEqual([29, 30, 20, 15]);
    expect(candidateScore({ days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"], km: 2, workedBuffet: true, experience: true }).total).toBe(100);
    expect(candidateScore({ days: ["Domingo"], km: 12.3, workedBuffet: false, experience: true }).total).toBe(34);
    // Sem distância: 0 nesse critério, com o motivo
    const noKm = candidateScore({ days: ["Sábado"], km: null, workedBuffet: false, experience: false });
    expect(noKm.total).toBe(9);
    expect(noKm.parts[1].why).toBe("distância não calculada");
    expect([distancePoints(5), distancePoints(5.1), distancePoints(15), distancePoints(15.1)]).toEqual([30, 20, 10, 0]);
    expect([dayIndex("Sábado"), dayIndex("sab"), dayIndex("Domingo"), dayIndex("feriado")]).toEqual([5, 5, 6, null]);
  });

  it("idade pela data de nascimento", () => {
    const today = new Date(2026, 9, 8);
    expect(ageOn("2004-03-12", today)).toBe(22);
    expect(ageOn("2004-10-09", today)).toBe(21);
    expect(ageOn("2004-10-08", today)).toBe(22);
    expect(ageOn("", today)).toBeNull();
  });

  it("endereço salvo vira partes para recalcular a distância", () => {
    expect(splitSavedAddress("Rua das Flores, 120, Central Parque Sorocaba, Sorocaba, SP", "18051-000")).toEqual({ cep: "18051-000", street: "Rua das Flores", number: "120", neighborhood: "Central Parque Sorocaba", city: "Sorocaba", state: "SP" });
    expect(splitSavedAddress("Rua das Flores, Central Parque Sorocaba, Sorocaba, SP", null)).toEqual({ cep: "", street: "Rua das Flores", number: "", neighborhood: "Central Parque Sorocaba", city: "Sorocaba", state: "SP" });
    expect(splitSavedAddress("", null).city).toBe("");
  });
});
