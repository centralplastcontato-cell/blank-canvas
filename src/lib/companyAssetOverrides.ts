import type { LPHero } from "@/types/landing-page";
import megamagicLogo from "@/assets/megamagic-logo-transparent.png";
import megamagicMascot from "@/assets/megamagic-mascot-transparent.png";
import megamagicGalleryBaby from "@/assets/megamagic-gallery-baby.jpg";

interface CompanyAssetOverride {
  logo?: string;
  mascot?: string;
  extraGalleryPhotos?: string[];
}

const COMPANY_ASSET_OVERRIDES: Record<string, CompanyAssetOverride> = {
  megamegic: {
    logo: megamagicLogo,
    mascot: megamagicMascot,
    extraGalleryPhotos: [megamagicGalleryBaby],
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

  if (!override?.mascot) {
    return hero;
  }

  return {
    ...hero,
    mascot_image_url: override.mascot,
  };
}
