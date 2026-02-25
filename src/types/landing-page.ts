export interface LPHero {
  title: string;
  subtitle: string;
  cta_text: string;
  background_image_url: string | null;
  background_images?: string[];
  secondary_cta_text?: string;
  secondary_cta_url?: string;
}

export interface LPSocialProofItem {
  value: string;
  label: string;
}

export interface LPSocialProof {
  enabled: boolean;
  items: LPSocialProofItem[];
  text: string;
}

export interface LPHowItWorksStep {
  title: string;
  description: string;
  icon: string;
}

export interface LPHowItWorks {
  enabled: boolean;
  title: string;
  steps: LPHowItWorksStep[];
}

export interface LPVideoUnit {
  name: string;
  video_url: string;
  video_type: "youtube" | "upload";
  poster_url?: string;
  location?: string;
}

export interface LPVideo {
  enabled: boolean;
  title: string;
  video_url: string | null;
  video_type: "youtube" | "upload";
  videos?: LPVideoUnit[];
}

export interface LPGalleryUnit {
  name: string;
  photos: string[];
}

export interface LPGallery {
  enabled: boolean;
  title: string;
  photos: string[];
  units?: LPGalleryUnit[];
}

export interface LPTestimonialItem {
  name: string;
  text: string;
  rating: number;
}

export interface LPTestimonials {
  enabled: boolean;
  title: string;
  items: LPTestimonialItem[];
}

export interface LPBenefitItem {
  icon: string;
  title: string;
  description: string;
}

export interface LPTrustBadge {
  icon: string;
  text: string;
}

export interface LPBenefits {
  enabled: boolean;
  title: string;
  subtitle: string;
  items: LPBenefitItem[];
  trust_badges: LPTrustBadge[];
}

export interface LPOffer {
  enabled: boolean;
  title: string;
  description: string;
  highlight_text: string;
  cta_text: string;
  benefits_list?: string[];
}

export interface LPTheme {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  button_style: "rounded" | "pill" | "square";
}

export interface LPFooter {
  show_address: boolean;
  show_phone: boolean;
  show_instagram: boolean;
  custom_text: string;
}

export interface CompanyLandingPage {
  id: string;
  company_id: string;
  hero: LPHero;
  video: LPVideo;
  gallery: LPGallery;
  testimonials: LPTestimonials;
  offer: LPOffer;
  benefits: LPBenefits;
  theme: LPTheme;
  footer: LPFooter;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
