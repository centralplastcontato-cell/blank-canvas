import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/landing/HeroSection";
import { OfferSection } from "@/components/landing/OfferSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { VideoGallerySection } from "@/components/landing/VideoGallerySection";
import { InstagramSection } from "@/components/landing/InstagramSection";
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
        <title>Castelo da Diversão | Buffet Infantil</title>
        <meta property="og:title" content="Castelo da Diversão | Buffet Infantil" />
        <meta property="og:url" content="https://www.castelodadiversao.online" />
      </Helmet>
      <HeroSection onCtaClick={openChat} />
      <OfferSection onCtaClick={openChat} />
      <BenefitsSection />
      <TestimonialsSection />
      <VideoGallerySection />
      <InstagramSection />
      <UrgencySection onCtaClick={openChat} />
      <Footer />
      
      <FloatingCTA onClick={openChat} />
      <LeadChatbot isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
};

export default LandingPage;
