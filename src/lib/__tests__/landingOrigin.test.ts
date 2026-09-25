import { describe, it, expect, beforeEach } from "vitest";
import { captureLandingOrigin, originLabel, directWhatsAppMessage } from "@/lib/landingOrigin";

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

describe("captureLandingOrigin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    visit("");
  });

  it("returns null for a normal visit without origin", () => {
    expect(captureLandingOrigin()).toBeNull();
  });

  it("reads ?origem=mesa from the URL", () => {
    visit("?origem=mesa");
    expect(captureLandingOrigin()).toBe("mesa");
  });

  it("keeps the origin after the parameter disappears from the URL", () => {
    visit("?origem=mesa");
    captureLandingOrigin();
    visit("#oferta");
    expect(captureLandingOrigin()).toBe("mesa");
  });

  it("normalizes case and whitespace", () => {
    visit("?origem=%20MESA%20");
    expect(captureLandingOrigin()).toBe("mesa");
  });

  it("ignores values outside the allowed format", () => {
    visit("?origem=<script>");
    expect(captureLandingOrigin()).toBeNull();
  });
});

describe("messages by origin", () => {
  it("labels the table QR code", () => {
    expect(originLabel("mesa")).toBe("QR Code da mesa");
  });

  it("has no label for unknown or missing origins", () => {
    expect(originLabel("balcao")).toBeNull();
    expect(originLabel(null)).toBeNull();
  });

  it("builds the direct WhatsApp message the bot recognizes", () => {
    const msg = directWhatsAppMessage("mesa", "Castelo da Diversão");
    expect(msg).toBe("Olá! 👋 Vim pelo QR Code da mesa do Castelo da Diversão 🎉");
    expect(msg!.toLowerCase()).toContain("qr code da mesa");
  });

  it("keeps direct links blank for a normal visit", () => {
    expect(directWhatsAppMessage(null, "Castelo da Diversão")).toBeNull();
  });
});
