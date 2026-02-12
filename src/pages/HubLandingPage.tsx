import { useState } from "react";
import { Helmet } from "react-helmet-async";
import HubHeader from "@/components/hub-landing/HubHeader";
import HubHero from "@/components/hub-landing/HubHero";
import HubFeatures from "@/components/hub-landing/HubFeatures";
import HubStats from "@/components/hub-landing/HubStats";
import HubCTA from "@/components/hub-landing/HubCTA";
import HubFooter from "@/components/hub-landing/HubFooter";
import HubProspectWizard from "@/components/hub-landing/HubProspectWizard";

export default function HubLandingPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Celebrei | A melhor plataforma para buffets infantis</title>
      </Helmet>
      <HubHeader onOpenWizard={() => setIsWizardOpen(true)} />
      <HubHero onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFeatures />
      <HubStats onOpenWizard={() => setIsWizardOpen(true)} />
      <HubCTA onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFooter />
      <HubProspectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
}
