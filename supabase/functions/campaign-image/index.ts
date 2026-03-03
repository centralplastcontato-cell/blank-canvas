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

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Build optimized prompt in Portuguese to avoid English text rendering
    const themeHint = campaign_theme
      ? `O tema visual deve representar "${campaign_theme}" usando simbolos, cores e elementos decorativos apropriados (sem escrever o nome do tema). `
      : "";
    const prompt = `Crie uma ilustracao vibrante e festiva para um buffet de festas infantis. ${themeHint}Contexto: ${prompt_context}. Estilo: colorido, alegre, qualidade profissional de marketing. A imagem deve ser uma ilustracao artistica pura, SEM NENHUM texto, letra, palavra, numero, placa, faixa ou caractere escrito em qualquer idioma. Proibido qualquer elemento que contenha escrita. Formato quadrado, alto contraste, adequado para compartilhamento no WhatsApp.`;

    // Call DALL-E 3 with retry for transient server errors
    const MAX_RETRIES = 2;
    let openaiRes: Response | null = null;
    let lastError = "";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          size: "1024x1024",
          quality: "standard",
          response_format: "b64_json",
          n: 1,
        }),
      });

      if (openaiRes.ok) break;

      lastError = await openaiRes.text();
      console.error(`DALL-E error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, openaiRes.status, lastError);

      if (openaiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (openaiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da API esgotados. Contate o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Retry on 500/502/503 transient errors
      if (openaiRes.status >= 500 && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 3000;
        console.log(`Retrying DALL-E in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw new Error(`DALL-E API error: ${openaiRes.status}`);
    }

    if (!openaiRes || !openaiRes.ok) throw new Error("DALL-E falhou após tentativas de retry");

    const openaiData = await openaiRes.json();
    const b64 = openaiData.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data returned from DALL-E");

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

    const filePath = `campaigns/ai-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("sales-materials")
      .upload(filePath, bytes, { contentType: "image/png", upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Log AI usage
    await supabase.from("ai_usage_logs").insert({
      company_id,
      function_name: "campaign-image",
      model: "dall-e-3",
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0.04,
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
