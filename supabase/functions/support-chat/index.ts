import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KNOWLEDGE_BASE = `
Você é o assistente de suporte da Celebrei, uma plataforma SaaS para gestão de buffets infantis.

## Módulos da Plataforma

### Central de Atendimento (/atendimento)
- CRM com Kanban drag-and-drop de leads
- Chat WhatsApp integrado (W-API)
- Filtros por unidade, mês, responsável, status
- Transferência de leads entre unidades
- Exportação CSV/Excel

### Status dos Leads
novo → em_contato → orcamento_enviado → aguardando_resposta → fechado/perdido
Especiais: transferido, trabalhe_conosco, fornecedor, cliente_retorno, outros

### WhatsApp
- Conexão via QR Code na aba Configurações > WhatsApp
- Bot automático para LP (captura nome, mês, convidados, WhatsApp)
- Flow Builder visual para fluxos personalizados
- Materiais de venda (catálogos, vídeos) para enviar no chat
- Áudios podem ser gravados direto no chat

### Agenda (/agenda)
- Calendário mensal com eventos coloridos por unidade
- Criar eventos vinculados a leads
- Checklists por evento (templates reutilizáveis)
- Gestão de equipe (staff entries)
- Lista de presença pública
- Envio de bot por evento

### Inteligência (/inteligencia)
- Score de lead (0-100) calculado automaticamente
- Temperatura: frio, morno, quente, pronto
- Follow-up automático
- Resumo diário com IA
- Resumo individual por lead com sugestão de ação
- Contexto da IA personalizável com dados do buffet

### Landing Pages Dinâmicas
- Configuráveis em Configurações > Landing Page
- Seções: Hero, Benefits, Gallery, Video, Testimonials, Offer, Footer
- Tema customizável (cores, fontes)
- Bot de captura integrado
- Acesso via domínio próprio ou /lp/:slug

### Formulários (/formularios)
- Avaliação pós-festa
- Pré-festa (dados do evento)
- Contrato digital
- Cardápio (escolha de menu)
- Todos com links públicos compartilháveis

### Freelancers (/dashboard)
- Escalas mensais com eventos
- Atribuição de freelancers a eventos
- Disponibilidade pública (formulário)
- Avaliação com notas por critério
- PDF da escala
- Envio para grupos WhatsApp

### Configurações (/configuracoes)
- Perfil do usuário
- WhatsApp (conexão, bot, mensagens)
- Landing Page (editor visual)
- Pacotes de festa
- Unidades do buffet
- Dados da empresa (onboarding)
- Usuários e permissões

### Permissões
- Roles: admin, gestor, comercial, visualização
- Roles na empresa: owner, admin, member
- Permissões granulares: leads.view, leads.edit, leads.delete, leads.export, leads.assign, users.view, users.manage, permissions.manage
- Permissões por unidade

### Hub (Grupo Celebrei)
- Dashboard com métricas agregadas de todas as empresas
- Gestão de empresas filhas
- Onboarding de novos buffets
- Prospecção B2B
- Consumo de IA
- Treinamento

## Problemas Comuns e Soluções

1. **WhatsApp não conecta**: Ir em Configurações > WhatsApp > Conexão. Escanear QR Code. Se não aparecer, verificar se a instância está ativa.
2. **Leads não aparecem**: Verificar filtros ativos (unidade, mês, status). Verificar se está na empresa correta (seletor de empresa no topo).
3. **Bot não responde**: Verificar se o bot está ativado em Configurações > WhatsApp > Bot. Verificar se há um fluxo ativo no Flow Builder.
4. **Landing page não aparece**: Verificar se está publicada em Configurações > Landing Page. Verificar DNS do domínio customizado.
5. **Sem acesso a funcionalidade**: Verificar permissões com o administrador da empresa.
6. **Formulário público não abre**: Verificar se o template está ativo. Verificar se o link está correto (slug da empresa + slug do template).

## Instruções para você

- Responda SEMPRE em português brasileiro
- Seja amigável e objetivo
- Se não souber a resposta, diga que vai criar um ticket para a equipe analisar
- Quando detectar um relato de ERRO ou BUG, retorne o campo "createTicket" como true
- Quando detectar uma SUGESTÃO de melhoria, retorne o campo "createTicket" como true com category "sugestao"
- Classifique a prioridade: baixa (dúvida simples), media (funcionalidade não funciona), alta (dados incorretos), critica (sistema inacessível)
- Use markdown na resposta (listas, negrito, links)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, company_id } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const contextInfo = context
      ? `\n\n## Contexto do Usuário\n- Página: ${context.page_url || "N/A"}\n- Empresa: ${context.company_name || "N/A"}\n- Role: ${context.role || "N/A"}\n- Navegador: ${context.user_agent || "N/A"}`
      : "";

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: KNOWLEDGE_BASE + contextInfo + `\n\nIMPORTANTE: Responda em formato JSON com a seguinte estrutura:
{
  "message": "sua resposta em markdown",
  "createTicket": false,
  "subject": null,
  "priority": "media",
  "category": "duvida"
}

Categorias possíveis: "duvida", "bug", "sugestao"
Prioridades: "baixa", "media", "alta", "critica"
Coloque createTicket=true quando:
- O usuário relata um erro/bug
- O usuário faz uma sugestão de melhoria
- Você não consegue resolver a dúvida`,
            },
            ...messages,
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "respond_to_user",
                description:
                  "Respond to the user's support query with an answer and optional ticket creation",
                parameters: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description: "The response message in markdown format",
                    },
                    createTicket: {
                      type: "boolean",
                      description:
                        "Whether to create a support ticket for this issue",
                    },
                    subject: {
                      type: "string",
                      description:
                        "Subject for the ticket if createTicket is true",
                    },
                    priority: {
                      type: "string",
                      enum: ["baixa", "media", "alta", "critica"],
                      description: "Priority level",
                    },
                    category: {
                      type: "string",
                      enum: ["duvida", "bug", "sugestao"],
                      description: "Category of the issue",
                    },
                  },
                  required: ["message", "createTicket", "priority", "category"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "respond_to_user" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Muitas requisições. Tente novamente em alguns segundos.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos insuficientes. Contate o administrador.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      throw new Error("OpenAI API error");
    }

    const data = await response.json();
    const usage = data.usage;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    // Log usage to ai_usage_logs
    if (usage && company_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);

        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || 0;
        const estimatedCost = (promptTokens * 0.15 + completionTokens * 0.6) / 1_000_000;

        await sb.from("ai_usage_logs").insert({
          company_id,
          function_name: "support-chat",
          model: "gpt-4o-mini",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          estimated_cost_usd: estimatedCost,
        });
      } catch (logErr) {
        console.error("Failed to log AI usage:", logErr);
      }
    }

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(
        JSON.stringify({
          message: content || "Desculpe, não consegui processar sua mensagem. Tente novamente.",
          createTicket: false,
          priority: "media",
          category: "duvida",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
