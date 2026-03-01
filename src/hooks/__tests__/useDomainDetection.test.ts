import { describe, it, expect } from "vitest";
import {
  getCanonicalHost,
  isPreviewDomain,
  getKnownBuffetDomain,
  KNOWN_BUFFET_DOMAINS,
} from "@/hooks/useDomainDetection";

describe("getCanonicalHost", () => {
  it("lowercases hostname", () => {
    expect(getCanonicalHost("Example.COM")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(getCanonicalHost("www.example.com")).toBe("example.com");
  });

  it("strips port", () => {
    expect(getCanonicalHost("localhost:5173")).toBe("localhost");
  });

  it("strips www and port together", () => {
    expect(getCanonicalHost("WWW.Example.com:3000")).toBe("example.com");
  });
});

describe("isPreviewDomain", () => {
  it("detects localhost as preview", () => {
    expect(isPreviewDomain()).toBe(true); // jsdom defaults to localhost
  });
});

describe("KNOWN_BUFFET_DOMAINS", () => {
  it("maps castelodadiversao.online to .com.br", () => {
    expect(KNOWN_BUFFET_DOMAINS["castelodadiversao.online"]).toBe("castelodadiversao.com.br");
  });

  it("maps aventurakids.online to itself", () => {
    expect(KNOWN_BUFFET_DOMAINS["aventurakids.online"]).toBe("aventurakids.online");
  });
});

describe("getKnownBuffetDomain", () => {
  it("returns null for unknown domain (localhost)", () => {
    expect(getKnownBuffetDomain()).toBeNull();
  });
});
