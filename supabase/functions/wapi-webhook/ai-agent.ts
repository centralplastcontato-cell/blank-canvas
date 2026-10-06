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
import {
  describeTeamHours,
  formatSlot,
  isOpenAt,
  isSlotInHours,
  listAvailableSlots,
  nearestSlots,
  nextOpeningText,
  normalizeTime,
  type ParsedHours,
  parseVisitHours,
  pickTwoOffers,
  type Slot,
  slotKey,
  teamHoursText,
} from "../_shared/business-hours.ts";
import { AI_DEBOUNCE_MS, mergeConsecutiveTurns, pickLatestIncoming, repliesSinceVisitInvite, smallestPackageGuests, teamRepliedAfter } from "../_shared/ai-turn.ts";
import { firstNameOrEmpty, sendQualificationMaterials } from "./qualification-materials.ts";

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
  // Marcado quando a IA passou a conversa para a equipe no turno atual
  __handoffThisTurn?: boolean;
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
  // Horário de atendimento da equipe (mesmo formato de visit_hours, sem o
  // intervalo). Vazio = usa o horário de visitas.
  team_hours?: string | null;
  // Alerta forte quando a equipe não responde depois da passagem
  handoff_alert_minutes?: number | null;
  handoff_alert_phone?: string | null;
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

// Envia pelo wapi-send e marca a mensagem como da IA (metadata.source =
// "ai_agent"): é assim que dá para separar resposta da IA de resposta de uma
// pessoa da equipe depois da passagem.
async function sendViaWapiSend(
  supabase: any,
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
    const messageId = typeof parsed?.messageId === 'string' ? parsed.messageId : null;
    if (messageId && supabase) {
      const { error } = await supabase.from('wapi_messages')
        .update({ metadata: { source: 'ai_agent' } })
        .eq('conversation_id', conv.id)
        .eq('message_id', messageId);
      if (error) console.error('[AI Agent] Erro ao marcar mensagem da IA:', error.message);
    }
    return true;
  } catch (err) {
    console.error(`[AI Agent] ${action} threw:`, err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// select('*'): colunas novas entram sem quebrar quando a migration ainda não rodou
async function loadSettings(supabase: any, companyId: string): Promise<AiSettings | null> {
  const { data } = await supabase
    .from('ai_agent_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();
  return (data as AiSettings) || null;
}

// Número de teste da IA (Modo de Teste ligado e o telefone bate)
function isAiTestNumber(settings: AiSettings, phone: string): boolean {
  if (!settings.test_mode_enabled || !(settings.test_mode_number || '').replace(/\D/g, '')) return false;
  const testVariants = getPhoneVariantsBR(settings.test_mode_number || '');
  return getPhoneVariantsBR(phone).some(v => testVariants.includes(v));
}

// Para o webhook: a mensagem veio do número de teste da IA desta unidade? Ele
// é o celular do dono testando — não passa pela trava anti-loop (mandar
// "#reiniciar" ou perguntas repetidas é normal no teste).
export async function isAiTestPhoneFor(supabase: any, instance: AgentInstance, phone: string): Promise<boolean> {
  if (!instance.company_id || !instance.unit) return false;
  const settings = await loadSettings(supabase, instance.company_id);
  if (!settings?.enabled) return false;
  if ((settings.unit || '').trim().toLowerCase() !== instance.unit.trim().toLowerCase()) return false;
  return isAiTestNumber(settings, phone);
}

const teamHoursOf = (settings: AiSettings): ParsedHours =>
  parseVisitHours(teamHoursText(settings.team_hours));

// Visitas já marcadas na unidade (um horário = uma visita)
async function loadBookedSlots(supabase: any, instance: AgentInstance): Promise<Set<string>> {
  const today = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from('lead_visits')
    .select('data_visita, horario_visita, status_visita, unit')
    .eq('company_id', instance.company_id)
    .gte('data_visita', today)
    .in('status_visita', ['agendada', 'confirmada', 'remarcada'])
    .limit(1000);
  const booked = new Set<string>();
  for (const v of (data || []) as Array<{ data_visita: string; horario_visita: string | null; unit: string | null }>) {
    if (v.unit && instance.unit && v.unit.trim().toLowerCase() !== instance.unit.trim().toLowerCase()) continue;
    const t = normalizeTime(v.horario_visita || '');
    if (t) booked.add(slotKey({ date: String(v.data_visita).slice(0, 10), time: t }));
  }
  return booked;
}

// Texto com o horário da equipe para o cliente, dizendo quando volta se estiver fechado
function teamHoursMessage(settings: AiSettings, nowMs = Date.now()): string {
  const hours = teamHoursOf(settings);
  const text = describeTeamHours(hours);
  if (isOpenAt(hours, nowMs)) return `Nossa equipe atende ${text}.`;
  return `Nossa equipe atende ${text} — volta ${nextOpeningText(hours, nowMs)}.`;
}

type MaterialTipo = 'fotos' | 'video' | 'pacotes';
const MATERIAL_LABEL: Record<MaterialTipo, string> = { fotos: 'fotos do espaço', video: 'vídeo de apresentação', pacotes: 'PDF de pacotes' };

// Material conta como "já enviado" só por 30 dias: lead que volta depois disso
// recebe o material (atualizado) de novo.
const MATERIAL_RESEND_DAYS = 30;
const materialWindowStart = () => new Date(Date.now() - MATERIAL_RESEND_DAYS * 86400000).toISOString();
const isWithinMaterialWindow = (iso: unknown) =>
  typeof iso === 'string' && Date.parse(iso) >= Date.now() - MATERIAL_RESEND_DAYS * 86400000;

function sentMaterials(conv: AgentConv): Partial<Record<MaterialTipo, string>> {
  const raw = (conv.bot_data as Json | null)?.ai_materials_sent;
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<MaterialTipo, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isWithinMaterialWindow(v)) out[k as MaterialTipo] = v as string;
  }
  return out;
}

const fmtTimeBR = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

async function mergeBotData(supabase: any, conv: AgentConv, patch: Json): Promise<void> {
  const { data: fresh } = await supabase.from('wapi_conversations').select('bot_data').eq('id', conv.id).maybeSingle();
  const merged = { ...((fresh?.bot_data as Json) || conv.bot_data || {}), ...patch } as Json;
  await supabase.from('wapi_conversations').update({ bot_data: merged }).eq('id', conv.id);
  conv.bot_data = merged;
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
    let ids: string[] = [];
    const { data, error } = await supabase.rpc('get_company_notification_targets', {
      p_company_id: instance.company_id,
      p_unit_permission: `leads.unit.${unitLower}`,
    });
    if (error) console.error('[AI Agent] Erro ao buscar quem avisar:', error.message);
    else ids = ((data || []) as Array<{ user_id: string }>).map((r) => r.user_id);
    if (ids.length === 0) {
      // Ninguém com permissão específica: avisa todos da empresa (nunca em silêncio)
      const { data: companyUsers } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', instance.company_id);
      ids = ((companyUsers || []) as Array<{ user_id: string }>).map((u) => u.user_id);
    }
    if (ids.length === 0) {
      console.error(`[AI Agent] Nenhum usuário para avisar na empresa ${instance.company_id}`);
      return;
    }
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
    else console.log(`[AI Agent] Aviso no sininho criado para ${ids.length} usuário(s)`);
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

interface PromptContext {
  offers: Slot[];
  sentMaterialsText: string;
  teamHoursText: string;
  knownDataText: string;
  isFirstReply: boolean;
  pendingUserMessages: number;
  afterHoursHandoff: { reason: string; returns: string } | null;
  // Respostas da IA desde o último convite para visita (null = ainda não convidou)
  visitRepliesAgo: number | null;
  minPackageGuests: number | null;
}

// Convidar para a visita no máximo a cada 3–4 respostas, ou quando fizer sentido
function visitInviteRule(repliesAgo: number | null): string {
  if (repliesAgo !== null && repliesAgo < 3) {
    const when = repliesAgo === 0 ? 'na sua última resposta' : `há ${repliesAgo} resposta(s)`;
    return `Você já convidou para a visita ${when}. NESTA resposta NÃO convide de novo e não termine com "posso agendar uma visita" — só responda o que o cliente perguntou. Exceção: o cliente falou de visita, de fechar, de valores ou disse que vai pensar.`;
  }
  return 'Pode convidar para a visita nesta resposta SE fizer sentido (o cliente mostrou interesse, perguntou de valores/fechamento, acabou de receber os materiais ou disse que vai pensar). Não termine toda mensagem com convite.';
}

function buildSystemPrompt(companyName: string, unit: string, settings: AiSettings, today: string, ctx: PromptContext): string {
  const offersText = ctx.offers.length > 0
    ? ctx.offers.map(formatSlot).join(' ou ')
    : 'nenhum horário livre nos próximos dias — nesse caso transfira para a equipe';
  return `Você é a assistente virtual de vendas do ${companyName} (buffet infantil), atendendo pelo WhatsApp da unidade ${unit}. Hoje é ${today}.

SEU OBJETIVO PRINCIPAL: conduzir a conversa de forma simpática e natural até AGENDAR UMA VISITA ao buffet. A visita é o passo que mais fecha festas.

COMO CONVERSAR:
- Português brasileiro, tom caloroso e humano, mensagens CURTAS (2 a 4 frases). No máximo 1 emoji por mensagem.
- ${ctx.isFirstReply ? 'ESTA É A SUA PRIMEIRA RESPOSTA: apresente-se (diga seu nome, se ele estiver nas informações do buffet, e que é do ' + companyName + ') e, se ainda não souber o nome do cliente, já pergunte o nome dele NESTA mensagem, junto com a resposta ao que ele perguntou.' : 'Se ainda não souber o nome do cliente, não interrompa a conversa para pedir — aproveite um momento natural.'}
- Dados do cliente já registrados: ${ctx.knownDataText}. Não pergunte de novo o que já sabe.
- ${ctx.pendingUserMessages > 1 ? `O cliente mandou ${ctx.pendingUserMessages} mensagens seguidas desde a sua última resposta: responda a TODAS as perguntas delas numa única mensagem, sem ignorar nenhuma.` : 'Se o cliente mandar várias perguntas, responda todas numa única mensagem.'}
- Uma pergunta por vez. Nunca envie listas de opções numeradas — converse como gente.
- Descubra naturalmente: nome da pessoa, mês/data desejada da festa e número de convidados, se ainda não souber.
- Quebre objeções com empatia ("vou pensar" → ofereça a visita sem compromisso; "tá caro" → valorize o que está incluso e chame para conhecer o espaço).
- Áudios do cliente chegam para você já transcritos e fotos chegam descritas: responda ao conteúdo normalmente, sem comentar que foi transcrito. Se aparecer que um áudio ou uma foto não pôde ser ouvido/visto, peça com gentileza para a pessoa escrever.

REGRAS INEGOCIÁVEIS:
1. NUNCA digite preços, valores ou descontos na conversa — nem estimativas — e nunca negocie condições. Se perguntarem valores, envie o PDF de pacotes (ferramenta enviar_materiais, tipo "pacotes" — os valores estão nele) e diga que a equipe cuida de condições e fechamento.
2. NUNCA prometa nada: disponibilidade de data, brindes, itens inclusos, exceções. Quem confirma detalhes é a equipe.
3. NUNCA invente informações. Se não souber responder, use a ferramenta transferir_para_atendente.
4. Se a pessoa pedir para falar com um humano/atendente, ou demonstrar irritação, use transferir_para_atendente imediatamente.
5. Não diga que você é uma IA a menos que perguntem diretamente; se perguntarem, admita com naturalidade.

DADOS DA FESTA: sempre que o cliente informar nome, mês da festa ou número de convidados, chame registrar_dados_festa. Assim que mês e convidados estiverem registrados, o sistema envia sozinho fotos, vídeo e PDF de pacotes — não chame enviar_materiais para eles depois disso; só comente brevemente e convide para a visita.

MATERIAIS (ferramenta enviar_materiais):
- Cada material vai NO MÁXIMO UMA VEZ por conversa. O PDF de pacotes só quando o cliente perguntar de valores/preços/pacotes — nunca em resposta a outras perguntas.
- Só reenvie (reenviar=true) se o cliente pedir EXPLICITAMENTE para mandar de novo.
- Já enviados nesta conversa: ${ctx.sentMaterialsText}.

${ctx.minPackageGuests ? `PACOTES: o menor pacote é para ${ctx.minPackageGuests} convidados. Se o cliente falar em menos de ${ctx.minPackageGuests} convidados ou pedir orçamento para menos, explique JÁ NA MESMA RESPOSTA (não espere ele perguntar), com naturalidade e sem falar valores, que o menor pacote é para ${ctx.minPackageGuests} pessoas e que a equipe explica como fica para um grupo menor.\n\n` : ''}CONVITE PARA VISITA (não seja repetitiva):
- ${visitInviteRule(ctx.visitRepliesAgo)}

AGENDAMENTO DE VISITAS:
- Janelas de visita: ${settings.visit_hours}.
- Ao oferecer visita, ofereça JÁ NA MESMA MENSAGEM 2 horários concretos, por exemplo: ${offersText}. Nunca diga que vai passar horários sem passá-los.
- Se o cliente pedir um dia/horário fora das janelas ou já ocupado, NÃO transfira: diga com gentileza que nesse horário não dá e ofereça os horários livres mais próximos (a ferramenta agendar_visita devolve quais são).
- Quando a pessoa confirmar dia e horário, use agendar_visita. Depois confirme por mensagem o dia/horário e diga que a equipe confirma a visita.

PASSAGEM PARA A EQUIPE: ao usar transferir_para_atendente, avise o cliente que um atendente vai continuar por aqui, sem escrever horários — o sistema acrescenta o horário de atendimento da equipe (${ctx.teamHoursText}). As janelas de visita NÃO são o horário de atendimento da equipe: nunca use uma no lugar da outra.
${ctx.afterHoursHandoff ? `\nATENÇÃO — ESTA CONVERSA JÁ FOI PASSADA PARA A EQUIPE (motivo: ${ctx.afterHoursHandoff.reason || 'não informado'}). A equipe está fora do horário agora e volta ${ctx.afterHoursHandoff.returns}. Enquanto isso, continue tirando dúvidas informativas com base nas informações do buffet (estrutura, o que tem, como funciona, materiais, horários de visita). Para o assunto que motivou a passagem e para negociação/fechamento, diga com gentileza que a equipe continua ${ctx.afterHoursHandoff.returns}. NÃO chame transferir_para_atendente de novo.` : ''}
${settings.extra_instructions ? `\nINFORMAÇÕES DO BUFFET (use somente isto como fonte):\n${settings.extra_instructions}` : ''}`;
}

const TOOLS: ToolDef[] = [
  {
    name: 'registrar_dados_festa',
    description: 'Registra no sistema o nome, o mês da festa e o número de convidados assim que o cliente informar (pode chamar com só um deles). Quando mês e convidados estiverem registrados, o sistema envia AUTOMATICAMENTE fotos, vídeo e PDF de pacotes ao cliente.',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome da pessoa' },
        mes: { type: 'string', description: 'Mês da festa, ex.: Novembro' },
        convidados: { type: 'string', description: 'Número de convidados, ex.: 80' },
      },
    },
  },
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
        reenviar: { type: 'boolean', description: 'true SOMENTE se o cliente pediu explicitamente para mandar de novo um material já enviado' },
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
  settings: AiSettings,
  args: { data?: string; horario?: string; nome_cliente?: string },
): Promise<string> {
  const dataVisita = (args.data || '').trim();
  const horario = normalizeTime(args.horario || '') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataVisita) || !horario) {
    return 'ERRO: data ou horário em formato inválido. Peça a confirmação do dia e horário novamente.';
  }

  // Fora das janelas, já passou ou já ocupado: NÃO transfere — devolve os
  // horários livres mais próximos para a IA oferecer.
  const visitHours = parseVisitHours(settings.visit_hours);
  const booked = await loadBookedSlots(supabase, instance);
  const available = listAvailableSlots(visitHours, Date.now(), booked, { days: 21, minLeadMinutes: 60, max: 1000 });
  const requested: Slot = { date: dataVisita, time: horario };
  const isAvailable = available.some((sl) => slotKey(sl) === slotKey(requested));
  if (!isAvailable) {
    const why = !isSlotInHours(visitHours, dataVisita, horario)
      ? 'está fora das janelas de visita'
      : booked.has(slotKey(requested)) ? 'já está ocupado' : 'já passou ou está muito em cima da hora';
    const options = nearestSlots(available, dataVisita, horario).map(formatSlot);
    console.log(`[AI Agent] Visita pedida ${dataVisita} ${horario} indisponível (${why}) — oferecendo: ${options.join(' / ')}`);
    return options.length > 0
      ? `INDISPONÍVEL: ${dataVisita.split('-').reverse().join('/')} às ${horario} ${why}. NÃO transfira. Diga com gentileza que nesse horário não dá e ofereça estes horários livres mais próximos: ${options.join(' ou ')}.`
      : 'INDISPONÍVEL: não há horários livres nas próximas semanas. Use transferir_para_atendente.';
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

async function loadSalesMaterials(supabase: any, instance: AgentInstance): Promise<any[]> {
  const { data } = await supabase
    .from('sales_materials')
    .select('*')
    .eq('unit', instance.unit)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (data && data.length > 0) return data;
  const fallback = await supabase
    .from('sales_materials')
    .select('*')
    .eq('company_id', instance.company_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return fallback.data || [];
}

// Materiais que JÁ estão na conversa nos últimos 30 dias (qualquer envio, da
// IA, do bot fixo ou da equipe), pelo link do arquivo — vale mesmo depois de #reiniciar.
async function materialsAlreadyInChat(
  supabase: any,
  conv: AgentConv,
  materials: any[],
): Promise<Partial<Record<MaterialTipo, boolean>>> {
  const urlType = new Map<string, MaterialTipo>();
  for (const m of materials) {
    if (m.type === 'photo_collection' && Array.isArray(m.photo_urls) && m.photo_urls[0]) urlType.set(m.photo_urls[0], 'fotos');
    if (m.type === 'video' && m.file_url) urlType.set(m.file_url, 'video');
    if (m.type === 'pdf_package' && m.file_url) urlType.set(m.file_url, 'pacotes');
  }
  if (urlType.size === 0) return {};
  const { data } = await supabase
    .from('wapi_messages')
    .select('media_url')
    .eq('conversation_id', conv.id)
    .eq('from_me', true)
    .in('media_url', Array.from(urlType.keys()))
    .gte('timestamp', materialWindowStart())
    .limit(50);
  const found: Partial<Record<MaterialTipo, boolean>> = {};
  for (const r of (data || []) as Array<{ media_url: string }>) {
    const t = urlType.get(r.media_url);
    if (t) found[t] = true;
  }
  return found;
}

async function toolEnviarMateriais(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  tipo: string,
  reenviar = false,
): Promise<string> {
  // Cada material vai uma vez por conversa (a menos que o cliente peça de novo)
  if (tipo === 'fotos' || tipo === 'video' || tipo === 'pacotes') {
    const sentAt = sentMaterials(conv)[tipo];
    if (sentAt && !reenviar) {
      console.log(`[AI Agent] ${tipo} já enviado em ${sentAt} (conv ${conv.id}) — não reenviando`);
      return `JÁ ENVIADO: o ${MATERIAL_LABEL[tipo]} já foi enviado nesta conversa (${fmtTimeBR(sentAt)}). Não reenvie; responda a pergunta do cliente normalmente. Só use reenviar=true se o cliente pedir explicitamente para mandar de novo.`;
    }
  }
  const materials = await loadSalesMaterials(supabase, instance);
  if (materials.length === 0) {
    return 'ERRO: nenhum material cadastrado. Diga que a equipe vai enviar os materiais em seguida.';
  }
  if (!reenviar && (tipo === 'fotos' || tipo === 'video' || tipo === 'pacotes')) {
    const inChat = await materialsAlreadyInChat(supabase, conv, materials);
    if (inChat[tipo]) {
      console.log(`[AI Agent] ${tipo} já está na conversa (envio anterior) — não reenviando`);
      return `JÁ ENVIADO: o ${MATERIAL_LABEL[tipo]} já foi enviado nesta conversa nos últimos ${MATERIAL_RESEND_DAYS} dias. Não reenvie; responda a pergunta do cliente normalmente. Só use reenviar=true se o cliente pedir explicitamente para mandar de novo.`;
    }
  }

  if (tipo === 'fotos') {
    const collection = (materials as any[]).find((m) => m.type === 'photo_collection');
    const photos: string[] = collection?.photo_urls || [];
    if (photos.length === 0) return 'ERRO: sem fotos cadastradas.';
    for (let i = 0; i < Math.min(photos.length, 6); i++) {
      await sendViaWapiSend(supabase, 'send-image', instance, conv, { mediaUrl: photos[i], caption: '' });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    await mergeBotData(supabase, conv, { ai_materials_sent: { ...sentMaterials(conv), fotos: new Date().toISOString() } });
    return `OK: ${Math.min(photos.length, 6)} fotos enviadas.`;
  }

  if (tipo === 'video') {
    const video = (materials as any[]).find((m) => m.type === 'video');
    if (!video?.file_url) return 'ERRO: sem vídeo cadastrado.';
    const ok = await sendViaWapiSend(supabase, 'send-video', instance, conv, { mediaUrl: video.file_url, caption: '' });
    if (!ok) return 'ERRO: falha ao enviar o vídeo.';
    await mergeBotData(supabase, conv, { ai_materials_sent: { ...sentMaterials(conv), video: new Date().toISOString() } });
    return 'OK: vídeo enviado.';
  }

  if (tipo === 'pacotes') {
    const pdf = (materials as any[]).find((m) => m.type === 'pdf_package');
    if (!pdf?.file_url) return 'ERRO: sem PDF de pacotes cadastrado.';
    const ok = await sendViaWapiSend(supabase, 'send-document', instance, conv, {
      mediaUrl: pdf.file_url,
      fileName: pdf.name ? `${pdf.name}.pdf` : 'Pacotes.pdf',
    });
    if (!ok) return 'ERRO: falha ao enviar o PDF.';
    await mergeBotData(supabase, conv, { ai_materials_sent: { ...sentMaterials(conv), pacotes: new Date().toISOString() } });
    await markQuoteSent(supabase, instance, conv, phone, contactName);
    return 'OK: PDF de pacotes enviado (os valores estao no PDF).';
  }

  return 'ERRO: tipo de material desconhecido.';
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "nov" / "novembro" / "11" → "Novembro" (como o bot fixo grava)
function normalizeMonth(raw: string): string {
  const t = raw.trim().toLowerCase();
  const n = parseInt(t, 10);
  if (!isNaN(n) && n >= 1 && n <= 12 && /^\d{1,2}$/.test(t)) return MONTHS[n - 1].replace(/^./, (c) => c.toUpperCase());
  const found = MONTHS.find((m) => t.startsWith(m.slice(0, 3)) || t.includes(m));
  return found ? found.replace(/^./, (c) => c.toUpperCase()) : raw.trim();
}

// "80" → "80 pessoas" (como o bot fixo grava)
function normalizeGuests(raw: string): string {
  const t = raw.trim();
  return /^\d+$/.test(t) ? `${t} pessoas` : t;
}

// Registra nome/mês/convidados e, quando tem mês + convidados, envia uma vez
// só fotos + vídeo + PDF pela MESMA rotina do bot fixo (qualification-materials.ts),
// respeitando as opções de envio automático do número e pulando o que a IA já mandou.
async function toolRegistrarDados(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  botSettings: any,
  args: { nome?: string; mes?: string; convidados?: string },
): Promise<string> {
  const patch: Json = {};
  const nome = String(args.nome || '').trim();
  if (nome && firstNameOrEmpty(nome)) patch.nome = nome;
  if (args.mes && String(args.mes).trim()) patch.mes = normalizeMonth(String(args.mes));
  if (args.convidados && String(args.convidados).trim()) patch.convidados = normalizeGuests(String(args.convidados));
  if (Object.keys(patch).length > 0) await mergeBotData(supabase, conv, patch);

  const bd = (conv.bot_data || {}) as Json;
  const leadId = await ensureLead(supabase, instance, conv, phone, contactName, patch.nome as string | undefined);
  if (leadId && (patch.mes || patch.convidados)) {
    const leadPatch: Json = {};
    if (patch.mes) leadPatch.month = patch.mes;
    if (patch.convidados) leadPatch.guests = patch.convidados;
    const { error } = await supabase.from('campaign_leads').update(leadPatch).eq('id', leadId);
    if (error) console.error('[AI Agent] Erro ao salvar mês/convidados no lead:', error.message);
  }

  // Pediu para menos convidados que o menor pacote: a IA explica já nesta resposta
  const materials = await loadSalesMaterials(supabase, instance);
  const minGuests = smallestPackageGuests(materials);
  const askedGuests = parseInt(String(bd.convidados || '').replace(/\D/g, ''), 10);
  const minNote = patch.convidados && minGuests && askedGuests && askedGuests < minGuests
    ? ` IMPORTANTE — explique JÁ NESTA resposta, com naturalidade e sem falar valores: o cliente falou em ${askedGuests} convidados, mas o menor pacote é para ${minGuests} pessoas; a equipe explica como fica para um grupo menor.`
    : '';

  const missing = [!bd.mes && 'mês da festa', !bd.convidados && 'número de convidados'].filter(Boolean);
  if (missing.length > 0) return `OK: dados salvos. Ainda falta descobrir: ${missing.join(' e ')}.${minNote}`;
  if (isWithinMaterialWindow(bd.ai_auto_materials_at)) {
    return `OK: dados salvos. Os materiais automáticos já foram enviados antes nesta conversa — não reenvie.${minNote}`;
  }

  // Marca antes de enviar: outra execução concorrente não manda de novo, e as
  // respostas a mensagens que chegarem durante o envio esperam ele terminar
  await mergeBotData(supabase, conv, {
    ai_auto_materials_at: new Date().toISOString(),
    ai_materials_busy_until: new Date(Date.now() + 4 * 60000).toISOString(),
  });
  const inChat = await materialsAlreadyInChat(supabase, conv, materials);
  const flags = sentMaterials(conv);
  const already: Partial<Record<MaterialTipo, string | boolean>> = {
    fotos: flags.fotos || inChat.fotos,
    video: flags.video || inChat.video,
    pacotes: flags.pacotes || inChat.pacotes,
  };
  const settingsForSend = {
    ...(botSettings || {}),
    auto_send_photos: already.fotos ? false : botSettings?.auto_send_photos,
    auto_send_presentation_video: already.video ? false : botSettings?.auto_send_presentation_video,
    auto_send_promo_video: already.video ? false : botSettings?.auto_send_promo_video,
    auto_send_pdf: already.pacotes ? false : botSettings?.auto_send_pdf,
  };
  console.log(`[AI Agent] Mês e convidados conhecidos (${bd.mes}, ${bd.convidados}) — enviando materiais automáticos (conv ${conv.id})`);
  const result = await sendQualificationMaterials(
    supabase,
    instance,
    conv,
    { nome: String(bd.nome || ''), mes: String(bd.mes), convidados: String(bd.convidados) },
    settingsForSend,
    async (action, payload) => (await sendViaWapiSend(supabase, action, instance, conv, payload)) ? 'ok' : null,
  ).finally(() => mergeBotData(supabase, conv, { ai_materials_busy_until: null }));
  if (!result.sentAny) {
    console.warn(`[AI Agent] Materiais automáticos não enviados (falhas: ${result.failedSteps.join(', ') || 'nenhum material/desligado'})`);
    return `OK: dados salvos. Os materiais automáticos não puderam ser enviados agora; siga a conversa (se o cliente pedir valores, use enviar_materiais).${minNote}`;
  }

  const nowIso = new Date().toISOString();
  const sentNow: Partial<Record<MaterialTipo, string>> = { ...flags };
  if (settingsForSend.auto_send_photos !== false && !already.fotos) sentNow.fotos = nowIso;
  if (settingsForSend.auto_send_presentation_video !== false && !already.video) sentNow.video = nowIso;
  if (settingsForSend.auto_send_pdf !== false && !already.pacotes) sentNow.pacotes = nowIso;
  await mergeBotData(supabase, conv, { ai_materials_sent: sentNow });
  if (sentNow.pacotes && !already.pacotes) await markQuoteSent(supabase, instance, conv, phone, contactName);
  const pdfNote = !minNote && result.pdfGuestCount && askedGuests && askedGuests < result.pdfGuestCount
    ? ` IMPORTANTE — explique JÁ NESTA resposta, sem falar valores: o cliente falou em ${askedGuests} convidados e o PDF enviado é o pacote de ${result.pdfGuestCount} pessoas (o menor).`
    : '';
  const skipped = (['fotos', 'video', 'pacotes'] as MaterialTipo[]).filter((k) => already[k]).map((k) => MATERIAL_LABEL[k]);
  const skippedNote = skipped.length > 0 ? ` (${skipped.join(', ')} já tinha(m) sido enviado(s) antes e não foi reenviado.)` : '';
  return `OK: dados salvos e o sistema JÁ ENVIOU agora, automaticamente, os materiais.${skippedNote} Não reenvie nada: comente brevemente e convide para a visita oferecendo 2 horários concretos.${minNote}${pdfNote}`;
}

// Passagem para a equipe: tira a IA da conversa, registra no histórico do
// lead com o motivo e avisa a equipe no sininho.
async function toolTransferir(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  settings: AiSettings | null,
  motivo: string,
): Promise<string> {
  const reason = (motivo || '').trim() || 'sem motivo informado';
  // Já passada para a equipe (IA atendendo fora do horário): não repete aviso
  if (conv.bot_step === 'human_takeover' && (conv.bot_data as Json | null)?.ai_handoff) {
    const hoursText = settings ? ` ${teamHoursMessage(settings)}` : '';
    return `JÁ TRANSFERIDA: a conversa já está com a equipe.${hoursText} Diga isso ao cliente e continue ajudando com dúvidas informativas.`;
  }
  conv.__handoffThisTurn = true;
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

  // Marca da passagem: o follow-up-check usa para disparar o alerta forte se
  // ninguém da equipe responder em X minutos dentro do horário de atendimento.
  // "at" é renovado depois da última mensagem da IA neste turno.
  await mergeBotData(supabase, conv, {
    ai_handoff: { at: new Date().toISOString(), reason, lead_name: leadName, lead_id: leadId, alerted_at: null },
  });

  await notifyTeam(supabase, instance, {
    title: '🤝 IA passou a conversa para a equipe',
    message: `${leadName} (${instance.unit || 'WhatsApp'}) — motivo: ${reason}. Assuma o atendimento.`,
    data: { conversation_id: conv.id, lead_id: leadId, contact_phone: phone, unit: instance.unit, reason: 'ai_handoff', motivo: reason },
  });
  return 'OK: conversa transferida para a equipe. Avise o cliente que um atendente vai continuar por aqui. NÃO escreva horário nenhum: o sistema acrescenta sozinho, no fim da sua mensagem, o horário de atendimento da equipe.';
}

// Depois da última mensagem da IA num turno com passagem: renova a marca para
// que só respostas da equipe DEPOIS dela contem.
async function touchHandoffMark(supabase: any, conv: AgentConv): Promise<void> {
  const handoff = (conv.bot_data as Json | null)?.ai_handoff as Json | undefined;
  if (!handoff || conv.bot_step !== 'human_takeover' || !conv.__handoffThisTurn) return;
  await mergeBotData(supabase, conv, { ai_handoff: { ...handoff, at: new Date().toISOString() } });
}

// Alguém da equipe escreveu na conversa depois da passagem? (mensagens da IA,
// follow-up e avisos do sistema não contam)
async function teamRepliedSince(supabase: any, convId: string, sinceIso: string): Promise<boolean> {
  const { data } = await supabase
    .from('wapi_messages')
    .select('from_me, timestamp, metadata')
    .eq('conversation_id', convId)
    .eq('from_me', true)
    .gt('timestamp', sinceIso)
    .limit(30);
  return teamRepliedAfter((data || []) as Array<{ from_me: boolean; timestamp: string; metadata: Record<string, unknown> | null }>, sinceIso);
}

async function latestIncomingId(supabase: any, convId: string): Promise<string | null> {
  const { data } = await supabase
    .from('wapi_messages')
    .select('message_id, timestamp')
    .eq('conversation_id', convId)
    .eq('from_me', false)
    .order('timestamp', { ascending: false })
    .limit(5);
  return pickLatestIncoming((data || []) as Array<{ message_id: string | null; timestamp: string }>);
}

// Fotos/vídeo/PDF automáticos sendo enviados: espera terminar antes de
// responder, para a resposta não cair no meio dos materiais.
async function waitMaterialsIdle(supabase: any, convId: string, maxMs = 120000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const { data } = await supabase.from('wapi_conversations').select('bot_data').eq('id', convId).maybeSingle();
    const busyUntil = (data?.bot_data as Json | null)?.ai_materials_busy_until;
    if (typeof busyUntil !== 'string' || Date.parse(busyUntil) <= Date.now()) return;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
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
  // Id (do provedor) da mensagem de texto que disparou esta execução — usado
  // para juntar mensagens seguidas numa resposta só
  incomingMessageId?: string | null,
): Promise<boolean> {
  let settings: AiSettings | null = null;
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

    settings = await loadSettings(supabase, instance.company_id);
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
    const isAiTestPhone = isAiTestNumber(settings, phone);
    if (settings.test_mode_enabled && !isAiTestPhone) {
      console.log(`[AI Agent] Modo de Teste da IA ligado — ${phone} não é o número de teste, seguindo com o bot fixo`);
      return false;
    }

    // Número de teste manda "#reiniciar": a IA começa uma conversa nova do
    // zero (esquece o histórico anterior e volta a atender mesmo depois de
    // ter passado para a equipe). Só vale para o número de teste.
    if (isAiTestPhone && !media && content.trim().toLowerCase() === TEST_RESTART_COMMAND) {
      const newBotData = {
        ...(conv.bot_data || {}),
        ai_agent: 'on',
        ai_history_since: new Date().toISOString(),
        ai_materials_sent: {},
        ai_handoff: null,
        ai_auto_materials_at: null,
        ai_materials_busy_until: null,
        nome: null,
        mes: null,
        convidados: null,
      } as Json;
      // Limpa também qualquer pausa (trava anti-loop, passagem do bot fixo...):
      // conversa pausada nem chega na IA.
      await supabase.from('wapi_conversations').update({
        bot_step: AI_STEP,
        bot_enabled: true,
        bot_data: newBotData,
        bot_paused_until: null,
        bot_paused_reason: null,
        bot_paused_at: null,
      }).eq('id', conv.id);
      console.log(`[AI Agent] #reiniciar no número de teste — conversa ${conv.id} zerada (passagem e pausas limpas)`);
      conv.bot_step = AI_STEP;
      conv.bot_enabled = true;
      conv.bot_data = newBotData;
      const model = (settings.test_model || settings.model || DEFAULT_AI_MODEL);
      await sendViaWapiSend(supabase, 'send-text', instance, conv, { message: `🧪 Conversa reiniciada. Modelo em teste: ${model}. Pode mandar a primeira mensagem como se fosse um cliente.` });
      return true;
    }

    // Equipe assumiu (botão Inativo, mensagem humana ou transferência): IA fica
    // fora — exceto quando foi a IA que passou, a equipe está fora do horário e
    // ninguém da equipe escreveu ainda: aí ela segue tirando dúvidas.
    let afterHoursHandoff: Json | null = null;
    if (conv.bot_step === 'human_takeover') {
      const handoff = (conv.bot_data as Json | null)?.ai_handoff as Json | undefined;
      const handoffAt = typeof handoff?.at === 'string' ? handoff.at : null;
      if (handoffAt && !isOpenAt(teamHoursOf(settings), Date.now()) && !(await teamRepliedSince(supabase, conv.id, handoffAt))) {
        afterHoursHandoff = handoff as Json;
        console.log(`[AI Agent] Conversa ${conv.id} já passada para a equipe, fora do horário e sem resposta humana — IA segue tirando dúvidas`);
      } else {
        console.log(`[AI Agent] Conversa ${conv.id} em human_takeover — pulando`);
        return false;
      }
    }
    if (conv.bot_step === AI_STEP && conv.bot_enabled === false) {
      console.log(`[AI Agent] Conversa ${conv.id} estava com a IA mas foi desligada (bot_enabled=false) — pulando`);
      return false;
    }

    // O número de teste é sempre atendido pela IA (a conversa dele costuma
    // ser antiga, de antes da ativação, e cairia na regra de "só leads novos").
    if (!afterHoursHandoff && !isAiTestPhone && !(await isEligible(supabase, settings, conv, phone, instance.company_id))) {
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

    // Adota a conversa (depois de uma passagem fora do horário, continua com a equipe)
    if (!afterHoursHandoff && (conv.bot_step !== AI_STEP || conv.bot_enabled !== true)) {
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

    // Junta mensagens seguidas: espera alguns segundos e só responde se esta
    // ainda for a última mensagem do cliente — a última responde por todas.
    const myMessageId = media?.messageId || incomingMessageId || null;
    if (myMessageId) {
      await new Promise((resolve) => setTimeout(resolve, AI_DEBOUNCE_MS));
      await waitMaterialsIdle(supabase, conv.id);
      const latest = await latestIncomingId(supabase, conv.id);
      if (latest && latest !== myMessageId) {
        console.log(`[AI Agent] Mensagem ${myMessageId} não é a última do cliente (última: ${latest}) — a última responde por todas`);
        return true;
      }
      // Estado pode ter mudado durante a espera (equipe assumiu, #reiniciar...)
      const { data: freshConv } = await supabase
        .from('wapi_conversations')
        .select('bot_step, bot_enabled, bot_data, lead_id')
        .eq('id', conv.id)
        .maybeSingle();
      if (freshConv) {
        conv.bot_step = freshConv.bot_step;
        conv.bot_enabled = freshConv.bot_enabled;
        conv.bot_data = freshConv.bot_data;
        conv.lead_id = freshConv.lead_id ?? conv.lead_id;
      }
      const stillMine = afterHoursHandoff
        ? conv.bot_step === 'human_takeover' && !(await teamRepliedSince(supabase, conv.id, String(afterHoursHandoff.at)))
        : conv.bot_step === AI_STEP && conv.bot_enabled !== false;
      if (!stillMine) {
        console.log(`[AI Agent] Conversa ${conv.id} mudou durante a espera (step ${conv.bot_step}) — não responde`);
        return true;
      }
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
    const isFirstReply = !chatMessages.some((m) => m.role === 'assistant' && !m.content.startsWith('🧪'));
    const { merged: mergedHistory, pendingUserMessages } = mergeConsecutiveTurns(chatMessages);

    let companyName = instance.unit || '';
    const { data: companyRow } = await supabase.from('companies').select('name').eq('id', instance.company_id).maybeSingle();
    if (companyRow?.name) companyName = companyRow.name as string;

    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    });
    const nowMs = Date.now();
    const booked = await loadBookedSlots(supabase, instance);
    const available = listAvailableSlots(parseVisitHours(settings.visit_hours), nowMs, booked, { days: 14, minLeadMinutes: 120, max: 60 });
    const sent = sentMaterials(conv);
    const sentList = (Object.keys(sent) as MaterialTipo[]).map((k) => `${MATERIAL_LABEL[k]} (${fmtTimeBR(sent[k] as string)})`);
    const bd = (conv.bot_data || {}) as Json;
    const known = [
      firstNameOrEmpty(bd.nome as string) ? `nome ${bd.nome}` : null,
      bd.mes ? `mês ${bd.mes}` : null,
      bd.convidados ? `${bd.convidados}` : null,
    ].filter(Boolean) as string[];
    const systemPrompt = buildSystemPrompt(companyName, instance.unit, settings, today, {
      offers: pickTwoOffers(available),
      sentMaterialsText: sentList.length > 0 ? sentList.join(', ') : 'nenhum',
      teamHoursText: teamHoursMessage(settings, nowMs),
      knownDataText: known.length > 0 ? known.join(', ') : 'nada ainda',
      isFirstReply,
      pendingUserMessages,
      afterHoursHandoff: afterHoursHandoff
        ? { reason: String(afterHoursHandoff.reason || ''), returns: nextOpeningText(teamHoursOf(settings), nowMs) }
        : null,
      visitRepliesAgo: repliesSinceVisitInvite(chatMessages),
      minPackageGuests: smallestPackageGuests(await loadSalesMaterials(supabase, instance)),
    });

    const session = createLlmSession({
      model,
      system: systemPrompt,
      history: mergedHistory,
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
        await handOffOnFailure(supabase, instance, conv, phone, contactName, settings, `falha técnica da IA (${model}) — responda o cliente`);
        return true;
      }
      console.log(`[AI Agent] Rodada ${round + 1} (${step.servedModel}): ${step.toolCalls.length} ferramenta(s), texto ${step.text.length} caracteres, tokens in=${step.usage.inputTokens + step.usage.cachedInputTokens} out=${step.usage.outputTokens}`);

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
        await handOffOnFailure(supabase, instance, conv, phone, contactName, settings, 'a IA não soube responder esta mensagem');
        return true;
      }

      if (step.toolCalls.length > 0) {
        const results: Array<{ id: string; content: string }> = [];
        for (const call of step.toolCalls) {
          const args = call.args as any;
          let toolResult = 'ERRO: ferramenta desconhecida.';
          if (call.name === 'registrar_dados_festa') {
            toolResult = await toolRegistrarDados(supabase, instance, conv, phone, contactName, botSettings, args);
          } else if (call.name === 'agendar_visita') {
            toolResult = await toolAgendarVisita(supabase, instance, conv, phone, contactName, settings, args);
          } else if (call.name === 'enviar_materiais') {
            toolResult = await toolEnviarMateriais(supabase, instance, conv, phone, contactName, String(args.tipo || ''), args.reenviar === true);
          } else if (call.name === 'transferir_para_atendente') {
            toolResult = await toolTransferir(supabase, instance, conv, phone, contactName, settings, String(args.motivo || ''));
          }
          results.push({ id: call.id, content: toolResult });
        }
        session.addToolResults(results);
        continue; // nova rodada para a IA redigir a resposta final
      }

      if (!step.text) {
        // Nada para mandar: nunca deixa o cliente no vácuo
        console.error(`[AI Agent] ${model} não devolveu texto nem ferramenta (conv ${conv.id})`);
        await handOffOnFailure(supabase, instance, conv, phone, contactName, settings, 'a IA não conseguiu gerar resposta — responda o cliente');
        return true;
      }
      // Passou para a equipe neste turno: o horário da EQUIPE vai sempre por
      // conta do sistema (a IA confundia com as janelas de visita)
      let finalText = step.text;
      if (conv.__handoffThisTurn && !finalText.includes(describeTeamHours(teamHoursOf(settings)))) {
        finalText = `${finalText}\n\n${teamHoursMessage(settings)}`;
      }
      // Chegou mensagem nova do cliente enquanto esta resposta era montada (ex.:
      // durante o envio dos materiais): descarta esta e deixa a execução da
      // mensagem mais nova responder tudo de uma vez. Confere no último
      // instante, logo antes de enviar.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (myMessageId && !conv.__handoffThisTurn) {
        const latestNow = await latestIncomingId(supabase, conv.id);
        if (latestNow && latestNow !== myMessageId) {
          console.log(`[AI Agent] Mensagem nova (${latestNow}) chegou durante a resposta — a mais nova responde por todas`);
          return true;
        }
      }
      const delivered = await sendViaWapiSend(supabase, 'send-text', instance, conv, { message: finalText });
      if (!delivered) {
        console.error(`[AI Agent] Resposta da IA não foi entregue ao WhatsApp (conv ${conv.id})`);
        await handOffOnFailure(supabase, instance, conv, phone, contactName, settings, 'a resposta da IA não saiu no WhatsApp — responda o cliente');
        return true;
      }
      await touchHandoffMark(supabase, conv);
      return true;
    }

    console.warn('[AI Agent] Max tool rounds reached without final reply');
    await handOffOnFailure(supabase, instance, conv, phone, contactName, settings, 'a IA se enrolou e não terminou a resposta — responda o cliente');
    return true;
  } catch (err) {
    console.error('[AI Agent] Unexpected error:', err);
    // Conversa já era da IA: passa para a equipe em vez de ficar em silêncio
    // (e não deixa o bot fixo atropelar no meio). Antes de adotar, segue o bot fixo.
    if (conv.bot_step === AI_STEP) {
      await handOffOnFailure(supabase, instance, conv, phone, contactName, settings, 'erro inesperado na IA — responda o cliente');
      return true;
    }
    return false;
  }
}

// Qualquer falha da IA numa conversa que é dela vira passagem para a equipe
// (histórico + sininho + alerta forte se ninguém responder) e o cliente
// recebe uma mensagem curta com o horário da equipe. Nunca lança.
async function handOffOnFailure(
  supabase: any,
  instance: AgentInstance,
  conv: AgentConv,
  phone: string,
  contactName: string | null,
  settings: AiSettings | null,
  reason: string,
): Promise<void> {
  try {
    // Já passou para a equipe neste turno (a IA chamou a ferramenta): não
    // duplica histórico/aviso, só garante a mensagem ao cliente
    if (conv.bot_step !== 'human_takeover') {
      await toolTransferir(supabase, instance, conv, phone, contactName, settings, reason);
    }
    const hours = settings ? ` ${teamHoursMessage(settings)}` : '';
    await sendViaWapiSend(supabase, 'send-text', instance, conv, {
      message: `Vou pedir para alguém da nossa equipe continuar com você por aqui, tá? 😊${hours}`,
    });
    await touchHandoffMark(supabase, conv);
  } catch (err) {
    console.error('[AI Agent] Falha até ao passar para a equipe:', err);
  }
}
