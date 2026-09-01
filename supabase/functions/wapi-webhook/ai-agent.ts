// ============= AGENTE DE IA CONVERSACIONAL (BETA) =============
// Atende conversas de UMA unidade configurada (ex: VENDAS 3), somente para
// leads/conversas novos (criados após a ativação). Conversa natural, envia
// materiais, agenda visitas e transfere para humano quando necessário.
// Regras duras: nunca fala preços, nunca promete, nunca inventa.
//
// Módulo autocontido: não importa nada de index.ts (evita import circular).

// deno-lint-ignore-file no-explicit-any
type Json = Record<string, unknown>;

interface AgentInstance {
  id: string;
  instance_id: string;
  instance_token: string;
  unit: string | null;
  company_id: string;
  provider?: string | null;
}

interface AgentConv {
  id: string;
  remote_jid: string;
  bot_enabled: boolean | null;
  bot_step: string | null;
  bot_data: Json | null;
  lead_id: string | null;
  created_at?: string;
}

interface AiSettings {
  enabled: boolean;
  unit: string | null;
  activated_at: string | null;
  extra_instructions: string | null;
  visit_hours: string;
  model: string;
}

const AI_STEP = 'ai_agent';
const MAX_HISTORY_MESSAGES = 30;
const MAX_TOOL_ROUNDS = 4;

function getPhoneVariantsBR(phone: string): string[] {
  const clean = phone.replace(/\D/g, '');
  const variants = new Set<string>([clean]);
  const without55 = clean.startsWith('55') ? clean.slice(2) : clean;
  const with55 = clean.startsWith('55') ? clean : `55${clean}`;
  variants.add(without55);
  variants.add(with55);
  // Variantes com/sem o nono dígito (DDD + 9XXXXXXXX vs DDD + XXXXXXXX)
  if (without55.length === 11 && without55[2] === '9') {
    const short = without55.slice(0, 2) + without55.slice(3);
    variants.add(short);
    variants.add(`55${short}`);
  } else if (without55.length === 10) {
    const long = without55.slice(0, 2) + '9' + without55.slice(2);
    variants.add(long);
    variants.add(`55${long}`);
  }
  return Array.from(variants);
}

async function sendViaWapiSend(
  action: 'send-text' | 'send-image' | 'send-video' | 'send-document',
  instance: AgentInstance,
  conv: AgentConv,
  payload: { message?: string; mediaUrl?: string; caption?: string; fileName?: string },
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return false;

  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), action === 'send-video' ? 60000 : 30000);
  try {
    const body: Json = {
      action,
      phone,
      instanceId: instance.instance_id,
      instanceToken: instance.instance_token,
      conversationId: conv.id,
      companyId: instance.company_id,
      source: 'bot',
      automation: true,
      ...payload,
    };
    const response = await fetch(`${supabaseUrl}/functions/v1/wapi-send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[AI Agent] ${action} failed (${response.status}): ${await response.text()}`);
      return false;
    }
    const parsed = await response.json().catch(() => null) as Json | null;
    if (parsed?.success === false || parsed?.error) {
      console.error(`[AI Agent] ${action} returned error:`, parsed);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[AI Agent] ${action} threw:`, err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSettings(supabase: any, companyId: string): Promise<AiSettings | null> {
  const { data } = await supabase
    .from('ai_agent_settings')
    .select('enabled, unit, activated_at, extra_instructions, visit_hours, model')
    .eq('company_id', companyId)
    .maybeSingle();
  return (data as AiSettings) || null;
}

// Decide (uma única vez por conversa) se a IA pode assumir. O resultado fica
// gravado em bot_data.ai_agent ('on'/'off') para não reavaliar a cada mensagem.
async function isEligible(
  supabase: any,
  settings: AiSettings,
  conv: AgentConv,
  phone: string,
  companyId: string,
): Promise<boolean> {
  const botData = (conv.bot_data || {}) as Json;
  if (botData.ai_agent === 'on') return true;
  if (botData.ai_agent === 'off') return false;

  const activatedAt = settings.activated_at ? new Date(settings.activated_at).getTime() : 0;
  const convCreatedAt = conv.created_at ? new Date(conv.created_at).getTime() : 0;

  let eligible = true;

  // Só conversas criadas depois da ativação da IA
  if (!activatedAt || !convCreatedAt || convCreatedAt < activatedAt) eligible = false;

  // Bot fixo já engajado no meio de uma qualificação: não rouba a conversa
  if (eligible && conv.bot_step && conv.bot_step !== 'lp_sent' && conv.bot_step !== AI_STEP) {
    eligible = false;
  }

  // Lead antigo (criado antes da ativação, já trabalhado ou com orçamento): fora
  if (eligible) {
    const variants = getPhoneVariantsBR(phone);
    const { data: leads } = await supabase
      .from('campaign_leads')
      .select('id, status, created_at')
      .eq('company_id', companyId)
      .in('whatsapp', variants)
      .limit(10);
    for (const lead of (leads || []) as Array<{ id: string; status: string; created_at: string }>) {
      const leadCreated = new Date(lead.created_at).getTime();
      const oldLead = leadCreated < activatedAt;
      const workedStatus = !['novo', 'em_contato'].includes(lead.status);
      if (oldLead || workedStatus) {
        eligible = false;
        break;
      }
    }
  }

  // Grava a decisão
  const newBotData = { ...(conv.bot_data || {}), ai_agent: eligible ? 'on' : 'off' } as Json;
  await supabase.from('wapi_conversations').update({ bot_data: newBotData }).eq('id', conv.id);
  conv.bot_data = newBotData;
  return eligible;
}

function buildSystemPrompt(companyName: string, unit: string, settings: AiSettings, today: string): string {
  return `Você é a assistente virtual de vendas do ${companyName} (buffet infantil), atendendo pelo WhatsApp da unidade ${unit}. Hoje é ${today}.

SEU OBJETIVO PRINCIPAL: conduzir a conversa de forma simpática e natural até AGENDAR UMA VISITA ao buffet. A visita é o passo que mais fecha festas.

COMO CONVERSAR:
- Português brasileiro, tom caloroso e humano, mensagens CURTAS (2 a 4 frases). No máximo 1 emoji por mensagem.
- Uma pergunta por vez. Nunca envie listas de opções numeradas — converse como gente.
- Descubra naturalmente: nome da pessoa, mês/data desejada da festa e número de convidados, se ainda não souber.
- Quebre objeções com empatia ("vou pensar" → ofereça a visita sem compromisso; "tá caro" → valorize o que está incluso e chame para conhecer o espaço).

REGRAS INEGOCIÁVEIS:
1. NUNCA informe preços, valores, formas de pagamento ou descontos — nem estimativas. Se perguntarem, diga que a equipe envia o orçamento certinho e ofereça o material de pacotes (use a ferramenta enviar_materiais) e/ou agende a visita.
2. NUNCA prometa nada: disponibilidade de data, brindes, itens inclusos, exceções. Quem confirma detalhes é a equipe.
3. NUNCA invente informações. Se não souber responder, use a ferramenta transferir_para_atendente.
4. Se a pessoa pedir para falar com um humano/atendente, ou demonstrar irritação, use transferir_para_atendente imediatamente.
5. Não diga que você é uma IA a menos que perguntem diretamente; se perguntarem, admita com naturalidade.

AGENDAMENTO DE VISITAS:
- Horários possíveis: ${settings.visit_hours}.
- Proponha 2 opções de dia/horário dentro dessas janelas. Quando a pessoa confirmar dia e horário, use a ferramenta agendar_visita.
- Após agendar, confirme por mensagem o dia/horário e diga que a equipe confirma a visita.

MATERIAIS: você pode enviar fotos do espaço, vídeo de apresentação e o PDF de pacotes com a ferramenta enviar_materiais. Envie quando fizer sentido (pessoa quer conhecer o espaço, pergunta o que está incluso, pede valores).
${settings.extra_instructions ? `\nINFORMAÇÕES DO BUFFET (use somente isto como fonte):\n${settings.extra_instructions}` : ''}`;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'agendar_visita',
      description: 'Registra a visita no sistema quando o cliente CONFIRMAR dia e horário. Use somente após confirmação explícita.',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data da visita no formato YYYY-MM-DD' },
          horario: { type: 'string', description: 'Horário no formato HH:MM (ex: 10:00, 15:30)' },
          nome_cliente: { type: 'string', description: 'Nome da pessoa, se ela informou' },
        },
        required: ['data', 'horario'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enviar_materiais',
      description: 'Envia materiais do buffet para o cliente: fotos do espaço, vídeo de apresentação ou PDF de pacotes.',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['fotos', 'video', 'pacotes'], description: 'Qual material enviar' },
        },
        required: ['tipo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transferir_para_atendente',
      description: 'Transfere a conversa para a equipe humana. Use quando o cliente pedir, quando você não souber responder, ou em situações delicadas.',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string', description: 'Motivo curto da transferência' },
        },
        required: ['motivo'],
      },
    },
  },
];

async function ensureLead(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  nomeCliente?: string,
): Promise<string | null> {
  if (conv.lead_id) {
    if (nomeCliente) {
      await supabase.from('campaign_leads').update({ name: nomeCliente }).eq('id', conv.lead_id);
    }
    return conv.lead_id;
  }
  const clean = phone.replace(/\D/g, '');
  const { data: newLead } = await supabase.from('campaign_leads').insert({
    name: nomeCliente || contactName || clean,
    whatsapp: clean.startsWith('55') ? clean : `55${clean}`,
    unit: instance.unit,
    campaign_id: 'ai-agent',
    campaign_name: 'WhatsApp (IA)',
    status: 'novo',
    company_id: instance.company_id,
  }).select('id').single();
  if (newLead?.id) {
    await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
    conv.lead_id = newLead.id as string;
    return newLead.id as string;
  }
  return null;
}

async function toolAgendarVisita(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  args: { data?: string; horario?: string; nome_cliente?: string },
): Promise<string> {
  const dataVisita = (args.data || '').trim();
  const horario = (args.horario || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataVisita) || !/^\d{1,2}:\d{2}$/.test(horario)) {
    return 'ERRO: data ou horário em formato inválido. Peça a confirmação do dia e horário novamente.';
  }
  if (new Date(`${dataVisita}T23:59:59`).getTime() < Date.now()) {
    return 'ERRO: essa data já passou. Proponha uma data futura.';
  }

  const leadId = await ensureLead(supabase, instance, conv, phone, contactName, args.nome_cliente);
  if (!leadId) return 'ERRO: não foi possível registrar o lead. Use transferir_para_atendente.';

  const { error } = await supabase.from('lead_visits').insert({
    lead_id: leadId,
    company_id: instance.company_id,
    data_visita: dataVisita,
    horario_visita: horario,
    status_visita: 'agendada',
    observacoes: 'Visita agendada pela IA (beta)',
    unit: instance.unit,
    visit_type: 'visita',
  });
  if (error) {
    console.error('[AI Agent] lead_visits insert error:', error);
    return 'ERRO: falha ao registrar a visita. Use transferir_para_atendente.';
  }

  await supabase.from('campaign_leads').update({ status: 'em_contato' }).eq('id', leadId);
  await supabase.from('wapi_conversations').update({ has_scheduled_visit: true }).eq('id', conv.id);
  await supabase.from('lead_history').insert({
    lead_id: leadId,
    company_id: instance.company_id,
    user_id: null,
    user_name: 'IA (beta)',
    action: 'Visita agendada',
    new_value: `${dataVisita.split('-').reverse().join('/')} às ${horario}`,
  }).then(({ error: hErr }: { error: unknown }) => { if (hErr) console.error('[AI Agent] lead_history error:', hErr); });

  return `OK: visita registrada para ${dataVisita.split('-').reverse().join('/')} às ${horario}. Confirme para o cliente.`;
}

async function toolEnviarMateriais(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  tipo: string,
): Promise<string> {
  const unit = instance.unit;
  let { data: materials } = await supabase
    .from('sales_materials')
    .select('*')
    .eq('unit', unit)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (!materials || materials.length === 0) {
    const fallback = await supabase
      .from('sales_materials')
      .select('*')
      .eq('company_id', instance.company_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    materials = fallback.data;
  }
  if (!materials || materials.length === 0) {
    return 'ERRO: nenhum material cadastrado. Diga que a equipe vai enviar os materiais em seguida.';
  }

  if (tipo === 'fotos') {
    const collection = (materials as any[]).find((m) => m.type === 'photo_collection');
    const photos: string[] = collection?.photo_urls || [];
    if (photos.length === 0) return 'ERRO: sem fotos cadastradas.';
    for (let i = 0; i < Math.min(photos.length, 6); i++) {
      await sendViaWapiSend('send-image', instance, conv, { mediaUrl: photos[i], caption: '' });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return `OK: ${Math.min(photos.length, 6)} fotos enviadas.`;
  }

  if (tipo === 'video') {
    const video = (materials as any[]).find((m) => m.type === 'video');
    if (!video?.file_url) return 'ERRO: sem vídeo cadastrado.';
    const ok = await sendViaWapiSend('send-video', instance, conv, { mediaUrl: video.file_url, caption: '' });
    return ok ? 'OK: vídeo enviado.' : 'ERRO: falha ao enviar o vídeo.';
  }

  if (tipo === 'pacotes') {
    const pdf = (materials as any[]).find((m) => m.type === 'pdf_package');
    if (!pdf?.file_url) return 'ERRO: sem PDF de pacotes cadastrado.';
    const ok = await sendViaWapiSend('send-document', instance, conv, {
      mediaUrl: pdf.file_url,
      fileName: pdf.name ? `${pdf.name}.pdf` : 'Pacotes.pdf',
    });
    return ok ? 'OK: PDF de pacotes enviado (sem valores).' : 'ERRO: falha ao enviar o PDF.';
  }

  return 'ERRO: tipo de material desconhecido.';
}

async function toolTransferir(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  motivo: string,
): Promise<string> {
  await supabase.from('wapi_conversations').update({
    bot_enabled: false,
    bot_step: 'human_takeover',
    unread_count: 99,
  }).eq('id', conv.id);
  conv.bot_enabled = false;
  conv.bot_step = 'human_takeover';
  console.log(`[AI Agent] Transferred conv ${conv.id} to human. Motivo: ${motivo}`);
  return 'OK: conversa transferida para a equipe. Avise o cliente que um atendente vai continuar em breve.';
}

// Ponto de entrada. Retorna true quando a IA cuidou da mensagem (o bot fixo não roda).
export async function maybeHandleWithAiAgent(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  content: string,
  phone: string,
  contactName: string | null,
): Promise<boolean> {
  try {
    if (!instance.unit || !instance.company_id) return false;

    const settings = await loadSettings(supabase, instance.company_id);
    if (!settings || !settings.enabled || !settings.unit) return false;
    if ((settings.unit || '').trim().toLowerCase() !== (instance.unit || '').trim().toLowerCase()) return false;

    // Equipe assumiu (botão Inativo, mensagem humana ou transferência): IA fica fora
    if (conv.bot_step === 'human_takeover') return false;
    if (conv.bot_step === AI_STEP && conv.bot_enabled === false) return false;

    if (!(await isEligible(supabase, settings, conv, phone, instance.company_id))) return false;

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('[AI Agent] OPENAI_API_KEY not configured — falling back to fixed bot');
      return false;
    }

    // Adota a conversa
    if (conv.bot_step !== AI_STEP) {
      await supabase.from('wapi_conversations').update({ bot_step: AI_STEP, bot_enabled: true }).eq('id', conv.id);
      conv.bot_step = AI_STEP;
      conv.bot_enabled = true;
    }

    // Histórico da conversa
    const { data: history } = await supabase
      .from('wapi_messages')
      .select('from_me, content, message_type, timestamp')
      .eq('conversation_id', conv.id)
      .order('timestamp', { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);

    const ordered = ((history || []) as Array<{ from_me: boolean; content: string | null; message_type: string }>).reverse();
    const chatMessages: Json[] = ordered
      .filter((m) => (m.content || '').trim().length > 0 || m.message_type !== 'text')
      .map((m) => ({
        role: m.from_me ? 'assistant' : 'user',
        content: m.message_type === 'text'
          ? (m.content || '')
          : `[${m.message_type}] ${m.content || ''}`.trim(),
      }));
    // Garante que a última mensagem do cliente está presente
    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].role !== 'user') {
      chatMessages.push({ role: 'user', content });
    }

    let companyName = instance.unit || '';
    const { data: companyRow } = await supabase.from('companies').select('name').eq('id', instance.company_id).maybeSingle();
    if (companyRow?.name) companyName = companyRow.name as string;

    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    });
    const systemPrompt = buildSystemPrompt(companyName, instance.unit, settings, today);

    const conversation: Json[] = [{ role: 'system', content: systemPrompt }, ...chatMessages];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'gpt-4o-mini',
          messages: conversation,
          tools: TOOLS,
          temperature: 0.6,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        console.error(`[AI Agent] OpenAI error ${response.status}: ${await response.text()}`);
        return true; // conversa é da IA; não deixa o bot fixo mandar menu no meio
      }

      const result = await response.json() as any;
      const choice = result?.choices?.[0]?.message;
      if (!choice) return true;

      const toolCalls = choice.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;

      if (toolCalls && toolCalls.length > 0) {
        conversation.push(choice as Json);
        for (const call of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* args vazios */ }
          let toolResult = 'ERRO: ferramenta desconhecida.';
          if (call.function.name === 'agendar_visita') {
            toolResult = await toolAgendarVisita(supabase, instance, conv, phone, contactName, args);
          } else if (call.function.name === 'enviar_materiais') {
            toolResult = await toolEnviarMateriais(supabase, instance, conv, String(args.tipo || ''));
          } else if (call.function.name === 'transferir_para_atendente') {
            toolResult = await toolTransferir(supabase, instance, conv, String(args.motivo || ''));
          }
          conversation.push({ role: 'tool', tool_call_id: call.id, content: toolResult });
        }
        continue; // nova rodada para a IA redigir a resposta final
      }

      const reply = (choice.content || '').trim();
      if (reply) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await sendViaWapiSend('send-text', instance, conv, { message: reply });
      }
      return true;
    }

    console.warn('[AI Agent] Max tool rounds reached without final reply');
    return true;
  } catch (err) {
    console.error('[AI Agent] Unexpected error:', err);
    // Em erro inesperado, não deixa o bot fixo atropelar uma conversa que a IA já vinha tocando
    return conv.bot_step === AI_STEP;
  }
}
