import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static brand mappings
const STATIC_BRANDS: Record<string, { title: string; description: string; image: string; url: string }> = {
  hubcelebrei: {
    title: "Celebrei | A melhor plataforma para buffets infantis",
    description: "Plataforma completa para buffets infantis. Automatize seu atendimento, capture leads e aumente suas vendas com a Celebrei.",
    image: "https://hubcelebrei.com.br/og-para-buffets.jpg",
    url: "https://hubcelebrei.com.br",
  },
  castelodadiversao: {
    title: "Castelo da Diversão | Buffet Infantil",
    description: "O melhor buffet infantil para a festa do seu filho! Conheça nossos pacotes e agende uma visita.",
    image: "https://www.castelodadiversao.online/og-image.jpg",
    url: "https://www.castelodadiversao.online",
  },
};

function buildHTML(meta: { title: string; description: string; image: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${meta.url}" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:image" content="${meta.image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="pt_BR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${meta.title}" />
  <meta name="twitter:description" content="${meta.description}" />
  <meta name="twitter:image" content="${meta.image}" />
  <meta http-equiv="refresh" content="0;url=${meta.url}" />
</head>
<body>
  <p>Redirecionando para <a href="${meta.url}">${meta.title}</a>...</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    if (!domain) {
      return new Response("Missing ?domain= parameter", { status: 400, headers: corsHeaders });
    }

    // Check static brands first
    const staticBrand = STATIC_BRANDS[domain];
    if (staticBrand) {
      return new Response(buildHTML(staticBrand), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Dynamic: look up company by custom_domain or slug
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try matching by slug first, then by custom_domain
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, logo_url, custom_domain, slug")
      .or(`slug.eq.${domain},custom_domain.ilike.%${domain}%`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!company) {
      return new Response("Domain not found", { status: 404, headers: corsHeaders });
    }

    // Get landing page data
    const { data: lp } = await supabase
      .from("company_landing_pages")
      .select("hero, offer")
      .eq("company_id", company.id)
      .eq("is_published", true)
      .maybeSingle();

    const hero = lp?.hero as { title?: string; subtitle?: string } | null;
    const targetUrl = company.custom_domain
      ? `https://${company.custom_domain}`
      : `https://hubcelebrei.com.br/lp/${company.slug}`;

    const meta = {
      title: company.name || domain,
      description: hero?.subtitle || `Conheça o ${company.name} - buffet infantil`,
      image: company.logo_url || "https://hubcelebrei.com.br/og-para-buffets.jpg",
      url: targetUrl,
    };

    return new Response(buildHTML(meta), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("og-preview error:", error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
