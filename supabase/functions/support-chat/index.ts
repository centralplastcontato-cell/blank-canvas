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
- Notificações em tempo real de novas mensagens

### Status dos Leads
novo → em_contato → orcamento_enviado → aguardando_resposta → fechado/perdido
Especiais: transferido, trabalhe_conosco, fornecedor, cliente_retorno, outros

### WhatsApp
- Conexão via QR Code na aba Configurações > WhatsApp > Conexão
- Bot de qualificação automático (captura nome, mês, convidados, WhatsApp)
- Configuração do bot em Configurações > WhatsApp > Automações (aba Perguntas para editar mensagens, aba Geral para boas-vindas/conclusão)
- Materiais de venda (catálogos, vídeos) para enviar no chat
- Áudios podem ser gravados direto no chat
- Flow Builder (recurso avançado, desativado por padrão)
- Automação de follow-up automático
- Reativação de leads inativos
- Confirmação automática de visitas
- Link preview automático de URLs compartilhadas

### Central de Agenda (/agenda)
- Calendário mensal com eventos coloridos por unidade
- Criar eventos vinculados a leads
- Checklists por evento (templates reutilizáveis)
- Gestão de equipe (staff entries) e freelancers
- Lista de presença pública
- Envio de bot por evento
- Pré-reservas com aprovação/rejeição
- Tarefas por evento com prioridade e categorias
- Resumo mensal com cards de métricas
- Visualização por lista ou calendário
- Filtros por unidade e período

### Inteligência (/inteligencia)
- Score de lead (0-100) calculado automaticamente
- Temperatura: frio, morno, quente, pronto
- Follow-up automático com timeline
- Resumo diário com IA
- Resumo individual por lead com sugestão de ação
- Relatórios comerciais (conversão, tempo de resposta)
- Leads do dia (prioridades)
- Negociações paradas
- Funil de vendas visual
- Alertas inteligentes

### Contratos (/contratos)
- Modelos de contrato com variáveis automáticas (nome do cliente, data, valor, etc.)
- Editor de texto rico para criar modelos
- Geração automática de contratos vinculados a eventos
- Envio de contrato por WhatsApp
- Assinatura digital com canvas de assinatura
- Verificação via código OTP
- Histórico de versões dos modelos
- Auditoria completa de ações (criação, envio, assinatura)
- Preview e impressão de contratos
- Indicador visual de status (enviado ✅)

### Financeiro (/financeiro)
- Dashboard com resumo financeiro (receitas, despesas, saldo)
- Pagamentos vinculados a eventos
- Registro de despesas por categoria (fixas e variáveis)
- Contas bancárias múltiplas com saldo individual
- Transferências entre contas
- Relatórios financeiros com filtros por período
- Exportação em PDF e Excel (XLSX)
- Festas encerradas com análise de rentabilidade
- KPIs financeiros detalhados
- Simulador de taxas de cartão de crédito/débito
- Status de pagamento: pendente, pago, atrasado

### Campanhas (/campanhas)
- Base de leads para campanhas em massa
- Importação de leads via CSV ou manual
- Criação de campanhas com variações de mensagem
- Editor de texto com overlay para imagens
- Galeria de imagens por campanha (upload e IA)
- Envio em massa com delay configurável entre mensagens
- Filtros por status, mês, tipo de festa
- Acompanhamento de envio (enviado, erro, pendente)
- Histórico de campanhas anteriores

### Operações/Formulários (/formularios)
- Avaliação pós-festa com link público
- Pré-festa (dados do evento) com formulário público
- Contrato digital
- Cardápio (escolha de menu) com templates customizáveis
- Controle de festa (monitoramento em tempo real)
- Manutenção (gestão de reparos e manutenções)
- Todos com links públicos compartilháveis via WhatsApp

### Visitas (/agenda > aba Visitas)
- Agendamento de visitas vinculadas a leads
- Confirmação automática por WhatsApp
- Qualificação de visita (notas, fotos, interesse)
- Histórico de visitas por lead

### Freelancers
- Escalas mensais com eventos atribuídos
- Disponibilidade pública (formulário online)
- Avaliação com notas por critério (pontualidade, qualidade, etc.)
- PDF da escala para download
- Envio de escalas para grupos WhatsApp
- Autocomplete de freelancers cadastrados

### Treinamento (/treinamento)
- Vídeos de treinamento organizados por categoria
- Material de apoio para equipe
- Acesso por permissão

### Landing Pages Dinâmicas
- Configuráveis em Configurações > Landing Page
- Seções: Hero, Benefits, Gallery, Video, Testimonials, Offer, HowItWorks, SocialProof, Footer
- Tema customizável (cores, fontes)
- Bot de captura integrado
- Acesso via domínio próprio ou /lp/:slug

### Configurações (/configuracoes)
- Perfil do usuário
- WhatsApp: conexão, automações (bot de qualificação, perguntas, follow-ups, VIPs, reativação), materiais de venda, configurações avançadas
- Landing Page (editor visual)
- Pacotes de festa com grade de preços
- Opcionais de festa
- Unidades do buffet com cores
- Dados da empresa (onboarding)
- Usuários e permissões granulares
- Taxas de cartão por operadora
- Tipos de evento
- Controle de festa (itens configuráveis)
- Vendedores/responsáveis

### Permissões
- Roles: admin, gestor, comercial, visualização
- Roles na empresa: owner, admin, member
- Permissões granulares: leads.view, leads.edit, leads.delete, leads.export, leads.assign, users.view, users.manage, permissions.manage, financial.view
- Permissões por unidade

### Empresa Parceira (/parceiro)
Módulo para fornecedores parceiros do buffet (ex: confeitaria, decoração, brindes).
- Dashboard com métricas (pedidos do mês, faturamento, pendentes, itens no catálogo)
- Catálogo de produtos com preço, categoria e imagem
- Central de Pedidos em Kanban ou Lista (Pendente → Confirmado → Em Produção → Entregue)
- O buffet (admin) cria os pedidos; o parceiro gerencia produção e entrega

## Problemas Comuns e Soluções

1. **WhatsApp não conecta**: Ir em Configurações > WhatsApp > Conexão. Escanear QR Code. Se não aparecer, verificar se a instância está ativa.
2. **Leads não aparecem**: Verificar filtros ativos (unidade, mês, status). Verificar se está na empresa correta (seletor de empresa no topo).
3. **Bot não responde**: Verificar se o bot está ativado em Configurações > WhatsApp > Automações. Verificar se as perguntas estão configuradas na aba "Perguntas".
4. **Landing page não aparece**: Verificar se está publicada em Configurações > Landing Page. Verificar DNS do domínio customizado.
5. **Como alterar respostas do bot**: Ir em Configurações > WhatsApp > Automações. Na aba "Perguntas" editar mensagens. Na aba "Geral" alterar boas-vindas e conclusão.
6. **Sem acesso a funcionalidade**: Verificar permissões com o administrador da empresa.
7. **Formulário público não abre**: Verificar se o template está ativo e o link correto (slug da empresa + slug do template).
8. **Contrato mostra como não enviado após recarregar**: O status é salvo no banco — se persistir, reportar como bug.
9. **Financeiro não aparece no menu**: Verificar se a permissão financial.view está habilitada para seu usuário.
10. **Evento não aparece no calendário**: Verificar filtro de unidade selecionada e o mês correto.
11. **Escala de freelancer não gera PDF**: Verificar se há eventos e freelancers atribuídos no mês selecionado.
12. **Campanha não envia**: Verificar se o WhatsApp está conectado e se há leads selecionados na campanha.

## Instruções para você

- Responda SEMPRE em português brasileiro
- Seja amigável e objetivo
- Se não souber a resposta, diga que vai criar um ticket para a equipe analisar
- Quando detectar um relato de ERRO ou BUG, retorne o campo "createTicket" como true
- Quando detectar uma SUGESTÃO de melhoria, retorne o campo "createTicket" como true com category "sugestao"
- Classifique a prioridade: baixa (dúvida simples), media (funcionalidade não funciona), alta (dados incorretos), critica (sistema inacessível)
- Use markdown na resposta (listas, negrito, links)
- NUNCA mencione o Hub ou funcionalidades do Hub — foque apenas na plataforma do buffet
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

    // Get user from auth header
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Extract user from JWT
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id || null;
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

    let parsed: {
      message: string;
      createTicket: boolean;
      subject?: string;
      priority?: string;
      category?: string;
    };

    if (toolCall?.function?.arguments) {
      parsed = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {
          message: content || "Desculpe, não consegui processar sua mensagem. Tente novamente.",
          createTicket: false,
          priority: "media",
          category: "duvida",
        };
      }
    }

    // Log usage to ai_usage_logs
    if (usage && company_id) {
      try {
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

    // SERVER-SIDE TICKET CREATION using service role (bypasses RLS)
    let ticketCreated = false;
    if (parsed.createTicket && userId) {
      try {
        const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
        const { error: ticketError } = await sb.from("support_tickets").insert({
          company_id: company_id || null,
          user_id: userId,
          user_name: context?.user_name || null,
          user_email: context?.user_email || null,
          subject: parsed.subject || "Ticket de suporte",
          description: lastUserMsg?.content || "",
          category: parsed.category || "duvida",
          page_url: context?.page_url || null,
          user_agent: context?.user_agent || null,
          console_errors: context?.console_errors || [],
          context_data: {
            company_name: context?.company_name || null,
            role: context?.role || null,
          },
          priority: parsed.priority || "media",
          ai_classification: parsed.category || null,
          conversation_history: messages,
        });

        if (ticketError) {
          console.error("Ticket creation error:", JSON.stringify(ticketError));
        } else {
          ticketCreated = true;
          console.log("Ticket created successfully for user", userId);
        }
      } catch (e) {
        console.error("Error creating ticket:", e);
      }
    } else if (parsed.createTicket && !userId) {
      console.error("Cannot create ticket: no userId from auth header");
    }

    return new Response(JSON.stringify({ ...parsed, ticketCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
