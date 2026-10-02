import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/landing/HeroSection";
import { GoogleReviewsSection } from "@/components/landing/GoogleReviewsSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";

import { InstagramSection } from "@/components/landing/InstagramSection";
import { VideoGallerySection } from "@/components/landing/VideoGallerySection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import { FloatingCTA } from "@/components/landing/FloatingCTA";
import { Footer } from "@/components/landing/Footer";
import { LocationSection } from "@/components/landing/LocationSection";
import { BackgroundMusic } from "@/components/landing/BackgroundMusic";
import { DLPPromoSection } from "@/components/dynamic-lp/DLPPromoSection";
import { DLPUrgencyBanner } from "@/components/dynamic-lp/DLPUrgencyBanner";
import { captureLandingOrigin } from "@/lib/landingOrigin";
import { initMetaPixel } from "@/lib/metaPixel";
import { useChildrensMonthPromo } from "@/lib/childrensMonthPromo";
import { ChildrensMonthBadge, ChildrensMonthBar, ChildrensMonthSection } from "@/components/landing/ChildrensMonthPromo";

// Pixel da Meta do Castelo (conectado à conta de anúncios do Castelo)
const CASTELO_META_PIXEL_ID = "2893092977682985";

const CASTELO_THEME = {
  primary_color: "#E91E63",
  secondary_color: "#FFC107",
} as any;

const LandingPage = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Lida uma vez ao abrir a página: sobrevive à navegação interna (?origem=mesa some da URL)
  const [origem] = useState(captureLandingOrigin);

  const promoActive = useChildrensMonthPromo();

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  useEffect(() => {
    initMetaPixel(CASTELO_META_PIXEL_ID);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Castelo da Diversão | Buffet Infantil em Sorocaba</title>
        <meta name="description" content="Há 9 anos transformando aniversários em memórias inesquecíveis. +4.000 festas realizadas. Consulte datas e valores." />
        <meta property="og:title" content="Castelo da Diversão | Buffet Infantil em Sorocaba" />
        <meta property="og:url" content="https://www.castelodadiversao.online" />
      </Helmet>
      <DLPUrgencyBanner theme={CASTELO_THEME} onCtaClick={openChat} />
      {/* Faixa da promoção + cabeçalho presos juntos no topo (um não cobre o outro) */}
      <div className="sticky top-0 z-40">
      {promoActive && <ChildrensMonthBar onCtaClick={openChat} />}
      <header className="bg-[#0a0a1a]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-sm font-bold tracking-wider uppercase text-yellow-300">
            Castelo da Diversão
          </span>
          <a
            href={promoActive ? "#mes-das-criancas" : "#oferta"}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(promoActive ? "mes-das-criancas" : "oferta")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-[#0a0a1a] shadow-md hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(110deg, ${CASTELO_THEME.primary_color}, ${CASTELO_THEME.secondary_color})`, color: "#fff" }}
          >
            Ver oferta →
          </a>
        </div>
      </header>
      </div>
      <HeroSection onCtaClick={openChat} promoBadge={promoActive ? <ChildrensMonthBadge /> : undefined} />
      <GoogleReviewsSection />
      <BenefitsSection />
      {promoActive && <ChildrensMonthSection onCtaClick={openChat} />}
      <div id="oferta" className="scroll-mt-28">
        <DLPPromoSection theme={CASTELO_THEME} onCtaClick={openChat} />
      </div>
      <VideoGallerySection />
      <UrgencySection onCtaClick={openChat} />
      <InstagramSection />
      <LocationSection origem={origem} />
      <Footer origem={origem} />

      <FloatingCTA onClick={openChat} />
      <BackgroundMusic src="/audio/castelo-theme.mp3" paused={isChatOpen} />
      <LeadChatbot isOpen={isChatOpen} onClose={closeChat} origem={origem} />
    </div>
  );
};

export default LandingPage;
