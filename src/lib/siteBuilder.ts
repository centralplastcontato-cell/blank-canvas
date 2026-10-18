/**
 * Site automático do buffet (setup simplificado, só IA):
 * - o rascunho da página nasce dos dados do cadastro (nome, logo, cidade, fotos)
 * - os botões abrem o WhatsApp do buffet com "Vim pelo site" e a IA atende
 * - endereço padrão: <slug>.hubcelebrei.com.br; o buffet pode usar o domínio dele
 *
 * Tudo fica em company_landing_pages (as mesmas seções da página dinâmica).
 */
import type { LPBenefits, LPFooter, LPGallery, LPHero, LPHowItWorks, LPOffer, LPSocialProof, LPTestimonials, LPTheme, LPVideo } from "@/types/landing-page";

export const SITE_BASE_DOMAIN = "hubcelebrei.com.br";

/** Subdomínios que não podem virar endereço de buffet (já usados ou da Celebrei) */
const RESERVED_SUBDOMAINS = new Set(["www", "evolution", "evolution-go", "api", "app", "admin", "hub", "teste", "mail", "email", "smtp", "ftp", "ns1", "ns2"]);

/** Endereço do site no domínio da Celebrei */
export function siteSubdomain(slug: string): string {
  return `${slug}.${SITE_BASE_DOMAIN}`;
}

/** O slug serve como subdomínio? (letras minúsculas, números e hífen; até 63 caracteres) */
export function isValidSiteSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}

/** "buffet-x.hubcelebrei.com.br" → "buffet-x" (null para o próprio Hub, www e subdomínios reservados) */
export function slugFromSiteHost(canonicalHost: string): string | null {
  const suffix = `.${SITE_BASE_DOMAIN}`;
  if (!canonicalHost.endsWith(suffix)) return null;
  const sub = canonicalHost.slice(0, -suffix.length);
  return isValidSiteSlug(sub) ? sub : null;
}

/** Normaliza o domínio que o dono digitar: "https://www.Buffet.com.br/" → "buffet.com.br" */
export function normalizeCustomDomain(input: string): string | null {
  const d = input.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .replace(/:\d+$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) return null;
  if (d === SITE_BASE_DOMAIN || d.endsWith(`.${SITE_BASE_DOMAIN}`)) return null;
  return d;
}

// ─── Cores ──────────────────────────────────────────────────────────────────

export interface SitePalette {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

export const SITE_PALETTES: SitePalette[] = [
  { id: "festa", label: "Roxo e rosa", primary: "#7C3AED", secondary: "#EC4899" },
  { id: "oceano", label: "Azul e verde", primary: "#2563EB", secondary: "#10B981" },
  { id: "sol", label: "Laranja e amarelo", primary: "#EA580C", secondary: "#F59E0B" },
  { id: "doce", label: "Rosa e lilás", primary: "#DB2777", secondary: "#A855F7" },
];

export function paletteTheme(paletteId: string | null | undefined): LPTheme {
  const p = SITE_PALETTES.find((x) => x.id === paletteId) || SITE_PALETTES[0];
  return {
    primary_color: p.primary,
    secondary_color: p.secondary,
    background_color: "#FFFFFF",
    text_color: "#1F1235",
    font_heading: "Fredoka",
    font_body: "Nunito",
    button_style: "pill",
  };
}

// ─── Rascunho a partir do cadastro ──────────────────────────────────────────

export interface SiteSeed {
  companyName: string;
  city?: string | null;
  state?: string | null;
  fullAddress?: string | null;
  photoUrls?: string[] | null;
  whatsapp?: string | null;
}

/** Seções da página como ficam salvas em company_landing_pages */
export interface SiteContent {
  hero: LPHero & { cta_mode?: "whatsapp" | "chatbot"; whatsapp_number?: string | null; site_builder?: boolean; palette?: string };
  benefits: LPBenefits & { no_default_badges?: boolean };
  gallery: LPGallery;
  offer: LPOffer;
  how_it_works: LPHowItWorks;
  footer: LPFooter;
  theme: LPTheme;
  video: LPVideo;
  testimonials: LPTestimonials;
  social_proof: LPSocialProof;
}

export function onlyDigits(v: string | null | undefined): string {
  return String(v || "").replace(/\D/g, "");
}

export function buildSiteDraft(seed: SiteSeed): SiteContent {
  const name = seed.companyName.trim() || "Buffet Infantil";
  const where = seed.city ? ` em ${seed.city}${seed.state ? `/${seed.state}` : ""}` : "";
  const photos = (seed.photoUrls || []).filter(Boolean).slice(0, 12);
  return {
    hero: {
      title: "A festa dos sonhos do seu filho, sem preocupação",
      subtitle: `Buffet infantil completo${where}: diversão para as crianças, comida deliciosa e uma equipe cuidando de tudo. Você só curte.`,
      cta_text: "Ver datas livres no WhatsApp",
      background_image_url: photos[0] || null,
      background_images: photos.slice(0, 3),
      cta_mode: "chatbot",
      whatsapp_number: onlyDigits(seed.whatsapp) || null,
      site_builder: true,
      palette: SITE_PALETTES[0].id,
    },
    benefits: {
      enabled: true,
      title: `Por que escolher o ${name}?`,
      subtitle: "Tudo pensado para as crianças se divertirem e os pais aproveitarem",
      items: [
        { icon: "Gamepad2", title: "Muita diversão", description: "Brinquedos e atividades para a criançada aproveitar do começo ao fim." },
        { icon: "UtensilsCrossed", title: "Cardápio completo", description: "Comida gostosa para as crianças e para os adultos." },
        { icon: "Users", title: "Equipe cuidando de tudo", description: "Monitores e equipe atenta para você curtir a festa tranquilo." },
      ],
      trust_badges: [],
      no_default_badges: true,
    },
    gallery: { enabled: photos.length > 0, title: "Conheça nosso espaço", photos },
    offer: {
      enabled: false,
      title: "",
      description: "",
      highlight_text: "As datas de fim de semana acabam rápido",
      cta_text: "Consultar minha data no WhatsApp",
      benefits_list: [],
    },
    how_it_works: {
      enabled: true,
      title: "Como reservar sua festa",
      steps: [
        { icon: "MessageCircle", title: "Chame no WhatsApp", description: "Diga a data e quantos convidados. Respondemos na hora." },
        { icon: "CalendarCheck", title: "Visite o espaço", description: "Agende uma visita para conhecer tudo de perto." },
        { icon: "PartyPopper", title: "É só curtir", description: "No dia, a gente cuida de tudo. Você aproveita a festa." },
      ],
    },
    footer: { show_address: true, show_phone: true, show_instagram: true, custom_text: seed.fullAddress?.trim() || [seed.city, seed.state].filter(Boolean).join(" - ") },
    theme: paletteTheme(SITE_PALETTES[0].id),
    video: { enabled: false, title: "", video_url: null, video_type: "youtube" },
    testimonials: { enabled: false, title: "", items: [] },
    social_proof: { enabled: false, items: [], text: "" },
  };
}

/** A página foi feita pelo site automático? (as páginas feitas à mão não são editadas por esta tela) */
export function isSiteBuilderPage(hero: unknown): boolean {
  return !!hero && typeof hero === "object" && (hero as Record<string, unknown>).site_builder === true;
}

/** Mensagem que o botão do site já deixa escrita no WhatsApp */
export function siteWhatsAppMessage(companyName: string): string {
  return `Olá! Vim pelo site do ${companyName} e quero saber sobre festas 🎉`;
}

/** Oferta: "Pacotes a partir de R$ 3.900" a partir do valor digitado */
/** "3.900", "3900" ou "3.900,50" → valor em reais (null se vazio) */
export function parsePrice(price: string): number | null {
  const [reais, cents = ""] = String(price || "").split(",");
  const n = Number(onlyDigits(reais)) + Number(onlyDigits(cents).padEnd(2, "0").slice(0, 2)) / 100;
  return n > 0 ? n : null;
}

/** 3900 → "3.900,00" (como se escreve dinheiro no Brasil) */
export function formatPrice(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function offerTitleFromPrice(price: string): string {
  const n = parsePrice(price);
  if (!n) return "Conheça nossos pacotes";
  return `Pacotes a partir de R$ ${formatPrice(n)}`;
}
