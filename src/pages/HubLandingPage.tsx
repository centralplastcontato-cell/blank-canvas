import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import HubHeader from "@/components/hub-landing/HubHeader";
import HubHero from "@/components/hub-landing/HubHero";
import HubBeforeAfter from "@/components/hub-landing/HubBeforeAfter";
import HubHowItWorks from "@/components/hub-landing/HubHowItWorks";
import HubFeatures from "@/components/hub-landing/HubFeatures";
import HubCTA from "@/components/hub-landing/HubCTA";
import HubFooter from "@/components/hub-landing/HubFooter";
import HubProspectWizard from "@/components/hub-landing/HubProspectWizard";

// Para usar YouTube: cole o ID aqui (ex: "abc123" de youtube.com/watch?v=abc123)
const DEMO_YOUTUBE_ID = "";
// Vídeo de apresentação (a história da Carla); troque pelo YouTube quando publicar lá
const DEMO_LOCAL_VIDEO = "/videos/celebrei-carla.mp4";
const DEMO_POSTER = "/videos/celebrei-carla-poster.jpg";

export default function HubLandingPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white pb-20 font-inter text-[#0F1222] antialiased sm:pb-0">
      <Helmet>
        <title>Celebrei | A melhor plataforma para buffets infantis</title>
        <meta name="description" content="Transforme leads em festas fechadas com CRM + WhatsApp automatizado. Plataforma completa para buffets infantis." />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap"
        />
      </Helmet>
      <HubHeader onOpenWizard={() => setIsWizardOpen(true)} />
      <HubHero
        onOpenWizard={() => setIsWizardOpen(true)}
        video={{ youtubeId: DEMO_YOUTUBE_ID || undefined, localVideoUrl: DEMO_YOUTUBE_ID ? undefined : DEMO_LOCAL_VIDEO, posterUrl: DEMO_POSTER }}
      />
      <HubBeforeAfter />
      <HubHowItWorks />
      <HubFeatures />
      <HubCTA onOpenWizard={() => setIsWizardOpen(true)} />
      <HubFooter />
      <MobileStickyCTA onClick={() => setIsWizardOpen(true)} />
      <HubProspectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
}

/** No celular: botão "Agendar demonstração" sempre à mão depois que a pessoa rola o topo */
function MobileStickyCTA({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#0F1222]/[0.06] bg-white/95 p-3 backdrop-blur transition-transform duration-300 sm:hidden ${visible ? "translate-y-0" : "translate-y-full"}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0F1222] py-3.5 text-base font-semibold text-white"
      >
        Agendar demonstração gratuita
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
