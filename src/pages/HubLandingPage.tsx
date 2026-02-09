import HubHeader from "@/components/hub-landing/HubHeader";
import HubHero from "@/components/hub-landing/HubHero";
import HubFeatures from "@/components/hub-landing/HubFeatures";
import HubStats from "@/components/hub-landing/HubStats";
import HubCTA from "@/components/hub-landing/HubCTA";
import HubFooter from "@/components/hub-landing/HubFooter";

export default function HubLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <HubHeader />
      <HubHero />
      <HubFeatures />
      <HubStats />
      <HubCTA />
      <HubFooter />
    </div>
  );
}
