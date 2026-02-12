import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bot / crawler user-agent patterns
const BOT_UA_RE =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|Slackbot|LinkedInBot|Discordbot|TelegramBot|Googlebot|bingbot|Pinterestbot|redditbot|Applebot|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator/i;

// Static brand mappings (fallback when DB is unreachable)
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

function buildHTML(meta: { title: string; description: string; image: string; url: string }, redirectUrl?: string): string {
  const finalUrl = redirectUrl || meta.url;
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
  <meta http-equiv="refresh" content="0;url=${finalUrl}" />
</head>
<body>
  <p>Redirecionando para <a href="${finalUrl}">${meta.title}</a>...</p>
</body>
</html>`;
}

/** Normalize hostname: lowercase, strip www. and port */
function canonicalize(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

async function resolveByDomain(domain: string, pathname: string): Promise<Response | null> {
  const canonical = canonicalize(domain);

  // Check static brands first (fast path, no DB call)
  for (const [key, brand] of Object.entries(STATIC_BRANDS)) {
    if (canonical.includes(key)) {
      const fullUrl = `${brand.url}${pathname !== "/" ? pathname : ""}`;
      return new Response(buildHTML({ ...brand, url: fullUrl }, fullUrl), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  // Dynamic: look up company by domain_canonical
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_url, custom_domain, slug, domain_canonical")
    .or(`domain_canonical.eq.${canonical},slug.eq.${canonical}`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!company) return null;

  // Get landing page data for richer OG
  const { data: lp } = await supabase
    .from("company_landing_pages")
    .select("hero, offer")
    .eq("company_id", company.id)
    .eq("is_published", true)
    .maybeSingle();

  const hero = lp?.hero as { title?: string; subtitle?: string } | null;
  const targetDomain = company.custom_domain || `hubcelebrei.com.br/lp/${company.slug}`;
  const targetUrl = `https://${targetDomain}${pathname !== "/" ? pathname : ""}`;

  const meta = {
    title: hero?.title || company.name || domain,
    description: hero?.subtitle || `Conheça o ${company.name} - buffet infantil`,
    image: company.logo_url || "https://hubcelebrei.com.br/og-para-buffets.jpg",
    url: targetUrl,
  };

  return new Response(buildHTML(meta, targetUrl), {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";
    const isBot = BOT_UA_RE.test(ua);

    // Mode 1: explicit ?domain= parameter (legacy / Cloudflare Worker usage)
    const domainParam = url.searchParams.get("domain");
    if (domainParam) {
      const response = await resolveByDomain(domainParam, url.searchParams.get("path") || "/");
      if (response) return response;
      return new Response("Domain not found", { status: 404, headers: corsHeaders });
    }

    // Mode 2: Host-header based (proxied requests from Cloudflare Worker or direct)
    // The CF Worker should forward the original Host header.
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const pathname = url.searchParams.get("path") || "/";

    if (host) {
      const canonical = canonicalize(host);

      // Skip if this is the Supabase functions domain itself
      if (!canonical.includes("supabase") && !canonical.includes("functions")) {
        const response = await resolveByDomain(host, pathname);
        if (response) return response;
      }
    }

    // If not a bot or no domain resolved, return simple JSON info
    return new Response(
      JSON.stringify({ 
        error: "No domain resolved", 
        hint: "Use ?domain=example.com or proxy via Host header",
        isBot 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("og-preview error:", error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
