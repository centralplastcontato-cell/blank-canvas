import { isHubDomain } from "@/hooks/useDomainDetection";
import LandingPage from "./LandingPage";
import HubLandingPage from "./HubLandingPage";

/**
 * Routes the root "/" path based on domain:
 * - hubcelebrei.com.br → Hub landing page (Celebrei platform)
 * - Everything else → Castelo/Buffet landing page
 */
export default function RootPage() {
  if (isHubDomain()) {
    return <HubLandingPage />;
  }
  return <LandingPage />;
}
