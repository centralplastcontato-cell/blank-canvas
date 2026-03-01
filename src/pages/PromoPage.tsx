import { getCanonicalHost, isPreviewDomain, getKnownBuffetDomain } from "@/hooks/useDomainDetection";
import LandingPage from "./LandingPage";
import DynamicLandingPage from "./DynamicLandingPage";
import NotFound from "./NotFound";

const CASTELO_DOMAINS = ["castelodadiversao.com.br", "castelodadiversao.online"];

export default function PromoPage() {
  const canonical = getCanonicalHost();

  // Castelo domains or preview → static promo
  if (isPreviewDomain() || CASTELO_DOMAINS.includes(canonical)) {
    return <LandingPage />;
  }

  // Other known buffet domains → their dynamic LP
  const buffetDomain = getKnownBuffetDomain();
  if (buffetDomain) {
    return <DynamicLandingPage domain={buffetDomain} />;
  }

  return <NotFound />;
}
