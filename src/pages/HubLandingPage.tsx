import { useState } from "react";
import { Helmet } from "react-helmet-async";
import HubHeader from "@/components/hub-landing/HubHeader";
import HubHero from "@/components/hub-landing/HubHero";
import HubFeatures from "@/components/hub-landing/HubFeatures";
import HubCTA from "@/components/hub-landing/HubCTA";
import HubFooter from "@/components/hub-landing/HubFooter";
import HubProspectWizard from "@/components/hub-landing/HubProspectWizard";

// Substitua pela URL do vídeo HeyGen quando estiver pronto
const HEYGEN_VIDEO_URL = "";

export default function HubLandingPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Celebrei | A melhor plataforma para buffets infantis</title>
        <meta name="description" content="Transforme leads em festas fechadas com CRM + WhatsApp automatizado. Plataforma completa para buffets infantis." />
      </Helmet>
      <HubHeader onOpenWizard={() => setIsWizardOpen(true)} />
      <HubHero
        onOpenWizard={() => setIsWizardOpen(true)}
        videoUrl={HEYGEN_VIDEO_URL || undefined}
      />
      <HubFeatures />
      <HubCTA onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFooter />
      <HubProspectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
}
