import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/landing/HeroSection";
import { OfferSection } from "@/components/landing/OfferSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { InstagramSection } from "@/components/landing/InstagramSection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import { FloatingCTA } from "@/components/landing/FloatingCTA";
import { Footer } from "@/components/landing/Footer";

const LandingPage = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Castelo da Diversão | Mês do Consumidor</title>
        <meta property="og:title" content="Castelo da Diversão | Mês do Consumidor" />
        <meta property="og:url" content="https://www.castelodadiversao.online" />
      </Helmet>
      <HeroSection onCtaClick={openChat} />
      <BenefitsSection />
      <OfferSection onCtaClick={openChat} />
      <InstagramSection />
      <UrgencySection onCtaClick={openChat} />
      <Footer />
      
      <FloatingCTA onClick={openChat} />
      <LeadChatbot isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
};

export default LandingPage;
