import { describe, expect, it } from "vitest";
import { checkBrWhatsapp } from "../brWhatsapp";
import { whatsappLink } from "../whatsappLink";

describe("checkBrWhatsapp", () => {
  it("aceita celular com DDD em qualquer formato", () => {
    expect(checkBrWhatsapp("(11) 91011-1176")).toEqual({ ok: true, digits: "11910111176" });
    expect(checkBrWhatsapp("+55 15 98112-1710")).toEqual({ ok: true, digits: "15981121710" });
    expect(checkBrWhatsapp("015 98112 1710")).toEqual({ ok: true, digits: "15981121710" });
  });
  it("número com um dígito a menos (caso Dra Bruna) é recusado", () => {
    expect(checkBrWhatsapp("1191011176")).toEqual({ ok: false, reason: "short" });
    expect(checkBrWhatsapp("98112-1710")).toEqual({ ok: false, reason: "short" });
  });
  it("número a mais ou fixo é recusado", () => {
    expect(checkBrWhatsapp("119101111766")).toEqual({ ok: false, reason: "long" });
    expect(checkBrWhatsapp("1532221234")).toEqual({ ok: false, reason: "short" });
    expect(checkBrWhatsapp("15322212345")).toEqual({ ok: false, reason: "not_mobile" });
  });
});

describe("whatsappLink", () => {
  it("usa api.whatsapp.com (o wa.me estragava os emojis)", () => {
    expect(whatsappLink("5515974034646", "Olá! Vim pelo site")).toBe(
      "https://api.whatsapp.com/send?phone=5515974034646&text=Ol%C3%A1!%20Vim%20pelo%20site",
    );
    expect(whatsappLink("(15) 97403-4646")).toBe("https://api.whatsapp.com/send?phone=15974034646");
  });
});
