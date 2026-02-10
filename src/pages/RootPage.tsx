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

  if (isPreviewDomain()) {
    return <LandingPage />;
  }

  // Custom domain → dynamic landing page
  const hostname = window.location.hostname;
  return <DynamicLandingPage domain={hostname} />;
}
