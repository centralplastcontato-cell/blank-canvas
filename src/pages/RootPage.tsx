import { getCanonicalHost, isHubDomain, isPreviewDomain, getKnownBuffetDomain } from "@/hooks/useDomainDetection";
import { slugFromSiteHost } from "@/lib/siteBuilder";
import HubLandingPage from "./HubLandingPage";
import LandingPage from "./LandingPage";
import MegaMagicLandingPage from "./MegaMagicLandingPage";
import PlanetaDivertidoLandingPage from "./PlanetaDivertidoLandingPage";
import DynamicLandingPage from "./DynamicLandingPage";

const CASTELO_DOMAINS = ["castelodadiversao.com.br", "castelodadiversao.online"];
const MEGAMAGIC_DOMAINS = ["buffetmegamagic.com.br"];
const PLANETA_DOMAINS = ["buffetplanetadivertido.online"];

/**
 * Routes the root "/" path based on domain:
 * - hubcelebrei.com.br → Hub landing page (Celebrei platform)
 * - lovable.app / localhost → Castelo/Buffet landing page (default)
 * - castelodadiversao.online → Static Castelo LP (via canonical match)
 * - buffetmegamagic.com.br → Static Mega Magic LP
 * - <slug>.hubcelebrei.com.br → site do buffet (site automático)
 * - Any other domain → Dynamic LP do buffet cujo domínio está cadastrado
 *   (companies.domain_canonical); domínio desconhecido mostra "não encontrada"
 */
export default function RootPage() {
  const canonical = getCanonicalHost();

  if (import.meta.env.DEV) {
    console.log("[TenantResolver]", {
      hostname: window.location.hostname,
      canonicalHost: canonical,
    });
  }

  // Site automático do buffet: <slug>.hubcelebrei.com.br
  const siteSlug = slugFromSiteHost(canonical);
  if (siteSlug) {
    return <DynamicLandingPage slug={siteSlug} />;
  }

  if (isHubDomain()) {
    return <HubLandingPage />;
  }

  // Preview / localhost or Castelo domains → static promo LP
  if (isPreviewDomain() || CASTELO_DOMAINS.includes(canonical)) {
    return <LandingPage />;
  }

  // Mega Magic domain → dedicated LP
  if (MEGAMAGIC_DOMAINS.includes(canonical)) {
    return <MegaMagicLandingPage />;
  }

  // Planeta Divertido domain → dedicated LP
  if (PLANETA_DOMAINS.includes(canonical)) {
    return <PlanetaDivertidoLandingPage />;
  }

  // Known buffet domains — explicitly mapped, prevents LP crossover
  const buffetDomain = getKnownBuffetDomain();
  if (buffetDomain) {
    return <DynamicLandingPage domain={buffetDomain} />;
  }

  // Domínio próprio de um buffet: busca exata pelo domínio cadastrado na
  // empresa (domínio desconhecido cai no "Página não encontrada")
  return <DynamicLandingPage domain={canonical} />;
}
