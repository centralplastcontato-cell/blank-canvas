import { isHubDomain, isPreviewDomain } from "@/hooks/useDomainDetection";
import LandingPage from "./LandingPage";
import HubLandingPage from "./HubLandingPage";
import DynamicLandingPage from "./DynamicLandingPage";

/**
 * Routes the root "/" path based on domain:
 * - hubcelebrei.com.br → Hub landing page (Celebrei platform)
 * - lovable.app / localhost → Castelo/Buffet landing page (default)
 * - Any other domain → Dynamic LP (company custom domain)
 */
export default function RootPage() {
  if (isHubDomain()) {
    return <HubLandingPage />;
  }

  const hostname = window.location.hostname;

  // Castelo da Diversão domain → static landing page (original)
  if (hostname === "www.castelodadiversao.online" || hostname === "castelodadiversao.online") {
    return <LandingPage />;
  }

  if (isPreviewDomain()) {
    return <LandingPage />;
  }

  // Custom domain → dynamic landing page
  return <DynamicLandingPage domain={hostname} />;
}
