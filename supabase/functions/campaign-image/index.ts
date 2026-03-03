import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base_image_url, logo_url, company_id, position, campaign_theme, context } = await req.json();

    if (!base_image_url || !company_id) {
      return new Response(
        JSON.stringify({ error: "base_image_url e company_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Position mapping
    const positionMap: Record<string, string> = {
      "top-left": "canto superior esquerdo",
      "top-right": "canto superior direito",
      "bottom-left": "canto inferior esquerdo",
      "bottom-right": "canto inferior direito",
      "center": "centro",
    };
    const posLabel = positionMap[position] || "canto inferior direito";

    // Build composition prompt - professional agency style
    const themeHint = campaign_theme
      ? `O tema visual da campanha e "${campaign_theme}". Use elementos decorativos sutis relacionados a esse tema (confetes, baloes, estrelas, fitas, flores, etc) nas bordas e cantos da imagem.`
      : "Adicione elementos decorativos festivos e alegres (confetes, baloes, estrelas) sutilmente nas bordas.";

    const contextHint = context ? ` Contexto da campanha: ${context}.` : "";

    const logoInstruction = logo_url
      ? `Posicione o logotipo fornecido no ${posLabel} da imagem, com um fundo semi-transparente arredondado por tras para garantir legibilidade. O logotipo deve ocupar cerca de 15-20% da largura da imagem e manter suas proporcoes originais.`
      : "";

    const promptText = `Voce e um designer grafico profissional especializado em marketing de buffet infantil.
Transforme esta foto em uma arte promocional de alto impacto para compartilhamento no WhatsApp.

Instrucoes OBRIGATORIAS:
- Use a foto fornecida como elemento visual PRINCIPAL. A foto deve ocupar pelo menos 70% da area total da imagem.
- Adicione uma moldura ou borda decorativa elegante e profissional nas bordas da imagem.
- ${themeHint}
- ${logoInstruction}
- Ajuste as cores para ficarem mais vibrantes, saturadas e convidativas. Aumente levemente o contraste.
- O resultado deve parecer uma arte feita por uma agencia de marketing profissional.
- Formato quadrado, alta resolucao.${contextHint}

REGRA ABSOLUTA: NAO adicione NENHUM texto, letra, palavra, numero, faixa com texto, placa ou caractere escrito de qualquer tipo em qualquer idioma. Apenas elementos visuais decorativos. ZERO texto.`;

    // Build image content array
    const imageContent: any[] = [
      { type: "image_url", image_url: { url: base_image_url } },
    ];
    if (logo_url) {
      imageContent.push({ type: "image_url", image_url: { url: logo_url } });
    }

    // Call Gemini Pro Image for higher quality composition
    const MAX_RETRIES = 2;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                ...imageContent,
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (response.ok) break;

      const errText = await response.text();
      console.error(`Gemini Pro error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da API esgotados. Contate o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 3000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    if (!response || !response.ok) throw new Error("Gemini falhou após tentativas de retry");

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error("Nenhuma imagem retornada pela IA");
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error("Formato de imagem inválido");

    const imageFormat = base64Match[1];
    const b64 = base64Match[2];

    // Decode base64 to Uint8Array
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const filePath = `campaigns/composed-${Date.now()}.${imageFormat}`;
    const { error: uploadError } = await supabase.storage
      .from("sales-materials")
      .upload(filePath, bytes, { contentType: `image/${imageFormat}`, upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(filePath);

    // Generate thumbnail in background
    let thumbnailUrl: string | null = null;
    try {
      const resizeResp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/resize-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ image_url: urlData.publicUrl, company_id }),
        }
      );
      if (resizeResp.ok) {
        const resizeData = await resizeResp.json();
        thumbnailUrl = resizeData.thumbnail_url || null;
      } else {
        await resizeResp.text(); // consume body
      }
    } catch (thumbErr) {
      console.error("Thumbnail generation failed:", thumbErr);
    }

    // Log AI usage
    const tokens = data.usage?.total_tokens || 500;
    await supabase.from("ai_usage_logs").insert({
      company_id,
      function_name: "campaign-image",
      model: "gemini-3-pro-image-preview",
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: tokens,
      estimated_cost_usd: 0.04,
    });

    return new Response(
      JSON.stringify({ url: urlData.publicUrl, thumbnail_url: thumbnailUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("campaign-image error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao compor arte" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
