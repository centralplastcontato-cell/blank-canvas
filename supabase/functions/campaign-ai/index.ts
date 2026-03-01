import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, companyName, company_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um copywriter especializado em marketing via WhatsApp para buffets infantis.
Dado o contexto da campanha e o nome da empresa, gere exatamente 5 variações de mensagem.

Regras:
- Cada variação deve ter um tom diferente: 1) profissional, 2) amigável/casual, 3) com urgência, 4) curta/direta, 5) detalhada/descritiva
- Use a variável {nome} onde o nome do cliente seria inserido (ex: "Oi {nome}!")
- Mantenha as mensagens entre 2-5 linhas cada
- Use emojis moderadamente
- O nome da empresa é "${companyName}"
- NÃO use markdown, apenas texto simples com quebras de linha
- As mensagens devem parecer naturais como se fossem escritas por uma pessoa`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Contexto da campanha: ${context}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_variations",
                description:
                  "Retorna 5 variações de texto para a campanha de WhatsApp",
                parameters: {
                  type: "object",
                  properties: {
                    variations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          tone: {
                            type: "string",
                            description:
                              "Tom da variação (profissional, amigável, urgente, curta, detalhada)",
                          },
                          text: {
                            type: "string",
                            description:
                              "Texto da mensagem com {nome} como variável",
                          },
                        },
                        required: ["tone", "text"],
                        additionalProperties: false,
                      },
                      minItems: 5,
                      maxItems: 5,
                    },
                  },
                  required: ["variations"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_variations" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Log usage to ai_usage_logs if company_id is provided
    if (company_id && data.usage) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);

        const promptTokens = data.usage.prompt_tokens || 0;
        const completionTokens = data.usage.completion_tokens || 0;
        const totalTokens = data.usage.total_tokens || promptTokens + completionTokens;
        // Gemini Flash pricing approximation: ~$0.00001 per token
        const estimatedCost = totalTokens * 0.00001;

        await sb.from("ai_usage_logs").insert({
          company_id,
          function_name: "campaign-ai",
          model: "gemini-3-flash-preview",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          estimated_cost_usd: estimatedCost,
        });
      } catch (logErr) {
        console.error("Failed to log AI usage (non-blocking):", logErr);
      }
    }

    return new Response(JSON.stringify({ variations: parsed.variations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("campaign-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
