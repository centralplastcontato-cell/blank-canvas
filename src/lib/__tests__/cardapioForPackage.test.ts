import { describe, expect, it } from "vitest";
import { pickCardapioForPackage } from "../cardapioForPackage";

const castelo = [
  { name: "Cardápio Festa Castelo" },
  { name: "Cardápio Festa Super" },
  { name: "Cardápio Festa Premium" },
];
const company = "Castelo da Diversão";

describe("pickCardapioForPackage", () => {
  it("escolhe pelo pacote da festa", () => {
    expect(pickCardapioForPackage(castelo, "Super Castelo", company)?.name).toBe("Cardápio Festa Super");
    expect(pickCardapioForPackage(castelo, "Castelo Premium", company)?.name).toBe("Cardápio Festa Premium");
    expect(pickCardapioForPackage(castelo, "Castelo", company)?.name).toBe("Cardápio Festa Castelo");
  });

  it("sem pacote ou sem combinação, fica o cardápio padrão", () => {
    expect(pickCardapioForPackage(castelo, null, company)?.name).toBe("Cardápio Festa Castelo");
    expect(pickCardapioForPackage(castelo, "Confraternização", company)?.name).toBe("Cardápio Festa Castelo");
  });

  it("um cardápio só ou nenhum", () => {
    expect(pickCardapioForPackage([{ name: "Único" }], "Super", company)?.name).toBe("Único");
    expect(pickCardapioForPackage([], "Super", company)).toBeNull();
  });
});
