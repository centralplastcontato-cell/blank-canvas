import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Moon, Sun } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { OfferSection } from "@/components/landing/OfferSection";
import { InstagramSection } from "@/components/landing/InstagramSection";
import { VideoGallerySection } from "@/components/landing/VideoGallerySection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import { FloatingCTA } from "@/components/landing/FloatingCTA";
import { Footer } from "@/components/landing/Footer";

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
        <title>Castelo da Diversão | Promoção de Páscoa 🐰</title>
        <meta name="description" content="Promoção de Páscoa no Castelo da Diversão! 10 crianças até 8 anos FREE. Parcele em até 10x no cartão. Buffet infantil em Sorocaba." />
        <meta property="og:title" content="Castelo da Diversão | Promoção de Páscoa 🐰" />
        <meta property="og:url" content="https://www.castelodadiversao.online" />
      </Helmet>
      <HeroSection onCtaClick={openChat} />
      <OfferSection onCtaClick={openChat} />
      <BenefitsSection />
      <VideoGallerySection />
      <UrgencySection onCtaClick={openChat} />
      <InstagramSection />
      <TestimonialsSection />
      <Footer />
      
      <FloatingCTA onClick={openChat} />
      <LeadChatbot isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
};

export default LandingPage;
