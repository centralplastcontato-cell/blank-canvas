import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um copywriter especializado em landing pages para buffets infantis no Brasil.
Sua tarefa é gerar o conteúdo completo de uma landing page profissional e persuasiva em português brasileiro.

Você DEVE retornar APENAS um JSON válido (sem markdown, sem backticks) com exatamente esta estrutura:

{
  "hero": {
    "title": "Título impactante e emocional (máx 8 palavras)",
    "subtitle": "Subtítulo persuasivo que complementa o título (1-2 frases)",
    "cta_text": "Texto do botão CTA (ex: Quero fazer minha festa!)"
  },
  "video": {
    "enabled": true/false,
    "title": "Título da seção de vídeo",
    "video_url": "URL do vídeo ou null",
    "video_type": "youtube" ou "upload"
  },
  "gallery": {
    "enabled": true/false,
    "title": "Título criativo para a galeria de fotos",
    "photos": ["array com as URLs das fotos fornecidas"]
  },
  "testimonials": {
    "enabled": true,
    "title": "Título da seção de depoimentos",
    "items": [
      {"name": "Nome realista brasileiro", "text": "Depoimento emocional e convincente (2-3 frases)", "rating": 5},
      {"name": "Nome realista brasileiro", "text": "Depoimento focado na experiência (2-3 frases)", "rating": 5},
      {"name": "Nome realista brasileiro", "text": "Depoimento sobre o atendimento (2-3 frases)", "rating": 4}
    ]
  },
  "offer": {
    "enabled": true,
    "title": "Título da oferta (urgente e atrativo)",
    "description": "Descrição persuasiva da promoção (2-3 frases)",
    "highlight_text": "Frase de destaque curta e impactante",
    "cta_text": "Texto do botão CTA da oferta"
  },
  "theme": {
    "primary_color": "#hex (cor principal vibrante e festiva)",
    "secondary_color": "#hex (cor de destaque complementar)",
    "background_color": "#hex (fundo escuro elegante)",
    "text_color": "#ffffff",
    "font_heading": "nome da fonte (escolha entre: Poppins, Playfair Display, Fredoka One, Baloo 2, Nunito)",
    "font_body": "nome da fonte (escolha entre: Inter, Nunito, Open Sans, Lato)",
    "button_style": "rounded" ou "pill"
  },
  "footer": {
    "show_address": true,
    "show_phone": true,
    "show_instagram": true,
    "custom_text": ""
  }
}

Regras:
- Textos SEMPRE em português brasileiro
- Depoimentos devem parecer reais, com nomes brasileiros comuns
- A paleta de cores deve ser harmoniosa, vibrante e festiva
- O título do hero deve ser emocional e memorável
- A oferta deve criar senso de urgência
- Se o usuário fornecer fotos, inclua todas no array gallery.photos
- Se o usuário fornecer vídeo, configure a seção video adequadamente
- Adapte o tom ao tema da promoção fornecido`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_name, description, promo_theme, video_url, photo_urls, extra_info } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Gere a landing page para o seguinte buffet:

**Nome do buffet:** ${company_name || "Não informado"}

**Descrição:** ${description}

**Tema da promoção:** ${promo_theme || "Sem promoção específica"}

**URL do vídeo institucional:** ${video_url || "Nenhum vídeo"}

**Fotos disponíveis:** ${photo_urls?.length ? photo_urls.join(", ") : "Nenhuma foto"}

**Informações extras:** ${extra_info || "Nenhuma informação adicional"}

Gere o JSON completo da landing page seguindo exatamente a estrutura solicitada.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("Erro no gateway de IA");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("Resposta vazia da IA");

    // Parse the JSON from the AI response (handle possible markdown wrapping)
    let cleanJson = content.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const lpData = JSON.parse(cleanJson);

    return new Response(JSON.stringify(lpData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-landing-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
