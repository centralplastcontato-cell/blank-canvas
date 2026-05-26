import { useState } from "react";
import { Helmet } from "react-helmet-async";
import HubHeader from "@/components/hub-landing/HubHeader";
import HubHero from "@/components/hub-landing/HubHero";
import HubHowItWorks from "@/components/hub-landing/HubHowItWorks";
import HubDemoVideo from "@/components/hub-landing/HubDemoVideo";
import HubFeatures from "@/components/hub-landing/HubFeatures";
import HubStats from "@/components/hub-landing/HubStats";
import HubCTA from "@/components/hub-landing/HubCTA";
import HubFooter from "@/components/hub-landing/HubFooter";
import HubProspectWizard from "@/components/hub-landing/HubProspectWizard";

// Para usar YouTube: cole o ID aqui (ex: "abc123" de youtube.com/watch?v=abc123)
const DEMO_YOUTUBE_ID = "";
// Vídeo local gerado com Remotion (substitua pelo YouTube quando disponível)
const DEMO_LOCAL_VIDEO = "/videos/celebrei-demo.mp4";

export default function HubLandingPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Celebrei | A melhor plataforma para buffets infantis</title>
        <meta name="description" content="Transforme leads em festas fechadas com CRM + WhatsApp automatizado. Plataforma completa para buffets infantis." />
      </Helmet>
      <HubHeader onOpenWizard={() => setIsWizardOpen(true)} />
      <HubHero onOpenWizard={() => setIsWizardOpen(true)}  />
      <HubHowItWorks />
      <HubDemoVideo youtubeId={DEMO_YOUTUBE_ID || undefined} localVideoUrl={DEMO_YOUTUBE_ID ? undefined : DEMO_LOCAL_VIDEO} />
      <HubFeatures />
      <HubStats onOpenWizard={() => setIsWizardOpen(true)} />
      <HubCTA onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFooter />
      <HubProspectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
}
