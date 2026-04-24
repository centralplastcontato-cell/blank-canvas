import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_MANIFEST = {
  name: "Celebrei",
  short_name: "Celebrei",
  description: "Plataforma completa para buffets infantis",
  start_url: "/",
  scope: "/",
  display: "standalone" as const,
  background_color: "#ffffff",
  theme_color: "#7c3aed",
  icons: [
    {
      src: "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/company-logos/celebrei-icon.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/company-logos/celebrei-icon.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

function canonicalHost(raw: string): string {
  return raw.toLowerCase().split(":")[0].replace(/^www\./, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domainParam = url.searchParams.get("domain");
    const hostHeader =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";
    const rawHost = domainParam || hostHeader;
    const domain = canonicalHost(rawHost);

    if (!domain || domain.includes("supabase")) {
      return jsonResponse(FALLBACK_MANIFEST);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data } = await supabase
      .rpc("get_company_by_domain", { _domain: domain })
      .maybeSingle();

    if (!data) {
      return jsonResponse(FALLBACK_MANIFEST);
    }

    const d = data as any;
    const settings = (d.settings ?? {}) as Record<string, unknown>;
    const appearance = (settings.partner_appearance ?? {}) as Record<string, string>;
    const brandColor = appearance.brand_color || "#7c3aed";
    const logoUrl = d.logo_url || FALLBACK_MANIFEST.icons[0].src;

    const manifest = {
      name: d.name,
      short_name: d.name.length > 12 ? d.name.substring(0, 12) : d.name,
      description: `Bem-vindo ao ${d.name}`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: brandColor,
      icons: [
        { src: logoUrl, sizes: "192x192", type: "image/png" },
        { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    };

    return jsonResponse(manifest);
  } catch (err) {
    console.error("pwa-manifest error:", err);
    return jsonResponse(FALLBACK_MANIFEST);
  }
});

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
