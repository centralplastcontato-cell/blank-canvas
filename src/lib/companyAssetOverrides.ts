import type { LPHero } from "@/types/landing-page";
import megamagicLogo from "@/assets/megamagic-logo-transparent.png";
import megamagicMascot from "@/assets/megamagic-mascot-transparent.png";
import megamagicGalleryBaby from "@/assets/megamagic-gallery-baby.jpg";
import espacoCarrosselLogo from "@/assets/espaco-carrossel-logo-transparent.png";
import espacoCarrosselHero from "@/assets/espaco-carrossel-hero-fachada.jpg";
import carrosselPosterInterna2 from "@/assets/espaco-carrossel-poster-interna-2.jpg";
import carrosselPosterExterna1 from "@/assets/espaco-carrossel-poster-externa-1.jpg";
import carrosselPosterExterna2 from "@/assets/espaco-carrossel-poster-externa-2.jpg";
import carrosselPosterExterna3 from "@/assets/espaco-carrossel-poster-externa-3.jpg";
import planetaGallery01 from "@/assets/planeta-gallery-fixed/1771618696306.jpg";
import planetaGallery02 from "@/assets/planeta-gallery-fixed/1771618697238.jpg";
import planetaGallery03 from "@/assets/planeta-gallery-fixed/1771618698659.jpg";
import planetaGallery04 from "@/assets/planeta-gallery-fixed/1771618699783.jpg";
import planetaGallery05 from "@/assets/planeta-gallery-fixed/1771618700704.jpg";
import planetaGallery06 from "@/assets/planeta-gallery-fixed/1771618701630.jpg";
import planetaGallery07 from "@/assets/planeta-gallery-fixed/1771618702758.jpg";
import planetaGallery08 from "@/assets/planeta-gallery-fixed/1771618704085.jpg";
import planetaGallery09 from "@/assets/planeta-gallery-fixed/1771618705413.jpg";
import planetaGallery10 from "@/assets/planeta-gallery-fixed/1771618706337.jpg";

interface CompanyAssetOverride {
  logo?: string;
  mascot?: string;
  heroBackgroundImage?: string;
  heroBackgroundImages?: string[];
  galleryPhotos?: string[];
  extraGalleryPhotos?: string[];
  /** Map of video file basename (last URL segment) -> override poster URL */
  videoPosters?: Record<string, string>;
}

const planetaFixedGallery = [
  planetaGallery01,
  planetaGallery02,
  planetaGallery03,
  planetaGallery04,
  planetaGallery05,
  planetaGallery06,
  planetaGallery07,
  planetaGallery08,
  planetaGallery09,
  planetaGallery10,
];

const COMPANY_ASSET_OVERRIDES: Record<string, CompanyAssetOverride> = {
  megamegic: {
    logo: megamagicLogo,
    mascot: megamagicMascot,
    extraGalleryPhotos: [megamagicGalleryBaby],
  },
  "planeta-divertido": {
    galleryPhotos: planetaFixedGallery,
    heroBackgroundImages: planetaFixedGallery,
  },
  buffetplanetadivertido: {
    galleryPhotos: planetaFixedGallery,
    heroBackgroundImages: planetaFixedGallery,
  },
  "espaco-carrossel": {
    logo: espacoCarrosselLogo,
    heroBackgroundImage: espacoCarrosselHero,
    videoPosters: {
      "festa-interna-2.mp4": carrosselPosterInterna2,
      "carrossel-externa-1.mp4": carrosselPosterExterna1,
      "carrossel-externa-2.mp4": carrosselPosterExterna2,
      "carrossel-externa-3.mp4": carrosselPosterExterna3,
    },
  },
};

export function getCompanyAssetOverride(slug?: string | null): CompanyAssetOverride | null {
  if (!slug) return null;
  return COMPANY_ASSET_OVERRIDES[slug] ?? null;
}

export function getCompanyLogoOverride(slug?: string | null, fallback?: string | null): string | null {
  return getCompanyAssetOverride(slug)?.logo ?? fallback ?? null;
}

export function applyHeroAssetOverrides(hero: LPHero, slug?: string | null): LPHero {
  const override = getCompanyAssetOverride(slug);

  if (!override?.mascot && !override?.heroBackgroundImage && !override?.heroBackgroundImages) {
    return hero;
  }

  return {
    ...hero,
    ...(override.mascot ? { mascot_image_url: override.mascot } : {}),
    ...(override.heroBackgroundImages && override.heroBackgroundImages.length > 0
      ? {
          background_image_url: override.heroBackgroundImages[0],
          background_images: override.heroBackgroundImages,
        }
      : override.heroBackgroundImage
      ? {
          background_image_url: override.heroBackgroundImage,
          background_images: [override.heroBackgroundImage],
        }
      : {}),
  };
}

export function getExtraGalleryPhotos(slug?: string | null): string[] {
  return getCompanyAssetOverride(slug)?.extraGalleryPhotos ?? [];
}

export function getGalleryPhotosOverride(slug?: string | null): string[] | null {
  return getCompanyAssetOverride(slug)?.galleryPhotos ?? null;
}

export function getVideoPosterOverride(
  slug: string | null | undefined,
  videoUrl: string | null | undefined,
): string | null {
  if (!slug || !videoUrl) return null;
  const map = getCompanyAssetOverride(slug)?.videoPosters;
  if (!map) return null;
  try {
    const filename = videoUrl.split("/").pop()?.split("?")[0] ?? "";
    return map[filename] ?? null;
  } catch {
    return null;
  }
}
