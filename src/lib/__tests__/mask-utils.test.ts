import { describe, it, expect } from "vitest";
import { maskPhone } from "@/lib/mask-utils";

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
