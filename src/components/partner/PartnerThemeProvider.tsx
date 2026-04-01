import React from "react";
import { useCompany } from "@/contexts/CompanyContext";

interface AppearanceSettings {
  brand_color: string;
  accent_color: string;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): HslColor {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  const value = Number.parseInt(fullHex, 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function toHslValue({ h, s, l }: HslColor) {
  return `${h} ${s}% ${l}%`;
}

function withLightness(color: HslColor, lightness: number, saturation = color.s) {
  return `${color.h} ${Math.max(0, Math.min(100, saturation))}% ${Math.max(0, Math.min(100, lightness))}%`;
}

function getForeground(color: HslColor) {
  return color.l > 65 ? "225 40% 15%" : "0 0% 100%";
}

/**
 * Wraps partner pages and injects CSS custom properties
 * from the company's appearance settings.
 */
export function PartnerThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentCompany } = useCompany();

  const appearance = (currentCompany?.settings as Record<string, unknown> | null)
    ?.partner_appearance as AppearanceSettings | undefined;

  const brand = appearance?.brand_color || "#3b82f6";
  const accent = appearance?.accent_color || "#f97316";
  const brandHsl = hexToHsl(brand);
  const accentHsl = hexToHsl(accent);
  const brandForeground = getForeground(brandHsl);
  const accentForeground = getForeground(accentHsl);

  return (
    <div
      style={{
        "--partner-brand": brand,
        "--partner-accent": accent,
        "--primary": toHslValue(brandHsl),
        "--primary-foreground": brandForeground,
        "--ring": toHslValue(brandHsl),
        "--accent": toHslValue(accentHsl),
        "--accent-foreground": accentForeground,
        "--sidebar-primary": toHslValue(brandHsl),
        "--sidebar-primary-foreground": brandForeground,
        "--sidebar-ring": toHslValue(brandHsl),
        "--sidebar-accent": withLightness(brandHsl, 94, Math.max(brandHsl.s - 12, 24)),
        "--sidebar-accent-foreground": "225 40% 15%",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
