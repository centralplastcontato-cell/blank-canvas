import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Moon, Sun } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { GoogleReviewsSection } from "@/components/landing/GoogleReviewsSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";

import { InstagramSection } from "@/components/landing/InstagramSection";
import { VideoGallerySection } from "@/components/landing/VideoGallerySection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import { FloatingCTA } from "@/components/landing/FloatingCTA";
import { Footer } from "@/components/landing/Footer";
import { DLPPromoSection } from "@/components/dynamic-lp/DLPPromoSection";
import { DLPUrgencyBanner } from "@/components/dynamic-lp/DLPUrgencyBanner";

const CASTELO_THEME = {
  primary_color: "#E91E63",
  secondary_color: "#FFC107",
} as any;

const LandingPage = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    return () => document.documentElement.classList.remove("dark");
  }, [isDark]);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <button
        onClick={() => setIsDark(!isDark)}
        className="fixed bottom-4 left-4 z-50 bg-card/80 backdrop-blur-md border border-border rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
        aria-label="Alternar modo escuro"
      >
        {isDark ? <Sun className="w-5 h-5 text-secondary" /> : <Moon className="w-5 h-5 text-foreground" />}
      </button>
      <Helmet>
        <title>Castelo da Diversão | Buffet Infantil em Sorocaba</title>
        <meta name="description" content="Há 9 anos transformando aniversários em memórias inesquecíveis. +4.000 festas realizadas. Agende uma visita de 15 minutos." />
        <meta property="og:title" content="Castelo da Diversão | Buffet Infantil em Sorocaba" />
        <meta property="og:url" content="https://www.castelodadiversao.online" />
      </Helmet>
      <HeroSection onCtaClick={openChat} />
      <GoogleReviewsSection />
      <BenefitsSection />
      <VideoGallerySection />
      <UrgencySection onCtaClick={openChat} />
      <InstagramSection />
      <Footer />
      
      <FloatingCTA onClick={openChat} />
      <LeadChatbot isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
};

export default LandingPage;
