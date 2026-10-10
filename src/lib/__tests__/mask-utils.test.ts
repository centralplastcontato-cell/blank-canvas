import { describe, it, expect } from "vitest";
import { formatPhoneBR, maskPhone } from "@/lib/mask-utils";

describe("maskPhone", () => {
  it("masks 11-digit mobile number", () => {
    expect(maskPhone("11999887766")).toBe("1199****7766");
  });

  it("masks 10-digit landline number", () => {
    expect(maskPhone("1133445566")).toBe("1133****5566");
  });

  it("masks 13-digit international number", () => {
    expect(maskPhone("5511999887766")).toBe("5511****7766");
  });

  it("handles short numbers (<=8 digits)", () => {
    expect(maskPhone("12345678")).toBe("****5678");
  });

  it("handles very short numbers", () => {
    expect(maskPhone("1234")).toBe("****1234");
  });

  it("strips formatting before masking", () => {
    expect(maskPhone("(11) 99988-7766")).toBe("1199****7766");
  });

  it("strips dashes and spaces", () => {
    expect(maskPhone("11 9998-7766")).toBe("1199****7766");
  });
});

describe("formatPhoneBR", () => {
  it("celular com e sem 55", () => {
    expect(formatPhoneBR("5515991131863")).toBe("(15) 99113-1863");
    expect(formatPhoneBR("15991131863")).toBe("(15) 99113-1863");
  });

  it("número de 8 dígitos (fixo ou antigo)", () => {
    expect(formatPhoneBR("551532131863")).toBe("(15) 3213-1863");
    expect(formatPhoneBR("1532131863")).toBe("(15) 3213-1863");
  });

  it("exterior, grupo e vazio ficam como vieram", () => {
    expect(formatPhoneBR("4915112345678")).toBe("4915112345678");
    expect(formatPhoneBR("120363025343298765")).toBe("120363025343298765");
    expect(formatPhoneBR("")).toBe("");
    expect(formatPhoneBR(null)).toBe("");
  });
});
