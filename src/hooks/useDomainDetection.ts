/**
 * Domain detection utilities for multi-tenant routing.
 * Normalizes hostnames to canonical form (lowercase, no www, no port)
 * for consistent tenant resolution.
 */

const HUB_DOMAINS_CANONICAL = [
  "hubcelebrei.com.br",
  "celebrei.com.br",
];

/**
 * Normalize a hostname to canonical form:
 * - lowercase
 * - strip "www." prefix
 * - strip port
 */
export function getCanonicalHost(hostname?: string): string {
  const raw = (hostname ?? window.location.hostname).toLowerCase();
  const withoutPort = raw.split(":")[0];
  return withoutPort.replace(/^www\./, "");
}

export function isHubDomain(): boolean {
  return HUB_DOMAINS_CANONICAL.includes(getCanonicalHost());
}

export function isPreviewDomain(): boolean {
  const canonical = getCanonicalHost();
  return (
    canonical.includes("lovable.app") ||
    canonical.includes("lovableproject.com") ||
    canonical === "localhost"
  );
}

/**
 * Optional redirect to the company's primary domain (custom_domain field).
 * Only triggers if force_primary_domain is true in company settings.
 * Preserves pathname + search + hash.
 */
export function redirectToPrimaryDomain(
  primaryDomain: string | null | undefined,
  settings?: Record<string, unknown> | null
): boolean {
  if (!primaryDomain) return false;

  const forcePrimary = settings?.force_primary_domain === true;
  if (!forcePrimary) return false;

  const currentHost = window.location.hostname.toLowerCase();
  if (currentHost === primaryDomain.toLowerCase()) return false;

  const target = `https://${primaryDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
  return true;
}
