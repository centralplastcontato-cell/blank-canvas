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
    const { base_image_url, logo_url, company_id, position, campaign_theme, context, generation_mode } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isThemeOnly = generation_mode === "theme_only";

    if (!isThemeOnly && !base_image_url) {
      return new Response(
        JSON.stringify({ error: "base_image_url é obrigatório no modo com foto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isThemeOnly && !campaign_theme && !context) {
      return new Response(
        JSON.stringify({ error: "Informe um tema ou descrição para gerar a arte" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    // Position mapping
    const positionMap: Record<string, string> = {
      "top-left": "top-left corner",
      "top-right": "top-right corner",
      "bottom-left": "bottom-left corner",
      "bottom-right": "bottom-right corner",
      "center": "center",
    };
    const posLabel = positionMap[position] || "bottom-right corner";

    let promptText: string;

    if (isThemeOnly) {
      const themeDesc = campaign_theme || "children's party";
      const contextHint = context ? ` Campaign context: ${context}.` : "";

      const logoInstruction = logo_url
        ? `Include a subtle watermark-style logo area in the ${posLabel} of the image.`
        : "";

      promptText = `Professional promotional art for a children's party venue WhatsApp marketing campaign.
Theme: "${themeDesc}".${contextHint}

Create a vibrant, high-impact square composition with:
- Colorful, saturated, inviting colors related to the theme "${themeDesc}"
- Festive decorative elements (confetti, balloons, stars, ribbons, toys, sweets, cakes)
- Professional marketing agency quality with good visual composition
- Gradients, geometric shapes and elements that create depth and visual interest
- Attractive and colorful background, never plain white
${logoInstruction}

ABSOLUTE RULE: Do NOT add ANY text, letters, words, numbers, banners with text, signs or written characters of any kind in any language. Only visual decorative elements. ZERO text.`;
    } else {
      const themeHint = campaign_theme
        ? `The visual theme is "${campaign_theme}". Include subtle decorative elements related to this theme (confetti, balloons, stars, ribbons, flowers, etc.) on the edges.`
        : "Add festive and cheerful decorative elements (confetti, balloons, stars) subtly on the edges.";

      const contextHint = context ? ` Campaign context: ${context}.` : "";

      const logoInstruction = logo_url
        ? `Include a subtle watermark-style logo area in the ${posLabel} of the image.`
        : "";

      promptText = `Professional promotional art for a children's party venue WhatsApp marketing campaign.
Transform the concept into a high-impact promotional art piece.

Instructions:
- Create an elegant and professional decorative frame/border
- ${themeHint}
- ${logoInstruction}
- Use vibrant, saturated, inviting colors with slightly increased contrast
- Result should look like art made by a professional marketing agency
- Square format, high resolution${contextHint}

ABSOLUTE RULE: Do NOT add ANY text, letters, words, numbers, banners with text, signs or written characters of any kind in any language. Only visual decorative elements. ZERO text.`;
    }

    // For photo-based mode with DALL-E, we can only generate (not edit inline with text prompt easily)
    // So we generate a new image inspired by the theme for both modes
    const MAX_RETRIES = 2;
    let imageUrl: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: promptText,
            n: 1,
            size: "1024x1024",
            quality: "hd",
            response_format: "b64_json",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const b64 = data.data?.[0]?.b64_json;
          if (b64) {
            imageUrl = b64;
            break;
          }
          throw new Error("Nenhuma imagem retornada pela OpenAI");
        }

        const errText = await response.text();
        console.error(`OpenAI DALL-E error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, response.status, errText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const delay = (attempt + 1) * 3000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
      } catch (fetchErr) {
        if (attempt >= MAX_RETRIES) throw fetchErr;
        const delay = (attempt + 1) * 3000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (!imageUrl) throw new Error("OpenAI falhou após tentativas de retry");

    // Decode base64 to Uint8Array
    const binaryStr = atob(imageUrl);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const filePath = `campaigns/composed-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("sales-materials")
      .upload(filePath, bytes, { contentType: "image/png", upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(filePath);

    // Generate thumbnail
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
        await resizeResp.text();
      }
    } catch (thumbErr) {
      console.error("Thumbnail generation failed:", thumbErr);
    }

    // Log AI usage
    await supabase.from("ai_usage_logs").insert({
      company_id,
      function_name: "campaign-image",
      model: "dall-e-3",
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0.08,
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
