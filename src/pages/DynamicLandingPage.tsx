import { useState, useEffect, useMemo } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { DLPHero } from "@/components/dynamic-lp/DLPHero";
import { DLPSocialProof } from "@/components/dynamic-lp/DLPSocialProof";
import { DLPBenefits } from "@/components/dynamic-lp/DLPBenefits";
import { DLPPromoSection } from "@/components/dynamic-lp/DLPPromoSection";
import { DLPUrgencyBanner } from "@/components/dynamic-lp/DLPUrgencyBanner";
import { DLPTestimonials } from "@/components/dynamic-lp/DLPTestimonials";
import { DLPMediaTabs } from "@/components/dynamic-lp/DLPMediaTabs";
import { DLPOffer } from "@/components/dynamic-lp/DLPOffer";
import { DLPHowItWorks } from "@/components/dynamic-lp/DLPHowItWorks";
import { DLPFooter } from "@/components/dynamic-lp/DLPFooter";
import { DLPFloatingCTA } from "@/components/dynamic-lp/DLPFloatingCTA";
import { LeadChatbot } from "@/components/landing/LeadChatbot";
import { applyHeroAssetOverrides, getCompanyLogoOverride, getExtraGalleryPhotos } from "@/lib/companyAssetOverrides";
import type { LPHero, LPVideo, LPGallery, LPTestimonials, LPOffer, LPTheme, LPFooter, LPBenefits, LPSocialProof, LPHowItWorks } from "@/types/landing-page";

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
  whatsapp_welcome_template?: string | null;
  venue_question_enabled?: boolean;
  venue_question_text?: string;
  venue_options?: { id: string; label: string; emoji?: string }[];
  external_location_question?: string;
  external_location_required?: boolean;
}

interface LPData {
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string;
  company_whatsapp: string | null;
  company_instagram: string | null;
  multipleUnits: boolean;
  unitNames: string[];
  hero: LPHero;
  video: LPVideo;
  gallery: LPGallery;
  testimonials: LPTestimonials;
  offer: LPOffer;
  benefits: LPBenefits;
  theme: LPTheme;
  footer: LPFooter;
  social_proof: LPSocialProof;
  how_it_works: LPHowItWorks;
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
  const [interestContext, setInterestContext] = useState<string | null>(null);

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
        const companySlug = row.company_slug as string;
        let whatsapp: string | null = null;
        const [{ data: onb }, { data: botSettingsArr }, { data: unitsData }] = await Promise.all([
          supabase.rpc('get_onboarding_public_fields', { _company_id: companyId }),
          supabase.rpc('get_lp_bot_settings_public', { _company_id: companyId }),
          supabase
            .from('company_units')
            .select('name')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .not('name', 'ilike', '%trabalhe conosco%')
            .order('sort_order'),
        ]);
        const botSettings = botSettingsArr && Array.isArray(botSettingsArr) ? (botSettingsArr as any[])[0] : botSettingsArr;
        const onbRow = onb && Array.isArray(onb) ? (onb as any[])[0] : onb;
        if (onbRow?.whatsapp_numbers && onbRow.whatsapp_numbers.length > 0) {
          whatsapp = onbRow.whatsapp_numbers[0];
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
          whatsapp_welcome_template: (botSettings as any).whatsapp_welcome_template ?? null,
          venue_question_enabled: (botSettings as any).venue_question_enabled === true,
          venue_question_text: (botSettings as any).venue_question_text || undefined,
          venue_options: Array.isArray((botSettings as any).venue_options) ? (botSettings as any).venue_options : undefined,
          external_location_question: (botSettings as any).external_location_question || undefined,
          external_location_required: (botSettings as any).external_location_required !== false,
        } : null;

        const defaultSocialProof: LPSocialProof = { enabled: false, items: [], text: "" };
        const defaultHowItWorks: LPHowItWorks = { enabled: false, title: "", steps: [] };

        const unitNames = (unitsData || []).map((u: any) => u.name as string);
        const normalizedHero = (() => {
          const h = row.hero as any;
          return {
            ...h,
            background_image_url: h.background_image_url || h.background_image || null,
          } as unknown as LPHero;
        })();
        const companyLogo = getCompanyLogoOverride(companySlug, row.company_logo);

        setData({
          company_id: companyId,
          multipleUnits: onbRow?.multiple_units === true,
          unitNames,
          company_name: row.company_name,
          company_logo: companyLogo,
          company_slug: companySlug,
          company_whatsapp: whatsapp,
          company_instagram: onbRow?.instagram || null,
          hero: applyHeroAssetOverrides(normalizedHero, companySlug),
          video: row.video as unknown as LPVideo,
          gallery: (() => {
            const g = row.gallery as unknown as LPGallery;
            // Normalize legacy images format to photos
            const basePhotos: string[] = (g.photos && g.photos.length > 0)
              ? g.photos
              : (Array.isArray(g.images)
                ? g.images.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean)
                : []);
            const extra = getExtraGalleryPhotos(companySlug);
            const allPhotos = [...basePhotos, ...extra];
            const newUnits = Array.isArray(g.units) && g.units.length > 0
              ? g.units.map((u, i) => i === 0 ? { ...u, photos: [...(u.photos || []), ...extra] } : u)
              : undefined;
            return { ...g, photos: allPhotos, ...(newUnits ? { units: newUnits } : {}) };
          })(),
          testimonials: row.testimonials as unknown as LPTestimonials,
          offer: row.offer as unknown as LPOffer,
          benefits: row.benefits as unknown as LPBenefits || { enabled: true, title: "", subtitle: "", items: [], trust_badges: [] },
          theme: row.theme as unknown as LPTheme,
          footer: row.footer as unknown as LPFooter,
          social_proof: (row as any).social_proof as LPSocialProof || defaultSocialProof,
          how_it_works: (row as any).how_it_works as LPHowItWorks || defaultHowItWorks,
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
    return <LoadingScreen message="Carregando página..." />;
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

      {data.company_slug?.includes("castelo") && (
        <DLPUrgencyBanner theme={data.theme} onCtaClick={openChat} />
      )}

      <DLPHero
        hero={data.hero}
        theme={data.theme}
        companyName={data.company_name}
        companyLogo={data.company_logo}
        onCtaClick={openChat}
        multipleUnits={data.multipleUnits}
      />
      <DLPSocialProof socialProof={data.social_proof} theme={data.theme} />
      <DLPBenefits theme={data.theme} companyName={data.company_name} benefits={data.benefits} />
      {data.company_slug?.includes("castelo") && (
        <DLPPromoSection theme={data.theme} onCtaClick={openChat} />
      )}
      <DLPMediaTabs
        gallery={data.gallery}
        video={data.video}
        theme={data.theme}
        companyName={data.company_name}
        companySlug={data.company_slug}
        onActiveUnitChange={setInterestContext}
      />
      <DLPHowItWorks howItWorks={data.how_it_works} theme={data.theme} />
      <DLPTestimonials testimonials={data.testimonials} theme={data.theme} />
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
        unitOptions={data.unitNames}
        interestContext={interestContext}
      />
    </div>
  );
}
