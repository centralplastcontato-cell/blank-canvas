import { getCanonicalHost, isHubDomain, isPreviewDomain, getKnownBuffetDomain } from "@/hooks/useDomainDetection";
import HubLandingPage from "./HubLandingPage";
import DynamicLandingPage from "./DynamicLandingPage";
import NotFound from "./NotFound";

/**
 * Routes the root "/" path based on domain:
 * - hubcelebrei.com.br → Hub landing page (Celebrei platform)
 * - lovable.app / localhost → Castelo/Buffet landing page (default)
 * - castelodadiversao.online → Static Castelo LP (via canonical match)
 * - Any other domain → Dynamic LP (company custom domain)
 */
export default function RootPage() {
  const canonical = getCanonicalHost();

  if (import.meta.env.DEV) {
    console.log("[TenantResolver]", {
      hostname: window.location.hostname,
      canonicalHost: canonical,
    });
  }

  if (isHubDomain()) {
    return <HubLandingPage />;
  }

  // Preview / localhost → Castelo dynamic LP (same as .com.br)
  if (isPreviewDomain()) {
    return <DynamicLandingPage domain="castelodadiversao.com.br" />;
  }

  // Known buffet domains — explicitly mapped, prevents LP crossover
  const buffetDomain = getKnownBuffetDomain();
  if (buffetDomain) {
    return <DynamicLandingPage domain={buffetDomain} />;
  }

  // Unknown domain → safe 404 (no risk of showing the wrong buffet's LP)
  return <NotFound />;
}
