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
    const { prompt_context, campaign_theme, company_name, company_id } = await req.json();

    if (!prompt_context || !company_id) {
      return new Response(
        JSON.stringify({ error: "prompt_context e company_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build optimized prompt in Portuguese - Gemini follows no-text instructions much better than DALL-E
    const themeHint = campaign_theme
      ? `O tema visual deve representar "${campaign_theme}" usando simbolos, cores e elementos decorativos apropriados (sem escrever o nome do tema). `
      : "";
    const prompt = `Crie uma ilustracao vibrante e festiva para um buffet de festas infantis. ${themeHint}Contexto: ${prompt_context}. Estilo: colorido, alegre, qualidade profissional de marketing. A imagem deve ser uma ilustracao artistica pura, SEM NENHUM texto, letra, palavra, numero, placa, faixa ou caractere escrito em qualquer idioma. Proibido qualquer elemento que contenha escrita. Formato quadrado, alto contraste, adequado para compartilhamento no WhatsApp.`;

    // Use Gemini image generation via Lovable AI Gateway
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
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (response.ok) break;

      const errText = await response.text();
      console.error(`Gemini error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, response.status, errText);

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

    const filePath = `campaigns/ai-${Date.now()}.${imageFormat}`;
    const { error: uploadError } = await supabase.storage
      .from("sales-materials")
      .upload(filePath, bytes, { contentType: `image/${imageFormat}`, upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Log AI usage
    const tokens = data.usage?.total_tokens || 500;
    await supabase.from("ai_usage_logs").insert({
      company_id,
      function_name: "campaign-image",
      model: "gemini-2.5-flash-image",
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: tokens,
      estimated_cost_usd: 0.02,
    });

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("campaign-image error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao gerar imagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
