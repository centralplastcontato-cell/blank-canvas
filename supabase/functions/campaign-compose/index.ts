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
      "top-left": "canto superior esquerdo",
      "top-right": "canto superior direito",
      "bottom-left": "canto inferior esquerdo",
      "bottom-right": "canto inferior direito",
      "center": "centro",
    };
    const posLabel = positionMap[position] || "canto inferior direito";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Build prompt based on mode
    let promptText: string;
    const imageContent: any[] = [
      { type: "image_url", image_url: { url: base_image_url } },
    ];

    if (enhance) {
      // Enhanced mode: creative AI art combining photo + logo + design elements
      promptText = `Aprimore esta foto para parecer uma arte promocional profissional de buffet infantil. Use a foto fornecida como elemento visual principal.${
        logo_url ? ` Posicione o logotipo da empresa no ${posLabel} da imagem.` : ""
      } Adicione elementos decorativos sutis (confetes, baloes, estrelas, fitas) nas bordas. Realce as cores para ficarem vibrantes e convidativas.${
        context ? ` Contexto da campanha: ${context}.` : ""
      } REGRA OBRIGATORIA: NAO adicione nenhum texto, letra, palavra, numero, faixa com texto ou caractere escrito de qualquer tipo na imagem. Apenas arte visual.`;
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
      promptText = `Posicione este logotipo no ${posLabel} da imagem base. O logotipo deve estar claramente visivel mas nao muito grande (cerca de 15-20% da largura da imagem). Mantenha as proporcoes do logotipo intactas. Nao altere o conteudo da imagem base. O resultado deve parecer uma imagem de marketing profissional com posicionamento de logotipo.`;
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
