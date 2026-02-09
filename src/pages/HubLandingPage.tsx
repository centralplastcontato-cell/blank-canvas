import { useState } from "react";
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
      <HubHeader onOpenWizard={() => setIsWizardOpen(true)} />
      <HubHero onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFeatures />
      <HubStats />
      <HubCTA onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFooter />
      <HubProspectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
}
