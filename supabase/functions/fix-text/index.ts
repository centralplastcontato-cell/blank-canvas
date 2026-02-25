import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, company_id } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Texto é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um corretor ortográfico e gramatical de português brasileiro.
Sua ÚNICA tarefa é corrigir erros de ortografia, acentuação e gramática no texto fornecido.
Regras:
- NÃO altere o significado, tom ou estilo do texto
- NÃO adicione ou remova palavras desnecessariamente
- Mantenha abreviações, gírias e informalidade se o texto original for informal
- Mantenha emojis e formatação WhatsApp (*negrito*, _itálico_)
- Se o texto já estiver correto, retorne-o exatamente igual
- Retorne APENAS o texto corrigido, sem explicações`
          },
          {
            role: 'user',
            content: text
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos OpenAI insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Erro ao corrigir texto' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim() || text;
    const hasChanges = corrected !== text;

    // Log AI usage
    if (company_id && data.usage) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const promptTokens = data.usage.prompt_tokens || 0;
        const completionTokens = data.usage.completion_tokens || 0;
        await supabase.from('ai_usage_logs').insert({
          company_id,
          function_name: 'fix-text',
          model: 'gpt-4o-mini',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: data.usage.total_tokens || 0,
          estimated_cost_usd: (promptTokens * 0.15 + completionTokens * 0.6) / 1_000_000,
        });
      } catch (e) { console.error('AI usage log error:', e); }
    }

    return new Response(JSON.stringify({ corrected, hasChanges }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('fix-text error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
