import { getCanonicalHost, isHubDomain, isPreviewDomain } from "@/hooks/useDomainDetection";
import LandingPage from "./LandingPage";
import HubLandingPage from "./HubLandingPage";
import DynamicLandingPage from "./DynamicLandingPage";

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

  // Castelo da Diversão — matches both www and naked domain via canonical
  if (canonical === "castelodadiversao.online") {
    return <LandingPage />;
  }

  if (isPreviewDomain()) {
    return <LandingPage />;
  }

  // Custom domain → dynamic landing page (pass raw hostname, RPC normalizes)
  return <DynamicLandingPage domain={window.location.hostname} />;
}
