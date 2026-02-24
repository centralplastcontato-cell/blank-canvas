import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { DLPHero } from "@/components/dynamic-lp/DLPHero";
import { DLPBenefits } from "@/components/dynamic-lp/DLPBenefits";
import { DLPTestimonials } from "@/components/dynamic-lp/DLPTestimonials";
import { DLPVideo } from "@/components/dynamic-lp/DLPVideo";
import { DLPGallery } from "@/components/dynamic-lp/DLPGallery";
import { DLPOffer } from "@/components/dynamic-lp/DLPOffer";
import { DLPFooter } from "@/components/dynamic-lp/DLPFooter";
import { DLPFloatingCTA } from "@/components/dynamic-lp/DLPFloatingCTA";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import type { LPHero, LPVideo, LPGallery, LPTestimonials, LPOffer, LPTheme, LPFooter, LPBenefits } from "@/types/landing-page";

interface LPBotConfig {
  welcome_message?: string;
  month_question?: string;
  guest_question?: string;
  name_question?: string;
  whatsapp_question?: string;
  completion_message?: string;
  month_options?: string[];
  guest_options?: string[];
  guest_limit?: number | null;
  guest_limit_message?: string | null;
  guest_limit_redirect_name?: string | null;
  redirect_completion_message?: string | null;
}

interface LPData {
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string;
  company_whatsapp: string | null;
  company_instagram: string | null;
  multipleUnits: boolean;
  hero: LPHero;
  video: LPVideo;
  gallery: LPGallery;
  testimonials: LPTestimonials;
  offer: LPOffer;
  benefits: LPBenefits;
  theme: LPTheme;
  footer: LPFooter;
  lpBotConfig: LPBotConfig | null;
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
        const companyId = row.company_id;
        // Fetch WhatsApp from onboarding
        let whatsapp: string | null = null;
        const [{ data: onb }, { data: botSettings }] = await Promise.all([
          supabase
            .from('company_onboarding')
            .select('whatsapp_numbers, multiple_units, instagram')
            .eq('company_id', companyId)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('lp_bot_settings')
            .select('*')
            .eq('company_id', companyId)
            .maybeSingle(),
        ]);
        if (onb?.whatsapp_numbers && onb.whatsapp_numbers.length > 0) {
          whatsapp = onb.whatsapp_numbers[0];
        }

        const lpBotConfig: LPBotConfig | null = botSettings ? {
          welcome_message: botSettings.welcome_message,
          month_question: botSettings.month_question,
          guest_question: botSettings.guest_question,
          name_question: botSettings.name_question,
          whatsapp_question: botSettings.whatsapp_question,
          completion_message: botSettings.completion_message,
          month_options: botSettings.month_options as string[],
          guest_options: botSettings.guest_options as string[],
          guest_limit: botSettings.guest_limit,
          guest_limit_message: botSettings.guest_limit_message,
          guest_limit_redirect_name: botSettings.guest_limit_redirect_name,
          redirect_completion_message: (botSettings as any).redirect_completion_message || null,
        } : null;

        setData({
          company_id: companyId,
          multipleUnits: onb?.multiple_units === true,
          company_name: row.company_name,
          company_logo: row.company_logo,
          company_slug: row.company_slug,
          company_whatsapp: whatsapp,
          company_instagram: onb?.instagram || null,
          hero: row.hero as unknown as LPHero,
          video: row.video as unknown as LPVideo,
          gallery: row.gallery as unknown as LPGallery,
          testimonials: row.testimonials as unknown as LPTestimonials,
          offer: row.offer as unknown as LPOffer,
          benefits: row.benefits as unknown as LPBenefits || { enabled: true, title: "", subtitle: "", items: [], trust_badges: [] },
          theme: row.theme as unknown as LPTheme,
          footer: row.footer as unknown as LPFooter,
          lpBotConfig,
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
        multipleUnits={data.multipleUnits}
      />
      <DLPBenefits theme={data.theme} companyName={data.company_name} benefits={data.benefits} />
      <DLPTestimonials testimonials={data.testimonials} theme={data.theme} />
      <DLPVideo video={data.video} theme={data.theme} companyName={data.company_name} />
      <DLPGallery gallery={data.gallery} theme={data.theme} companyName={data.company_name} />
      <DLPOffer offer={data.offer} theme={data.theme} onCtaClick={openChat} />
      <DLPFooter footer={data.footer} theme={data.theme} companyName={data.company_name} companyLogo={data.company_logo} instagramHandle={data.company_instagram} whatsappNumber={data.company_whatsapp} />

      <DLPFloatingCTA theme={data.theme} onClick={openChat} />
      <LeadChatbot
        isOpen={isChatOpen}
        onClose={closeChat}
        companyId={data.company_id}
        companyName={data.company_name}
        companyLogo={data.company_logo}
        companyWhatsApp={data.company_whatsapp || undefined}
        lpBotConfig={data.lpBotConfig}
      />
    </div>
  );
}
