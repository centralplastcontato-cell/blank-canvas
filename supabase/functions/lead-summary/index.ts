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
    const { lead_id, company_id } = await req.json();

    if (!lead_id || !company_id) {
      return new Response(JSON.stringify({ error: 'lead_id e company_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find conversation linked to this lead
    const { data: conversation, error: convError } = await supabase
      .from('wapi_conversations')
      .select('id, contact_name, bot_data, bot_step')
      .eq('lead_id', lead_id)
      .eq('company_id', company_id)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar conversa' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!conversation) {
      return new Response(JSON.stringify({ 
        summary: 'Nenhuma conversa encontrada para este lead.',
        nextAction: 'Inicie o contato via WhatsApp.',
        hasConversation: false 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch last 30 messages
    const { data: messages, error: msgError } = await supabase
      .from('wapi_messages')
      .select('content, from_me, message_type, timestamp')
      .eq('conversation_id', conversation.id)
      .order('timestamp', { ascending: false })
      .limit(30);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar mensagens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        summary: 'Conversa encontrada, mas sem mensagens registradas.',
        nextAction: 'Envie a primeira mensagem para o lead.',
        hasConversation: true 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format messages for AI (chronological order)
    const formattedMessages = messages
      .reverse()
      .map(m => {
        const sender = m.from_me ? 'Atendente' : 'Lead';
        const content = m.message_type === 'text' ? m.content : `[${m.message_type}]`;
        return `${sender}: ${content || '[sem conteúdo]'}`;
      })
      .join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente comercial de buffets de festas infantis. Analise a conversa de WhatsApp entre o atendente e o lead e retorne EXATAMENTE um JSON com dois campos:
- "summary": Resumo curto (2-3 frases) do contexto da conversa. O que o lead quer, qual o status atual, informações principais coletadas.
- "nextAction": Uma sugestão objetiva e prática da próxima ação que o atendente deveria tomar.

Responda APENAS o JSON, sem markdown, sem explicações.`
          },
          {
            role: 'user',
            content: `Conversa com ${conversation.contact_name || 'lead'}:\n\n${formattedMessages}`
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
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Erro ao gerar resumo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse JSON response from AI
    let summary = 'Não foi possível gerar o resumo.';
    let nextAction = 'Tente novamente.';

    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      summary = parsed.summary || summary;
      nextAction = parsed.nextAction || nextAction;
    } catch {
      // If AI didn't return valid JSON, use the raw text as summary
      if (raw.length > 10) {
        summary = raw;
        nextAction = 'Analise a conversa e decida o próximo passo.';
      }
    }

    return new Response(JSON.stringify({ summary, nextAction, hasConversation: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('lead-summary error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
