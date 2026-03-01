import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { formatMessageContent } from "@/lib/format-message";

describe("formatMessageContent", () => {
  it("returns null for null input", () => {
    expect(formatMessageContent(null)).toBeNull();
  });

  it("returns undefined for undefined input", () => {
    expect(formatMessageContent(undefined)).toBeUndefined();
  });

  it("returns plain text unchanged", () => {
    const result = formatMessageContent("hello world");
    expect(result).toBe("hello world");
  });

  it("converts URLs to clickable links", () => {
    const result = formatMessageContent("Visit https://example.com now");
    const { container } = render(<>{result}</>);
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.href).toBe("https://example.com/");
    expect(link!.target).toBe("_blank");
  });

  it("converts 11-digit phone to wa.me link with 55 prefix", () => {
    const result = formatMessageContent("Call 11999887766 today");
    const { container } = render(<>{result}</>);
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.href).toContain("wa.me/5511999887766");
  });

  it("converts 13-digit phone to wa.me link without extra prefix", () => {
    const result = formatMessageContent("Call 5511999887766 today");
    const { container } = render(<>{result}</>);
    const link = container.querySelector("a");
    expect(link!.href).toContain("wa.me/5511999887766");
  });

  it("handles mixed URLs and phone numbers", () => {
    const result = formatMessageContent("Site https://example.com e tel 11999887766");
    const { container } = render(<>{result}</>);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(2);
  });
});
