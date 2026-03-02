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
    const { base_image_url, logo_url, company_id, position, enhance, context } = await req.json();

    if (!base_image_url || !company_id) {
      return new Response(
        JSON.stringify({ error: "base_image_url e company_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const positionMap: Record<string, string> = {
      "top-left": "top-left corner",
      "top-right": "top-right corner",
      "bottom-left": "bottom-left corner",
      "bottom-right": "bottom-right corner",
      "center": "center",
    };
    const posLabel = positionMap[position] || "bottom-right corner";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Build prompt based on mode
    let promptText: string;
    const imageContent: any[] = [
      { type: "image_url", image_url: { url: base_image_url } },
    ];

    if (enhance) {
      // Enhanced mode: creative AI art combining photo + logo + design elements
      promptText = `Create a professional, eye-catching promotional image for a children's party venue. Use the provided photo as the main background/visual element.${
        logo_url ? ` Place the company logo prominently in the ${posLabel}.` : ""
      } Add subtle festive design elements (confetti, balloons, stars, ribbons) around the edges. Enhance the colors to look vibrant and inviting. The image should look like a polished marketing flyer.${
        context ? ` Campaign context: ${context}` : ""
      } IMPORTANT: Do NOT add any text, letters, words, numbers, banners with text, or written characters of any kind to the image. Pure visual art only.`;
      if (logo_url) {
        imageContent.push({ type: "image_url", image_url: { url: logo_url } });
      }
    } else {
      // Simple overlay mode (existing behavior)
      if (!logo_url) {
        return new Response(
          JSON.stringify({ error: "logo_url é obrigatório para sobreposição" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      promptText = `Place this logo in the ${posLabel} of the base image. The logo should be clearly visible but not too large (about 15-20% of the image width). Keep the logo proportions intact. Do not alter the base image content. The result should look like a professional marketing image with a logo placement.`;
      imageContent.push({ type: "image_url", image_url: { url: logo_url } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
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

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);

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
      throw new Error(`Gemini API error: ${response.status}`);
    }

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
      .upload(filePath, bytes, {
        contentType: `image/${imageFormat}`,
        upsert: false,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(filePath);

    // Log AI usage
    const tokens = data.usage?.total_tokens || 500;
    await supabase.from("ai_usage_logs").insert({
      company_id,
      function_name: "campaign-compose",
      model: "gemini-2.5-flash-image",
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: tokens,
      estimated_cost_usd: 0.02,
    });

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("campaign-compose error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao compor imagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
