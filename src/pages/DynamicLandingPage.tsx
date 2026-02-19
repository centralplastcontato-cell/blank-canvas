import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isHubDomain, isPreviewDomain } from "@/hooks/useDomainDetection";
import { DLPHero } from "@/components/dynamic-lp/DLPHero";
import { DLPBenefits } from "@/components/dynamic-lp/DLPBenefits";
import { DLPTestimonials } from "@/components/dynamic-lp/DLPTestimonials";
import { DLPVideo } from "@/components/dynamic-lp/DLPVideo";
import { DLPGallery } from "@/components/dynamic-lp/DLPGallery";
import { DLPOffer } from "@/components/dynamic-lp/DLPOffer";
import { DLPFooter } from "@/components/dynamic-lp/DLPFooter";
import { DLPFloatingCTA } from "@/components/dynamic-lp/DLPFloatingCTA";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import type { LPHero, LPVideo, LPGallery, LPTestimonials, LPOffer, LPTheme, LPFooter } from "@/types/landing-page";

interface LPData {
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string;
  hero: LPHero;
  video: LPVideo;
  gallery: LPGallery;
  testimonials: LPTestimonials;
  offer: LPOffer;
  theme: LPTheme;
  footer: LPFooter;
}

interface DynamicLandingPageProps {
  domain?: string;
}

export default function DynamicLandingPage({ domain }: DynamicLandingPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<LPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    async function fetchLP() {
      setLoading(true);
      let result;

      if (slug) {
        result = await supabase.rpc("get_landing_page_by_slug", { _slug: slug });
      } else if (domain) {
        result = await supabase.rpc("get_landing_page_by_domain", { _domain: domain });
      } else {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (result.error || !result.data || (Array.isArray(result.data) && result.data.length === 0)) {
        setNotFound(true);
      } else {
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        setData({
          company_id: row.company_id,
          company_name: row.company_name,
          company_logo: row.company_logo,
          company_slug: row.company_slug,
          hero: row.hero as unknown as LPHero,
          video: row.video as unknown as LPVideo,
          gallery: row.gallery as unknown as LPGallery,
          testimonials: row.testimonials as unknown as LPTestimonials,
          offer: row.offer as unknown as LPOffer,
          theme: row.theme as unknown as LPTheme,
          footer: row.footer as unknown as LPFooter,
        });
      }
      setLoading(false);
    }

    fetchLP();
  }, [slug, domain]);

  const themeStyle = useMemo(() => {
    if (!data) return {};
    return {
      backgroundColor: data.theme.background_color,
      minHeight: "100vh",
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Página não encontrada</h1>
          <p className="text-muted-foreground">
            Esta landing page ainda não foi publicada ou não existe.
          </p>
        </div>
      </div>
    );
  }

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <div style={themeStyle}>
      <Helmet>
        <title>{data.company_name} | Buffet Infantil</title>
        <meta name="description" content={(data.hero as any)?.subtitle || `Conheça o ${data.company_name} - buffet infantil`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${data.company_name} | Buffet Infantil`} />
        <meta property="og:description" content={(data.hero as any)?.subtitle || `Conheça o ${data.company_name} - buffet infantil`} />
        {data.company_logo && <meta property="og:image" content={data.company_logo} />}
        {domain && <meta property="og:url" content={`https://${domain}`} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${data.company_name} | Buffet Infantil`} />
        {data.company_logo && <meta name="twitter:image" content={data.company_logo} />}
      </Helmet>

      {/* Section order: Hero → Benefits → Testimonials → Video → Gallery → Offer → Footer */}
      <DLPHero
        hero={data.hero}
        theme={data.theme}
        companyName={data.company_name}
        companyLogo={data.company_logo}
        onCtaClick={openChat}
      />
      <DLPBenefits theme={data.theme} companyName={data.company_name} />
      <DLPTestimonials testimonials={data.testimonials} theme={data.theme} />
      <DLPVideo video={data.video} theme={data.theme} companyName={data.company_name} />
      <DLPGallery gallery={data.gallery} theme={data.theme} companyName={data.company_name} />
      <DLPOffer offer={data.offer} theme={data.theme} onCtaClick={openChat} />
      <DLPFooter footer={data.footer} theme={data.theme} companyName={data.company_name} companyLogo={data.company_logo} />

      <DLPFloatingCTA theme={data.theme} onClick={openChat} />
      <LeadChatbot isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
}
