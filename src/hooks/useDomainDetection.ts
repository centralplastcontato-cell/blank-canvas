/**
 * Detects whether the current domain is the Hub/Celebrei platform domain
 * vs a child company custom domain or the default Lovable domain.
 */

const HUB_DOMAINS = [
  "hubcelebrei.com.br",
  "www.hubcelebrei.com.br",
  "celebrei.com.br",
  "www.celebrei.com.br",
];

export function isHubDomain(): boolean {
  const hostname = window.location.hostname;
  return HUB_DOMAINS.includes(hostname);
}

export function isPreviewDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes("lovable.app") || hostname.includes("lovableproject.com") || hostname === "localhost";
}
