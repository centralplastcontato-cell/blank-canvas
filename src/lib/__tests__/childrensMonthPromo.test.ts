import { describe, expect, it } from "vitest";
import { CASTELO_WHATSAPP_PROMO_URL, isWithinPromoWindow, msUntilDeadline } from "../childrensMonthPromo";

describe("Mês das Crianças — prazo em horário de Brasília", () => {
  it("vale até 17/10/2026 23:59:59 de Brasília", () => {
    expect(isWithinPromoWindow(new Date("2026-10-17T23:59:00-03:00").getTime())).toBe(true);
    expect(isWithinPromoWindow(new Date("2026-10-18T00:00:00-03:00").getTime())).toBe(false);
    // 02:30 UTC de 18/10 ainda é 17/10 23:30 em Brasília
    expect(isWithinPromoWindow(new Date("2026-10-18T02:30:00Z").getTime())).toBe(true);
  });

  it("contagem nunca fica negativa", () => {
    expect(msUntilDeadline(new Date("2026-12-01T00:00:00Z").getTime())).toBe(0);
  });

  it("link do WhatsApp com a mensagem pronta", () => {
    expect(CASTELO_WHATSAPP_PROMO_URL).toBe(
      "https://api.whatsapp.com/send?phone=5515974034646&text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20saber%20da%20promo%C3%A7%C3%A3o%20M%C3%AAs%20das%20Crian%C3%A7as",
    );
  });
});
