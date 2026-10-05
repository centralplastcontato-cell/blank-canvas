// ============= AGENTE DE IA CONVERSACIONAL (BETA) =============
// Atende conversas de UMA unidade configurada (ex: VENDAS 3), somente para
// leads/conversas novos (criados após a ativação). Conversa natural, envia
// materiais, agenda visitas e transfere para humano quando necessário.
// Regras duras: nunca fala preços, nunca promete, nunca inventa.
//
// Módulo autocontido: não importa nada de index.ts (evita import circular).

// deno-lint-ignore-file no-explicit-any
import { findLeadByPhone } from "../_shared/lead-phone.ts";
import { DEFAULT_AI_MODEL, estimateChatCostUsd, providerForModel } from "../_shared/ai-models.ts";
import { type ChatTurn, createLlmSession, type LlmStep, type ToolDef } from "./ai-llm.ts";
import { describeImage, fetchMediaBytes, mediaHistoryText, transcribeAudio } from "./ai-media.ts";

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
  created_at?: string | null;
}

interface AiSettings {
  enabled: boolean;
  unit: string | null;
  activated_at: string | null;
  extra_instructions: string | null;
  visit_hours: string;
  model: string;
  // Modo de Teste da própria IA — separado do Modo de Teste do bot fixo
  // (wapi_bot_settings). Deixa testar só a IA, com um número específico,
  // sem desligar o bot fixo para os clientes de verdade.
  test_mode_enabled: boolean;
  test_mode_number: string | null;
  // Modelo só para o número de teste (vazio = o mesmo dos clientes). Deixa
  // comparar um modelo novo sem trocar o que os clientes estão usando.
  test_model?: string | null;
}

// Áudio ou foto que o cliente acabou de mandar (a mensagem já está salva)
export interface AgentMedia {
  type: 'audio' | 'image';
  messageId: string;
  url: Promise<string | null>;
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

const SETTINGS_COLUMNS = 'enabled, unit, activated_at, extra_instructions, visit_hours, model, test_mode_enabled, test_mode_number';

async function loadSettings(supabase: any, companyId: string): Promise<AiSettings | null> {
  const { data, error } = await supabase
    .from('ai_agent_settings')
    .select(`${SETTINGS_COLUMNS}, test_model`)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!error) return (data as AiSettings) || null;
  // Coluna test_model ainda não criada (migration pendente): segue sem ela
  const fallback = await supabase
    .from('ai_agent_settings')
    .select(SETTINGS_COLUMNS)
    .eq('company_id', companyId)
    .maybeSingle();
  return (fallback.data as AiSettings) || null;
}

interface UsageLog {
  companyId: string;
  conversationId: string;
  leadId: string | null;
  model: string;
  kind: 'chat' | 'transcription' | 'vision';
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  costUsd: number;
  isTest: boolean;
}

// Uma linha por chamada paga (resposta, transcrição ou foto). Falha ao gravar
// o consumo nunca atrapalha a conversa.
async function logUsage(supabase: any, u: UsageLog): Promise<void> {
  const { error } = await supabase.from('ai_agent_usage').insert({
    company_id: u.companyId,
    conversation_id: u.conversationId,
    lead_id: u.leadId,
    provider: providerForModel(u.model),
    model: u.model,
    kind: u.kind,
    input_tokens: u.inputTokens,
    cached_input_tokens: u.cachedInputTokens,
    cache_write_tokens: u.cacheWriteTokens,
    output_tokens: u.outputTokens,
    cost_usd: u.costUsd,
    is_test: u.isTest,
  });
  if (error) console.error('[AI Agent] Erro ao gravar consumo:', error.message);
}

async function notifyTeam(
  supabase: any,
  instance: AgentInstance,
  payload: { title: string; message: string; data: Json },
): Promise<void> {
  try {
    const unitLower = (instance.unit || '').toLowerCase().trim().replace(/\s+/g, '-');
    const { data, error } = await supabase.rpc('get_company_notification_targets', {
      p_company_id: instance.company_id,
      p_unit_permission: `leads.unit.${unitLower}`,
    });
    if (error) {
      console.error('[AI Agent] Erro ao buscar quem avisar:', error.message);
      return;
    }
    const ids = ((data || []) as Array<{ user_id: string }>).map((r) => r.user_id);
    if (ids.length === 0) return;
    const { error: insErr } = await supabase.from('notifications').insert(ids.map((uid) => ({
      user_id: uid,
      company_id: instance.company_id,
      type: 'lead_needs_human',
      title: payload.title,
      message: payload.message,
      data: payload.data,
      read: false,
    })));
    if (insErr) console.error('[AI Agent] Erro ao criar aviso:', insErr.message);
  } catch (err) {
    console.error('[AI Agent] Erro ao avisar a equipe:', err);
  }
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
  if (botData.ai_agent === 'off') {
    console.log(`[AI Agent] Conversa ${conv.id} já tinha sido marcada como não-elegível antes (decisão não é reavaliada a cada mensagem)`);
    return false;
  }

  const activatedAt = settings.activated_at ? new Date(settings.activated_at).getTime() : 0;
  const convCreatedAt = conv.created_at ? new Date(conv.created_at).getTime() : 0;

  let eligible = true;
  let reason = '';

  // Só conversas criadas depois da ativação da IA
  if (!activatedAt || !convCreatedAt || convCreatedAt < activatedAt) {
    eligible = false;
    reason = `conversa criada em ${conv.created_at ?? '?'}, IA ligada em ${settings.activated_at ?? '?'}`;
  }

  // Bot fixo já engajado no meio de uma qualificação: não rouba a conversa
  if (eligible && conv.bot_step && conv.bot_step !== 'lp_sent' && conv.bot_step !== AI_STEP) {
    eligible = false;
    reason = `conversa já estava no passo "${conv.bot_step}" do bot fixo`;
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
        reason = `lead ${lead.id} (status "${lead.status}", criado em ${lead.created_at}) é anterior à IA ou já foi trabalhado`;
        break;
      }
    }
  }

  console.log(`[AI Agent] Avaliação de elegibilidade da conversa ${conv.id}: ${eligible ? 'ELEGÍVEL' : `NÃO elegível — ${reason}`}`);

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
- Áudios do cliente chegam para você já transcritos e fotos chegam descritas: responda ao conteúdo normalmente, sem comentar que foi transcrito. Se aparecer que um áudio ou uma foto não pôde ser ouvido/visto, peça com gentileza para a pessoa escrever.

REGRAS INEGOCIÁVEIS:
1. NUNCA digite preços, valores ou descontos na conversa — nem estimativas — e nunca negocie condições. Se perguntarem valores, envie o PDF de pacotes (ferramenta enviar_materiais, tipo "pacotes" — os valores estão nele) e diga que a equipe cuida de condições e fechamento; aproveite para puxar o agendamento da visita.
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

const TOOLS: ToolDef[] = [
  {
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
  {
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
  {
    name: 'transferir_para_atendente',
    description: 'Transfere a conversa para a equipe humana. Use quando o cliente pedir, quando você não souber responder, ou em situações delicadas.',
    parameters: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Motivo curto da transferência, para a equipe saber o que aconteceu' },
      },
      required: ['motivo'],
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
  // Pessoa que já é lead da empresa (qualquer formato de telefone/unidade): reaproveita
  const existing = await findLeadByPhone<{ id: string }>(supabase, instance.company_id, clean, 'id');
  if (existing) {
    if (nomeCliente) {
      await supabase.from('campaign_leads').update({ name: nomeCliente }).eq('id', existing.id);
    }
    await supabase.from('wapi_conversations').update({ lead_id: existing.id }).eq('id', conv.id);
    conv.lead_id = existing.id;
    return existing.id;
  }
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

// PDF de pacotes enviado = orçamento enviado: o lead passa para "Orçamento
// enviado" e entra nos follow-ups automáticos do número (os mesmos do bot fixo).
// Só sai de "Novo" — não mexe em lead com visita marcada ou já trabalhado.
async function markQuoteSent(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
): Promise<void> {
  const leadId = await ensureLead(supabase, instance, conv, phone, contactName);
  if (!leadId) return;
  const { data: updated, error } = await supabase
    .from('campaign_leads')
    .update({ status: 'orcamento_enviado' })
    .eq('id', leadId)
    .eq('status', 'novo')
    .select('id');
  if (error) {
    console.error('[AI Agent] Erro ao marcar orçamento enviado:', error.message);
    return;
  }
  if (!updated || updated.length === 0) return;
  await supabase.from('lead_history').insert({
    lead_id: leadId,
    company_id: instance.company_id,
    user_id: null,
    user_name: 'IA (beta)',
    action: 'Alteração de status',
    old_value: 'novo',
    new_value: 'orcamento_enviado',
  }).then(({ error: hErr }: { error: unknown }) => { if (hErr) console.error('[AI Agent] lead_history error:', hErr); });
  console.log(`[AI Agent] Lead ${leadId} → Orçamento enviado (PDF de pacotes enviado pela IA)`);
}

async function toolEnviarMateriais(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
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
    if (!ok) return 'ERRO: falha ao enviar o PDF.';
    await markQuoteSent(supabase, instance, conv, phone, contactName);
    return 'OK: PDF de pacotes enviado (os valores estao no PDF).';
  }

  return 'ERRO: tipo de material desconhecido.';
}

// Passagem para a equipe: tira a IA da conversa, registra no histórico do
// lead com o motivo e avisa a equipe no sininho.
async function toolTransferir(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  motivo: string,
): Promise<string> {
  const reason = (motivo || '').trim() || 'sem motivo informado';
  await supabase.from('wapi_conversations').update({
    bot_enabled: false,
    bot_step: 'human_takeover',
    unread_count: 99,
  }).eq('id', conv.id);
  conv.bot_enabled = false;
  conv.bot_step = 'human_takeover';
  console.log(`[AI Agent] Transferred conv ${conv.id} to human. Motivo: ${reason}`);

  const leadId = await ensureLead(supabase, instance, conv, phone, contactName).catch(() => null);
  let leadName = contactName || phone;
  if (leadId) {
    const { data: lead } = await supabase.from('campaign_leads').select('name').eq('id', leadId).maybeSingle();
    if (lead?.name) leadName = lead.name as string;
    await supabase.from('lead_history').insert({
      lead_id: leadId,
      company_id: instance.company_id,
      user_id: null,
      user_name: 'IA (beta)',
      action: 'Transferido para a equipe',
      new_value: `Motivo: ${reason}`,
    }).then(({ error: hErr }: { error: unknown }) => { if (hErr) console.error('[AI Agent] lead_history error:', hErr); });
  }

  await notifyTeam(supabase, instance, {
    title: '🤝 IA passou a conversa para a equipe',
    message: `${leadName} (${instance.unit || 'WhatsApp'}) — motivo: ${reason}. Assuma o atendimento.`,
    data: { conversation_id: conv.id, lead_id: leadId, contact_phone: phone, unit: instance.unit, reason: 'ai_handoff', motivo: reason },
  });
  return 'OK: conversa transferida para a equipe. Avise o cliente que um atendente vai continuar em breve.';
}

const TEST_RESTART_COMMAND = '#reiniciar';

// Transcreve o áudio / descreve a foto que acabou de chegar e guarda o texto
// na própria mensagem, para a IA e para as próximas respostas.
async function processIncomingMedia(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  media: AgentMedia,
  openaiKey: string | null,
  isTest: boolean,
): Promise<void> {
  if (!openaiKey) {
    console.error('[AI Agent] OPENAI_API_KEY ausente — não dá para ouvir áudio / ver foto');
    return;
  }
  const url = await media.url.catch(() => null);
  if (!url) {
    console.warn(`[AI Agent] ${media.type} sem link para baixar (msg ${media.messageId})`);
    return;
  }
  const file = await fetchMediaBytes(url);
  if (!file) return;
  const result = media.type === 'audio'
    ? await transcribeAudio(openaiKey, file.bytes, file.mime)
    : await describeImage(openaiKey, file.bytes, file.mime);
  if (!result) return;
  console.log(`[AI Agent] ${media.type === 'audio' ? 'Áudio transcrito' : 'Foto descrita'} (conv ${conv.id}): "${result.text.slice(0, 80)}"`);

  const { data: row } = await supabase
    .from('wapi_messages')
    .select('id, metadata')
    .eq('conversation_id', conv.id)
    .eq('message_id', media.messageId)
    .maybeSingle();
  if (row?.id) {
    await supabase.from('wapi_messages').update({
      metadata: { ...((row.metadata as Json) || {}), ai_media_text: result.text, ai_media_model: result.model },
    }).eq('id', row.id);
  }
  await logUsage(supabase, {
    companyId: instance.company_id,
    conversationId: conv.id,
    leadId: conv.lead_id,
    model: result.model,
    kind: media.type === 'audio' ? 'transcription' : 'vision',
    inputTokens: result.inputTokens,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    isTest,
  });
}

// Ponto de entrada. Retorna true quando a IA cuidou da mensagem (o bot fixo não roda).
export async function maybeHandleWithAiAgent(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  content: string,
  phone: string,
  contactName: string | null,
  botSettings?: any, // Bot settings para test mode check
  media?: AgentMedia,
): Promise<boolean> {
  try {
    if (!instance.unit || !instance.company_id) {
      console.log(`[AI Agent] Sem unidade/empresa na instância — pulando (conv ${conv.id})`);
      return false;
    }

    // Test mode: se ativado, apenas deixa passar o número de teste configurado
    if (botSettings?.test_mode_enabled && botSettings?.test_mode_number) {
      const testPhoneVariants = getPhoneVariantsBR(botSettings.test_mode_number);
      const incomingPhoneVariants = getPhoneVariantsBR(phone);
      const isTestPhone = incomingPhoneVariants.some(v => testPhoneVariants.includes(v));
      if (!isTestPhone) {
        console.log(`[AI Agent] Test mode ON — phone ${phone} is NOT test number, skipping`);
        return false;
      }
    }

    const settings = await loadSettings(supabase, instance.company_id);
    if (!settings || !settings.enabled || !settings.unit) {
      console.log(`[AI Agent] IA desligada ou sem unidade configurada para a empresa ${instance.company_id} — pulando`);
      return false;
    }
    if ((settings.unit || '').trim().toLowerCase() !== (instance.unit || '').trim().toLowerCase()) {
      console.log(`[AI Agent] IA configurada para "${settings.unit}", mensagem chegou em "${instance.unit}" — pulando`);
      return false;
    }

    // Modo de Teste da IA: enquanto ligado, ela só conversa com este número.
    // Para qualquer outro, devolve false e a conversa segue com o bot fixo
    // normalmente — nada muda para os clientes de verdade.
    const aiTestVariants = getPhoneVariantsBR(settings.test_mode_number || '');
    const incomingVariants = getPhoneVariantsBR(phone);
    const isAiTestPhone = !!settings.test_mode_enabled && !!(settings.test_mode_number || '').replace(/\D/g, '')
      && incomingVariants.some(v => aiTestVariants.includes(v));
    if (settings.test_mode_enabled && !isAiTestPhone) {
      console.log(`[AI Agent] Modo de Teste da IA ligado — ${phone} não é o número de teste, seguindo com o bot fixo`);
      return false;
    }

    // Número de teste manda "#reiniciar": a IA começa uma conversa nova do
    // zero (esquece o histórico anterior e volta a atender mesmo depois de
    // ter passado para a equipe). Só vale para o número de teste.
    if (isAiTestPhone && !media && content.trim().toLowerCase() === TEST_RESTART_COMMAND) {
      const newBotData = { ...(conv.bot_data || {}), ai_agent: 'on', ai_history_since: new Date().toISOString() } as Json;
      await supabase.from('wapi_conversations').update({
        bot_step: AI_STEP,
        bot_enabled: true,
        bot_data: newBotData,
      }).eq('id', conv.id);
      conv.bot_step = AI_STEP;
      conv.bot_enabled = true;
      conv.bot_data = newBotData;
      const model = (settings.test_model || settings.model || DEFAULT_AI_MODEL);
      await sendViaWapiSend('send-text', instance, conv, { message: `🧪 Conversa reiniciada. Modelo em teste: ${model}. Pode mandar a primeira mensagem como se fosse um cliente.` });
      return true;
    }

    // Equipe assumiu (botão Inativo, mensagem humana ou transferência): IA fica fora
    if (conv.bot_step === 'human_takeover') {
      console.log(`[AI Agent] Conversa ${conv.id} em human_takeover — pulando`);
      return false;
    }
    if (conv.bot_step === AI_STEP && conv.bot_enabled === false) {
      console.log(`[AI Agent] Conversa ${conv.id} estava com a IA mas foi desligada (bot_enabled=false) — pulando`);
      return false;
    }

    // O número de teste é sempre atendido pela IA (a conversa dele costuma
    // ser antiga, de antes da ativação, e cairia na regra de "só leads novos").
    if (!isAiTestPhone && !(await isEligible(supabase, settings, conv, phone, instance.company_id))) {
      console.log(`[AI Agent] Conversa ${conv.id} não elegível (ver motivo acima) — seguindo com o bot fixo`);
      return false;
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY') || null;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || null;
    let model = (isAiTestPhone && settings.test_model) ? settings.test_model : (settings.model || DEFAULT_AI_MODEL);
    if (providerForModel(model) === 'anthropic' && !anthropicKey) {
      console.error(`[AI Agent] Modelo ${model} escolhido, mas ANTHROPIC_API_KEY não está configurada — usando ${DEFAULT_AI_MODEL}`);
      model = DEFAULT_AI_MODEL;
    }
    if (providerForModel(model) === 'openai' && !openaiKey) {
      console.error('[AI Agent] OPENAI_API_KEY not configured — falling back to fixed bot');
      return false;
    }

    // Adota a conversa
    if (conv.bot_step !== AI_STEP || conv.bot_enabled !== true) {
      await supabase.from('wapi_conversations').update({ bot_step: AI_STEP, bot_enabled: true }).eq('id', conv.id);
      conv.bot_step = AI_STEP;
      conv.bot_enabled = true;
      if (isAiTestPhone) {
        const newBotData = { ...(conv.bot_data || {}), ai_agent: 'on' } as Json;
        await supabase.from('wapi_conversations').update({ bot_data: newBotData }).eq('id', conv.id);
        conv.bot_data = newBotData;
      }
    }

    if (media) {
      await processIncomingMedia(supabase, instance, conv, media, openaiKey, isAiTestPhone);
    }

    // Histórico da conversa (no número de teste, só depois do último #reiniciar)
    let historyQuery = supabase
      .from('wapi_messages')
      .select('from_me, content, message_type, timestamp, metadata')
      .eq('conversation_id', conv.id);
    const historySince = isAiTestPhone ? (conv.bot_data as Json | null)?.ai_history_since : null;
    if (typeof historySince === 'string') historyQuery = historyQuery.gt('timestamp', historySince);
    const { data: history } = await historyQuery
      .order('timestamp', { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);

    const ordered = ((history || []) as Array<{ from_me: boolean; content: string | null; message_type: string; metadata: Json | null }>).reverse();
    const chatMessages: ChatTurn[] = ordered
      .filter((m) => (m.content || '').trim().length > 0 || m.message_type !== 'text')
      .map((m) => {
        if (m.message_type === 'text') return { role: m.from_me ? 'assistant' : 'user', content: m.content || '' } as ChatTurn;
        if (!m.from_me && (m.message_type === 'audio' || m.message_type === 'image')) {
          return { role: 'user', content: mediaHistoryText(m.message_type, m.content || '', m.metadata?.ai_media_text as string | undefined) } as ChatTurn;
        }
        return { role: m.from_me ? 'assistant' : 'user', content: `[${m.message_type}] ${m.content || ''}`.trim() } as ChatTurn;
      });
    // Garante que a última mensagem do cliente está presente
    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].role !== 'user') {
      chatMessages.push({ role: 'user', content: media ? mediaHistoryText(media.type, content, null) : content });
    }

    let companyName = instance.unit || '';
    const { data: companyRow } = await supabase.from('companies').select('name').eq('id', instance.company_id).maybeSingle();
    if (companyRow?.name) companyName = companyRow.name as string;

    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    });
    const systemPrompt = buildSystemPrompt(companyName, instance.unit, settings, today);

    const session = createLlmSession({
      model,
      system: systemPrompt,
      history: chatMessages,
      tools: TOOLS,
      openaiKey,
      anthropicKey,
    });
    if (!session) {
      console.error(`[AI Agent] Sem chave para o modelo ${model} — seguindo com o bot fixo`);
      return false;
    }
    console.log(`[AI Agent] Respondendo conv ${conv.id} com ${model}${isAiTestPhone ? ' (número de teste)' : ''}`);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let step: LlmStep;
      try {
        step = await session.step();
      } catch (llmErr) {
        // Provedor fora do ar / erro: não deixa o cliente sem resposta —
        // passa para a equipe (sem mandar nada ao cliente)
        console.error(`[AI Agent] Erro do provedor (${model}):`, llmErr);
        await toolTransferir(supabase, instance, conv, phone, contactName, 'falha técnica da IA — responda o cliente');
        return true;
      }

      await logUsage(supabase, {
        companyId: instance.company_id,
        conversationId: conv.id,
        leadId: conv.lead_id,
        model: step.servedModel || model,
        kind: 'chat',
        ...step.usage,
        costUsd: estimateChatCostUsd(step.servedModel || model, step.usage),
        isTest: isAiTestPhone,
      });

      if (step.refused) {
        console.warn(`[AI Agent] Modelo recusou responder (conv ${conv.id}) — passando para a equipe`);
        await toolTransferir(supabase, instance, conv, phone, contactName, 'a IA não soube responder esta mensagem');
        return true;
      }

      if (step.toolCalls.length > 0) {
        const results: Array<{ id: string; content: string }> = [];
        for (const call of step.toolCalls) {
          const args = call.args as any;
          let toolResult = 'ERRO: ferramenta desconhecida.';
          if (call.name === 'agendar_visita') {
            toolResult = await toolAgendarVisita(supabase, instance, conv, phone, contactName, args);
          } else if (call.name === 'enviar_materiais') {
            toolResult = await toolEnviarMateriais(supabase, instance, conv, phone, contactName, String(args.tipo || ''));
          } else if (call.name === 'transferir_para_atendente') {
            toolResult = await toolTransferir(supabase, instance, conv, phone, contactName, String(args.motivo || ''));
          }
          results.push({ id: call.id, content: toolResult });
        }
        session.addToolResults(results);
        continue; // nova rodada para a IA redigir a resposta final
      }

      if (step.text) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await sendViaWapiSend('send-text', instance, conv, { message: step.text });
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
