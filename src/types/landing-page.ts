export interface LPHero {
  title: string;
  subtitle: string;
  cta_text: string;
  background_image_url: string | null;
}

export interface LPVideo {
  enabled: boolean;
  title: string;
  video_url: string | null;
  video_type: "youtube" | "upload";
}

export interface LPGallery {
  enabled: boolean;
  title: string;
  photos: string[];
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

export interface LPOffer {
  enabled: boolean;
  title: string;
  description: string;
  highlight_text: string;
  cta_text: string;
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
  theme: LPTheme;
  footer: LPFooter;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
