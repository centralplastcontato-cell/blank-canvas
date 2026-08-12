/**
 * Preview de link (Open Graph) para robôs sociais — servido pela Vercel.
 *
 * Por que existe: a edge function `og-preview` no Supabase monta o HTML certo,
 * mas o Supabase reescreve `text/html` -> `text/plain` em requisições GET no
 * domínio *.supabase.co (limitação da plataforma). O WhatsApp respeita o
 * `text/plain` e não desenha a miniatura. Esta função busca aquele mesmo HTML e
 * o reserve com `Content-Type: text/html`, que a Vercel entrega sem reescrever.
 *
 * Só robôs chegam aqui: o roteamento (vercel.json) manda para cá apenas quando o
 * User-Agent é de rede social. Usuários normais recebem o SPA.
 */
export const config = { runtime: "edge" };

const OG_PREVIEW = "https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview";

/**
 * Miniatura por domínio: a og-preview usa o logo cadastrado da empresa, mas o
 * WhatsApp recusa imagens pesadas (o logo da Aventura Kids é um PNG de 430 KB)
 * e a miniatura some. Para estes domínios trocamos a imagem da prévia por um
 * JPEG 1200x630 otimizado, servido pela própria Vercel (pasta public/).
 */
const OG_IMAGE_OVERRIDES: Array<[string, string]> = [
  ["aventurakids", "https://www.aventurakids.online/og-aventura.jpg"],
];

function applyImageOverride(html: string, host: string): string {
  const override = OG_IMAGE_OVERRIDES.find(([key]) => host.includes(key));
  if (!override) return html;
  const img = override[1];
  return html
    .replace(/(property="og:image(?::secure_url)?" content=")[^"]*(")/g, `$1${img}$2`)
    .replace(/(name="twitter:image" content=")[^"]*(")/g, `$1${img}$2`);
}

export default async function handler(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const path = reqUrl.searchParams.get("path") || "/";

  const upstream = `${OG_PREVIEW}?domain=${encodeURIComponent(host)}&path=${encodeURIComponent(path)}`;

  try {
    // UA de robô fixo: garante que a og-preview devolva o HTML (e não um 302).
    const r = await fetch(upstream, { headers: { "user-agent": "facebookexternalhit/1.1" } });
    const html = await r.text();

    if (!html.trim().startsWith("<")) {
      // Resposta inesperada: manda o robô para a página real em vez de lixo.
      return new Response(null, { status: 302, headers: { location: `https://${host}${path}` } });
    }

    return new Response(applyImageOverride(html, host), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch {
    return new Response(null, { status: 302, headers: { location: `https://${host}${path}` } });
  }
}
