import React from "react";
import { useCompany } from "@/contexts/CompanyContext";

interface AppearanceSettings {
  brand_color: string;
  accent_color: string;
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

  return (
    <div
      style={{
        "--partner-brand": brand,
        "--partner-accent": accent,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
