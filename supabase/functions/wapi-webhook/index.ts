import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { detectAndPauseBotLoop, isConversationPaused } from "../_shared/bot-loop-guard.ts";
import { normalizeJid, type NormalizedJid } from "../_shared/jid-normalizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';
const ZAPI_BASE_URL = 'https://api.z-api.io/instances';
const ZAPI_NOTIFY_REINFORCE_TTL_MS = 10 * 60 * 1000;
const zapiNotifyReinforceCache = new Map<string, number>();
const RECONNECT_AUTOMATION_QUARANTINE_MS = 15 * 60 * 1000;

// Instance IDs enabled for interactive messaging (Z-API buttons/lists)
const INTERACTIVE_ENABLED_INSTANCES = new Set([
  'fff981eb-ebdd-49b6-9643-0251e252b586', // Mega Magic
  '75feab3b-eb12-44f0-8ada-463e5540c869', // Vendas 3
]);
const MEGA_MAGIC_INSTANCE_ID = 'fff981eb-ebdd-49b6-9643-0251e252b586';
const MEGA_MAGIC_PILOT_PHONE = '15981121710';

type Provider = 'wapi' | 'zapi';
type JsonRecord = Record<string, any>;

function normalizeZapiRemoteJid(rawPhone: string): string {
  const raw = (rawPhone || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.replace('@c.us', '@s.whatsapp.net').replace('@s.whatsapp.net@s.whatsapp.net', '@s.whatsapp.net');
  return `${raw.replace(/\D/g, '')}@s.whatsapp.net`;
}

// === Self-name guard ===
// Avoid storing the buffet/company/instance name as the contact name.
// This happens when the client has the buffet saved in their phone — WhatsApp
// then transmits the buffet's name in pushName for messages sent from that contact.
const _selfNamesCache = new Map<string, Set<string>>();
function _normName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
async function getCompanySelfNames(supabase: SupabaseClient, companyId: string): Promise<Set<string>> {
  if (_selfNamesCache.has(companyId)) return _selfNamesCache.get(companyId)!;
  const names = new Set<string>();
  try {
    const { data: company } = await supabase.from('companies').select('name, slug').eq('id', companyId).maybeSingle();
    if (company?.name) names.add(_normName(company.name));
    if (company?.slug) names.add(_normName(company.slug));
    const { data: instances } = await supabase.from('wapi_instances').select('unit, instance_id').eq('company_id', companyId);
    for (const inst of instances || []) {
      if (inst.unit) names.add(_normName(inst.unit));
    }
  } catch (e) {
    console.warn('[SelfNameGuard] Failed to load company self-names:', e);
  }
  names.delete('');
  _selfNamesCache.set(companyId, names);
  return names;
}
async function isSelfName(supabase: SupabaseClient, companyId: string, candidate: string | null | undefined): Promise<boolean> {
  if (!candidate || !companyId) return false;
  const norm = _normName(candidate);
  if (!norm || norm.length < 3) return false;
  const selfNames = await getCompanySelfNames(supabase, companyId);
  for (const self of selfNames) {
    if (!self) continue;
    // Exact match OR candidate contains the self name as a substring (e.g. "Buffet Mega Magic" contains "megamagic")
    if (norm === self || norm.includes(self) || self.includes(norm)) return true;
  }
  return false;
}

async function resolveLidConversation(
  supabase: SupabaseClient,
  instanceDbId: string,
  lidJid: string,
  msgId: string | null | undefined,
  msg: JsonRecord,
): Promise<JsonRecord | null> {
  const selectFields = 'id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, contact_picture, lead_id, updated_at';

  const ctx = msg.contextInfo
    || msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
    || msg.message?.audioMessage?.contextInfo
    || msg.message?.documentMessage?.contextInfo
    || null;
  const candidateMessageIds = [
    msgId,
    msg.referenceMessageId,
    msg.quotedMessageId,
    msg.quotedMsgId,
    ctx?.stanzaId,
    ctx?.quotedMessageId,
    ctx?.quotedMsgId,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, arr) => arr.indexOf(value) === index);

  for (const candidateMsgId of candidateMessageIds) {
    const { data: existingMessage } = await supabase
      .from('wapi_messages')
      .select('conversation_id')
      .eq('message_id', candidateMsgId)
      .maybeSingle();

    if (existingMessage?.conversation_id) {
      const { data: convByMessage } = await supabase
        .from('wapi_conversations')
        .select(selectFields)
        .eq('id', existingMessage.conversation_id)
        .maybeSingle();
      if (convByMessage?.remote_jid && !String(convByMessage.remote_jid).includes('@lid')) {
        if (candidateMsgId !== msgId) {
          console.log(`[Webhook] Resolved @lid ${lidJid} to ${convByMessage.remote_jid} by referenced message ${candidateMsgId}`);
        }
        return convByMessage as JsonRecord;
      }
    }
  }

  const lidDigits = lidJid.replace(/\D/g, '');
  const possibleNames = [
    msg.pushName,
    msg.chatName,
    msg.chat?.name,
    msg.chat?.pushName,
    msg.chat?.displayName,
    msg.contactName,
    msg.notifyName,
    msg.senderName,
    msg.sender?.pushName,
    msg.sender?.pushname,
    msg.sender?.name,
    msg.sender?.displayName,
    msg.sender?.shortName,
    msg.sender?.verifiedName,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 1)
    .map((value) => value.trim())
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .filter((value) => value.replace(/\D/g, '') !== lidDigits);

  for (const name of possibleNames) {
    const { data: matches } = await supabase
      .from('wapi_conversations')
      .select(selectFields)
      .eq('instance_id', instanceDbId)
      .eq('contact_name', name)
      .not('remote_jid', 'like', '%@g.us%')
      .not('remote_jid', 'like', '%@lid%')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(2);

    if (matches?.length === 1) {
      console.log(`[Webhook] Resolved @lid ${lidJid} to ${matches[0].remote_jid} by contact_name=${name}`);
      return matches[0] as JsonRecord;
    }
  }

  // Fallback: try matching by contact_picture (profile photo URL).
  // Useful for fromMe messages where pushName is not available — same WhatsApp
  // account always has the same profile picture URL across @lid and the real JID.
  const picCandidates = [
    msg.chat?.profilePicture,
    msg.sender?.profilePicture,
    (msg as JsonRecord).profilePicture,
  ].filter((v): v is string => typeof v === 'string' && v.length > 30);

  for (const pic of picCandidates) {
    const { data: picMatches } = await supabase
      .from('wapi_conversations')
      .select(selectFields)
      .eq('instance_id', instanceDbId)
      .eq('contact_picture', pic)
      .not('remote_jid', 'like', '%@g.us%')
      .not('remote_jid', 'like', '%@lid%')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(2);

    if (picMatches?.length === 1) {
      console.log(`[Webhook] Resolved @lid ${lidJid} to ${picMatches[0].remote_jid} by contact_picture`);
      return picMatches[0] as JsonRecord;
    }
  }

  return null;
}

function waitUntil(promise: Promise<unknown>): void {
  const runtime = (globalThis as JsonRecord).EdgeRuntime as { waitUntil?: (promise: Promise<unknown>) => void } | undefined;
  if (runtime?.waitUntil) {
    runtime.waitUntil(promise);
    return;
  }
  promise.catch((err) => console.error('[Background task] Unhandled error:', err));
}

function getReconnectQuarantineUntil(instance: JsonRecord): Date | null {
  const connectedAt = instance.connected_at ? new Date(String(instance.connected_at)).getTime() : 0;
  if (!connectedAt || Number.isNaN(connectedAt)) return null;
  const quarantineUntil = connectedAt + RECONNECT_AUTOMATION_QUARANTINE_MS;
  if (quarantineUntil <= Date.now()) return null;
  return new Date(quarantineUntil);
}

function isReconnectHistoryReplay(instance: JsonRecord, messageTimestamp: string): boolean {
  const connectedAt = instance.connected_at ? new Date(String(instance.connected_at)).getTime() : 0;
  const msgAt = new Date(messageTimestamp).getTime();
  if (!connectedAt || Number.isNaN(connectedAt) || Number.isNaN(msgAt)) return false;
  const quarantineUntil = connectedAt + RECONNECT_AUTOMATION_QUARANTINE_MS;
  if (quarantineUntil <= Date.now()) return false;
  // During the reconnect window, only messages that arrived AFTER reconnect can
  // trigger bot automation. Older timestamps are WhatsApp history replay and
  // must never fan out welcome/materials/follow-up bursts.
  return msgAt < connectedAt;
}

const RAW_WEBHOOK_EVENT_ID_FIELD = '__rawWebhookEventId';

function headersToJson(req: Request): JsonRecord {
  const headers: JsonRecord = {};
  req.headers.forEach((value, key) => {
    if (['authorization', 'apikey', 'client-token'].includes(key.toLowerCase())) {
      headers[key] = '[redacted]';
    } else {
      headers[key] = value;
    }
  });
  return headers;
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function inferRawWebhookFacts(payload: JsonRecord): JsonRecord {
  const data = (payload.data as JsonRecord | undefined) || payload;
  const msg = (data.key ? data : (data.message as JsonRecord | undefined)?.key ? data.message : data) as JsonRecord;
  const remoteJid = pickFirstString(
    msg?.key?.remoteJid,
    msg?.remoteJid,
    msg?.from,
    msg?.chat?.id,
    payload?.chat?.id,
    payload.phone ? normalizeZapiRemoteJid(String(payload.phone)) : null,
  );
  const participant = pickFirstString(msg?.key?.participant, msg?.participant, msg?.author);
  const eventType = pickFirstString(payload.event, payload.type, data.event) || 'unknown';
  const messageId = pickFirstString(msg?.key?.id, msg?.id, msg?.messageId, data?.messageId, payload?.messageId, Array.isArray(payload.ids) ? payload.ids[0] : null);
  const hasContent = Boolean(
    msg?.message || msg?.msgContent || msg?.body || msg?.text ||
    payload.text || payload.image || payload.audio || payload.video || payload.document || payload.sticker ||
    payload.contact || payload.contacts || payload.location || payload.reaction || payload.poll || payload.reply ||
    payload.message || payload.hydratedTemplate || payload.templateMessage || payload.buttonsResponseMessage ||
    payload.buttonResponseMessage || payload.interactiveResponseMessage || payload.listResponseMessage || payload.listMessage
  );
  const provider = payload.type || payload.phone ? 'zapi' : 'wapi';

  // Classificação canônica via JID normalizer (fonte única de verdade)
  const norm: NormalizedJid = normalizeJid(remoteJid);
  const participantNorm: NormalizedJid = normalizeJid(participant);
  const isStatusOrBroadcast =
    norm.kind === 'broadcast' || norm.kind === 'newsletter' ||
    participantNorm.kind === 'broadcast' || participantNorm.kind === 'newsletter';

  return {
    provider,
    instance_id: pickFirstString(payload.instanceId, payload.instance_id, data.instanceId),
    event_type: eventType,
    remote_jid: remoteJid,
    from_me: Boolean(msg?.key?.fromMe ?? msg?.fromMe ?? payload.fromMe ?? false),
    message_id: messageId,
    is_group: norm.kind === 'group',
    is_status_broadcast: isStatusOrBroadcast,
    has_content: hasContent,
  };
}

async function saveRawWebhookEvent(supabase: SupabaseClient, payload: JsonRecord, req: Request, parseError?: string): Promise<string | null> {
  try {
    const facts = inferRawWebhookFacts(payload);
    const { data, error } = await supabase
      .from('wapi_webhook_raw_events')
      .insert({
        ...facts,
        processing_status: parseError ? 'error' : 'received',
        processing_note: parseError || null,
        payload,
        headers: headersToJson(req),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
        error: parseError || null,
      })
      .select('id')
      .single();
    if (error) {
      console.error('[RawWebhook] Failed to save raw event:', error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error('[RawWebhook] Unexpected error saving raw event:', err);
    return null;
  }
}

async function markRawWebhookEvent(supabase: SupabaseClient, rawEventId: string | null | undefined, patch: JsonRecord): Promise<void> {
  if (!rawEventId) return;
  const { error } = await supabase
    .from('wapi_webhook_raw_events')
    .update(patch)
    .eq('id', rawEventId);
  if (error) console.warn('[RawWebhook] Failed to update raw event:', error.message);
}

async function reinforceZapiNotifySentByMe(instance: JsonRecord, context: string): Promise<void> {
  if (instance.provider !== 'zapi' || !instance.instance_id || !instance.instance_token) return;

  const now = Date.now();
  const cacheKey = `${instance.instance_id}:${context}`;
  const lastRun = zapiNotifyReinforceCache.get(cacheKey) || 0;
  if (now - lastRun < ZAPI_NOTIFY_REINFORCE_TTL_MS) return;
  zapiNotifyReinforceCache.set(cacheKey, now);

  const webhookUrl = `${(Deno.env.get('SUPABASE_URL') || 'https://rsezgnkfhodltrsewlhz.supabase.co').replace(/\/$/, '')}/functions/v1/wapi-webhook`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (instance.client_token) headers['Client-Token'] = String(instance.client_token);

  const requests = [
    { path: 'update-notify-sent-by-me', body: { notifySentByMe: true } },
    { path: 'update-every-webhooks', body: { value: webhookUrl, notifySentByMe: true } },
    { path: 'update-webhook-received', body: { value: webhookUrl, notifySentByMe: true } },
    { path: 'update-webhook-receive-all-notifications', body: { value: webhookUrl, notifySentByMe: true } },
  ].map(async ({ path, body }) => {
    const url = `${ZAPI_BASE_URL}/${instance.instance_id}/token/${instance.instance_token}/${path}`;
    const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    return `${path}:${res.ok ? 'OK' : res.status}`;
  });

  try {
    const results = await Promise.allSettled(requests);
    console.log(`[zapi-webhook] reinforced notify-sent-by-me (${context}): ${results.map((r) => r.status === 'fulfilled' ? r.value : 'ERR').join(',')}`);
  } catch (err) {
    console.warn('[zapi-webhook] reinforce notify-sent-by-me failed:', err instanceof Error ? err.message : String(err));
  }
}

function isMegaMagicPilotPhone(instanceId: string, contactPhone: string): boolean {
  if (instanceId !== MEGA_MAGIC_INSTANCE_ID) return false;

  const rawPhone = contactPhone.replace(/\D/g, '');
  const cleanPhone = rawPhone.replace(/^55/, '');

  return cleanPhone === MEGA_MAGIC_PILOT_PHONE || rawPhone.endsWith(MEGA_MAGIC_PILOT_PHONE);
}

function zapiUrl(instanceId: string, token: string, path: string): string {
  return `${ZAPI_BASE_URL}/${instanceId}/token/${token}/${path}`;
}

async function zapiRequest(instanceId: string, token: string, clientToken: string | null, path: string, method: string, body?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Client-Token'] = clientToken;
    const url = zapiUrl(instanceId, token, path);
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('text/html')) return { ok: false, error: 'Z-API indisponível' };
    const data = await res.json();
    const providerError = typeof data.error === 'string' ? data.error : null;
    if (!res.ok || providerError) return { ok: false, data, error: data.message || providerError || 'Erro Z-API' };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro Z-API' };
  }
}

// Menu options - numbered choices for structured input
const MONTH_OPTIONS = [
  { num: 1, value: 'Fevereiro' },
  { num: 2, value: 'Março' },
  { num: 3, value: 'Abril' },
  { num: 4, value: 'Maio' },
  { num: 5, value: 'Junho' },
  { num: 6, value: 'Julho' },
  { num: 7, value: 'Agosto' },
  { num: 8, value: 'Setembro' },
  { num: 9, value: 'Outubro' },
  { num: 10, value: 'Novembro' },
  { num: 11, value: 'Dezembro' },
];

const DAY_OPTIONS = [
  { num: 1, value: 'Segunda a Quinta' },
  { num: 2, value: 'Sexta' },
  { num: 3, value: 'Sábado' },
  { num: 4, value: 'Domingo' },
];

// Convert keycap emoji digits (2️⃣, 1️⃣2️⃣, 🔟) to a number
function emojiDigitsToNumber(text: string): number | null {
  if (text.includes('🔟')) return 10;
  const keycapPattern = /([\d])\uFE0F?\u20E3/g;
  let digits = '';
  let m: RegExpExecArray | null;
  while ((m = keycapPattern.exec(text)) !== null) {
    digits += m[1];
  }
  return digits ? parseInt(digits, 10) : null;
}

// Extract options from question text dynamically
function extractOptionsFromQuestion(questionText: string): { num: number; value: string }[] | null {
  const lines = questionText.split('\n');
  const options: { num: number; value: string }[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match patterns like "1 - 50 pessoas" or "*1* - 50 pessoas" or "1. 50 pessoas"
    const match = trimmed.match(/^\*?(\d+)\*?\s*[-\.]\s*(.+)$/);
    if (match) {
      options.push({ num: parseInt(match[1]), value: match[2].trim() });
      continue;
    }
    // Try emoji keycap digits: "2️⃣ Fevereiro", "1️⃣2️⃣ Dezembro", "🔟 Outubro"
    const emojiNum = emojiDigitsToNumber(trimmed);
    if (emojiNum !== null) {
      // Remove all keycap sequences and 🔟 to get the label text
      const label = trimmed
        .replace(/🔟/g, '')
        .replace(/[\d]\uFE0F?\u20E3/g, '')
        .replace(/^\s*[-\.]\s*/, '')
        .trim();
      if (label) {
        options.push({ num: emojiNum, value: label });
      }
    }
  }
  
  return options.length > 0 ? options : null;
}

// Default guest options (fallback only)
const DEFAULT_GUEST_OPTIONS = [
  { num: 1, value: '50 pessoas' },
  { num: 2, value: '60 pessoas' },
  { num: 3, value: '70 pessoas' },
  { num: 4, value: '80 pessoas' },
  { num: 5, value: '90 pessoas' },
  { num: 6, value: '100 pessoas' },
];

// Default tipo options (cliente, orçamento ou trabalhe conosco)
const TIPO_OPTIONS = [
  { num: 1, value: 'Já sou cliente' },
  { num: 2, value: 'Quero um orçamento' },
  { num: 3, value: 'Trabalhe Conosco' },
];

// Default próximo passo options
const PROXIMO_PASSO_OPTIONS = [
  { num: 1, value: 'Agendar visita' },
  { num: 2, value: 'Tirar dúvidas' },
  { num: 3, value: 'Analisar com calma' },
];

// Convert number to keycap emoji (1→1️⃣, 10→🔟, 12→1️⃣2️⃣)
function numToKeycap(n: number): string {
  if (n === 10) return '🔟';
  return String(n).split('').map(d => `${d}\uFE0F\u20E3`).join('');
}

// Build menu text with keycap emojis
function buildMenuText(options: { num: number; value: string }[]): string {
  return options.map(opt => `${numToKeycap(opt.num)} - ${opt.value}`).join('\n');
}

function normalizeChoiceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirstString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function extractZapiInteractiveText(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractZapiInteractiveText(item);
      if (text) return text;
    }
    return '';
  }

  if (typeof value !== 'object') {
    return '';
  }

  const record = value as JsonRecord;

  const directText = getFirstString([
    record.selectedDisplayText,
    record.selectedButtonText,
    record.displayText,
    record.buttonText,
    record.selectedText,
    record.title,
    record.description,
    record.text,
    record.label,
    record.name,
    record.rowTitle,
    record.optionTitle,
    record.selectedRowTitle,
    record.selectedOptionTitle,
    record.replyTitle,
    record.replyText,
  ]);

  if (directText) return directText;

  const nestedCandidates = [
    record.buttonReply,
    record.selectedButton,
    record.selectedOption,
    record.singleSelectReply,
    record.listResponse,
    record.listReply,
    record.option,
    record.reply,
    record.response,
    record.nativeFlowResponseMessage,
  ];

  for (const candidate of nestedCandidates) {
    const text = extractZapiInteractiveText(candidate);
    if (text) return text;
  }

  return '';
}

function extractZapiInteractiveId(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const id = extractZapiInteractiveId(item);
      if (id) return id;
    }
    return '';
  }

  if (typeof value !== 'object') {
    return '';
  }

  const record = value as JsonRecord;

  const directId = getFirstString([
    record.selectedButtonId,
    record.selectedId,
    record.buttonId,
    record.id,
    record.selectedRowId,
    record.rowId,
    record.optionId,
    record.replyId,
  ]);

  if (directId) return directId;

  const nestedCandidates = [
    record.buttonReply,
    record.selectedButton,
    record.selectedOption,
    record.singleSelectReply,
    record.listResponse,
    record.listReply,
    record.option,
    record.reply,
    record.response,
    record.nativeFlowResponseMessage,
  ];

  for (const candidate of nestedCandidates) {
    const id = extractZapiInteractiveId(candidate);
    if (id) return id;
  }

  return '';
}

function matchFlowOptionByReply<T extends { label?: string | null; value?: string | null }>(
  input: string,
  options: T[],
): T | null {
  const normalizedInput = normalizeChoiceText(input);
  if (!normalizedInput) return null;

  for (const option of options) {
    const candidates = [option.label, option.value]
      .filter((candidate): candidate is string => Boolean(candidate?.trim()))
      .map((candidate) => normalizeChoiceText(candidate));

    if (candidates.some((candidate) => (
      candidate === normalizedInput ||
      candidate.includes(normalizedInput) ||
      normalizedInput.includes(candidate)
    ))) {
      return option;
    }
  }

  return null;
}

// Helper: get notification targets scoped to a specific company
async function getCompanyNotificationTargets(
  supabase: SupabaseClient,
  companyId: string,
  unitPermission: string
): Promise<string[]> {
  // 1. Get users that belong to this company
  const { data: companyUsers } = await supabase
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId);

  const companyUserIds = companyUsers?.map((u: any) => u.user_id) || [];
  if (companyUserIds.length === 0) return [];

  // 2. Filter by permissions within company users
  const { data: userPerms } = await supabase
    .from('user_permissions')
    .select('user_id')
    .eq('granted', true)
    .in('permission', [unitPermission, 'leads.unit.all'])
    .in('user_id', companyUserIds);

  // 3. Admin roles within company users
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .in('user_id', companyUserIds);

  const targetIds = new Set<string>();
  userPerms?.forEach((p: any) => targetIds.add(p.user_id));
  adminRoles?.forEach((r: any) => targetIds.add(r.user_id));

  return Array.from(targetIds);
}

// Validation functions
function validateName(input: string): { valid: boolean; value?: string; error?: string } {
  let name = input.trim();
  
  // Extract name from common phrases like "meu nome é Victor", "me chamo Ana", "sou o Pedro", etc.
  const namePatterns = [
    /^(?:(?:o\s+)?meu\s+nome\s+(?:é|e)\s+)(.+)/i,
    /^(?:me\s+chamo\s+)(.+)/i,
    /^(?:(?:eu\s+)?sou\s+(?:o|a)\s+)(.+)/i,
    /^(?:pode\s+me\s+chamar\s+(?:de\s+)?)(.+)/i,
    /^(?:é\s+)(.+)/i,
    /^(?:nome:?\s+)(.+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  if (name.length < 2) {
    return { valid: false, error: 'Hmm, não consegui entender seu nome 🤔\n\nPor favor, digite seu nome:' };
  }
  // Accept any reasonable name (letters, spaces, accents)
  if (!/^[\p{L}\s'-]+$/u.test(name)) {
    return { valid: false, error: 'Por favor, digite apenas seu nome (sem números ou símbolos):' };
  }
  // Reject if too many words (names rarely have more than 5 words)
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 5) {
    return { valid: false, error: 'Hmm, parece uma frase 🤔\n\nPor favor, digite apenas seu *nome*:' };
  }
  // Reject if contains common non-name words (phrases/sentences)
  const nonNameWords = [
    'que', 'tem', 'como', 'quero', 'queria', 'gostaria', 'preciso',
    'vi', 'vou', 'estou', 'tenho', 'pode', 'posso', 'sobre',
    'instagram', 'facebook', 'whatsapp', 'site', 'promoção', 'promocao',
    'preço', 'preco', 'valor', 'orçamento', 'orcamento',
    'festa', 'evento', 'buffet', 'aniversário', 'aniversario',
    'obrigado', 'obrigada', 'por favor', 'bom dia', 'boa tarde', 'boa noite',
    'olá', 'ola', 'oi', 'hey', 'hello',
  ];
  const lowerName = name.toLowerCase();
  const hasNonNameWord = nonNameWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(lowerName);
  });
  if (hasNonNameWord) {
    return { valid: false, error: 'Hmm, não consegui entender seu nome 🤔\n\nPor favor, digite apenas seu *nome*:' };
  }
  // Capitalize first letter of each word
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return { valid: true, value: name };
}

function validateMenuChoice(input: string, options: { num: number; value: string }[], stepName: string): { valid: boolean; value?: string; error?: string } {
  const normalized = input.trim();

  // 0. Special case: input is only digits + separators (space/hyphen/comma/dot/slash)
  // between digits → treat as single number. Fixes "1 1" → 11, "1 2" → 12 (Nov/Dez).
  // Only applies when the entire string is digits+separators (no letters/words after).
  if (/^[\d][\d\s\-,./]*$/.test(normalized) && /^\D*\d[\d\s\-,./]*\d\D*$/.test(normalized)) {
    const collapsed = normalized.replace(/[\s\-,./]+/g, '');
    if (/^\d+$/.test(collapsed)) {
      const num = parseInt(collapsed);
      const option = options.find(opt => opt.num === num);
      if (option) {
        if (collapsed !== normalized) {
          console.log(`[Bot] Collapsed digits "${normalized}" → "${collapsed}" → option ${num} (${option.value})`);
        }
        return { valid: true, value: option.value };
      }
    }
  }

  // 1. Extract number from input - accept "3", "3 sábado", "3-sábado", etc.
  const numMatch = normalized.match(/^(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    const option = options.find(opt => opt.num === num);
    if (option) {
      return { valid: true, value: option.value };
    }
  }
  
  // 2. Try to match by text similarity (fuzzy match)
  const lower = normalized.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (lower.length >= 3) {
    // Exact or partial match against option values
    for (const opt of options) {
      const optLower = opt.value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      // Check if input contains the option text or vice versa
      if (optLower === lower || optLower.includes(lower) || lower.includes(optLower)) {
        console.log(`[Bot] Text match: "${normalized}" → "${opt.value}" (option ${opt.num})`);
        return { valid: true, value: opt.value };
      }
    }
    
    // Keyword-based matching for common variations
    const keywordMap: Record<string, string[]> = {
      'cliente': ['cliente', 'ja sou', 'já sou', 'sou cliente', 'festa agendada'],
      'orçamento': ['orcamento', 'orçamento', 'quero um', 'quero orcamento', 'quero orçamento', 'receber orcamento', 'receber orçamento', 'budget', 'preço', 'preco', 'valor', 'quanto custa'],
      'trabalhe': ['trabalhe', 'trabalhar', 'emprego', 'vaga', 'curriculo', 'currículo', 'trabalho'],
      'visita': ['visita', 'agendar', 'conhecer', 'ir ai', 'ir aí', 'quero visitar', 'quero conhecer'],
      'dúvidas': ['duvida', 'dúvida', 'duvidas', 'dúvidas', 'divida', 'dívida', 'dividas', 'dívidas', 'pergunta', 'perguntar', 'saber mais', 'tirar duvida', 'tenho uma duvida', 'tenho uma dívida', 'tenho duvida', 'tenho dívida'],
      'analisar': ['analisar', 'pensar', 'calma', 'depois', 'mais tarde', 'vou pensar', 'vou analisar'],
    };
    
    for (const opt of options) {
      const optLower = opt.value.toLowerCase();
      for (const [keyword, variations] of Object.entries(keywordMap)) {
        if (optLower.includes(keyword)) {
          for (const variation of variations) {
            if (lower.includes(variation)) {
              console.log(`[Bot] Keyword match: "${normalized}" → "${opt.value}" (keyword: ${variation})`);
              return { valid: true, value: opt.value };
            }
          }
        }
      }
    }
  }
  
  // Build error message with valid options
  const validNumbers = options.map(opt => opt.num).join(', ');
  return { 
    valid: false, 
    error: `Por favor, responda apenas com o *número* da opção desejada (${validNumbers}) 👇\n\n${buildMenuText(options)}` 
  };
}

function validateMonth(input: string): { valid: boolean; value?: string; error?: string } {
  return validateMenuChoice(input, MONTH_OPTIONS, 'mês');
}

function validateDay(input: string): { valid: boolean; value?: string; error?: string } {
  return validateMenuChoice(input, DAY_OPTIONS, 'dia');
}

function validateGuests(input: string, customOptions?: { num: number; value: string }[]): { valid: boolean; value?: string; error?: string } {
  const options = customOptions || DEFAULT_GUEST_OPTIONS;
  return validateMenuChoice(input, options, 'convidados');
}

// Validation router by step - now accepts question context for dynamic options
function validateAnswer(step: string, input: string, questionText?: string): { valid: boolean; value?: string; error?: string } {
  switch (step) {
    case 'nome': return validateName(input);
    case 'tipo': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || TIPO_OPTIONS, 'tipo');
    }
    case 'mes': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || MONTH_OPTIONS, 'mês');
    }
    case 'dia': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || DAY_OPTIONS, 'dia');
    }
    case 'convidados': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateGuests(input, customOptions || undefined);
    }
    case 'proximo_passo': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || PROXIMO_PASSO_OPTIONS, 'próximo passo');
    }
    default: return { valid: true, value: input.trim() };
  }
}

const ACTIVE_CLASSIC_BOT_STEPS = [
  'welcome',
  'tipo',
  'nome',
  'mes',
  'dia',
  'convidados',
  'sending_materials',
  'proximo_passo',
  'proximo_passo_reminded',
];

function isClassicBotStepActive(step: string | null | undefined): boolean {
  return ACTIVE_CLASSIC_BOT_STEPS.includes(step || '');
}

function inferPendingClassicBotStep(botData: JsonRecord | null | undefined): string | null {
  const data = (botData || {}) as JsonRecord;

  if (!data.nome) return 'nome';
  if (!data.tipo) return 'tipo';
  if (!data.mes) return 'mes';
  if (!data.dia) return 'dia';
  if (!data.convidados) return 'convidados';
  if (!data.proximo_passo) return 'proximo_passo';

  return null;
}

function shouldRecoverAccidentalHumanTakeover(
  provider: string | null | undefined,
  conv: { bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null },
): string | null {
  if (provider !== 'zapi') return null;
  if (conv.bot_enabled !== false || conv.bot_step !== 'human_takeover') return null;
  if (conv.lead_id) return null;

  return inferPendingClassicBotStep(conv.bot_data);
}

// Default questions fallback with numbered menus
const DEFAULT_QUESTIONS: Record<string, { question: string; confirmation: string | null; next: string }> = {
  nome: { 
    question: 'Para começar, me conta: qual é o seu nome? 👑', 
    confirmation: 'Muito prazer, {nome}! 👑✨', 
    next: 'tipo' 
  },
  tipo: {
    question: `Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n${buildMenuText(TIPO_OPTIONS)}`,
    confirmation: null,
    next: 'mes'
  },
  mes: { 
    question: `Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n${buildMenuText(MONTH_OPTIONS)}`, 
    confirmation: '{mes}, ótima escolha! 🎊', 
    next: 'dia' 
  },
  dia: { 
    question: `Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n${buildMenuText(DAY_OPTIONS)}`, 
    confirmation: 'Anotado!', 
    next: 'convidados' 
  },
  convidados: { 
    question: `E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n${buildMenuText(DEFAULT_GUEST_OPTIONS)}`, 
    confirmation: null, 
    next: 'complete' 
  },
};

// Check if a guest option exceeds the configured limit
// Detects semantically: "Mais de 90", "Acima de 100", "+ de 150", or extracts the max number from ranges like "91 a 120"
function exceedsGuestLimit(guestOption: string, limit: number): boolean {
  const lower = guestOption.toLowerCase().trim();
  
  // Patterns that indicate "more than X": "mais de X", "acima de X", "+ de X", "> X"
  const abovePatterns = [
    /(?:mais\s+de|acima\s+de|\+\s*de|>\s*)(\d+)/i,
    /(\d+)\s*\+/,  // "150+"
  ];
  for (const pattern of abovePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= limit) return true;
      // "Mais de 90" with limit=91 → the person wants >90, which is ≥91
      if (num >= limit - 1) return true;
    }
  }
  
  // Range pattern: "91 a 120 pessoas" → extract max number (120)
  const rangeMatch = lower.match(/(\d+)\s*(?:a|até|ate|-)\s*(\d+)/);
  if (rangeMatch) {
    const maxNum = parseInt(rangeMatch[2]);
    if (maxNum >= limit) return true;
    // Also check if min of range exceeds
    const minNum = parseInt(rangeMatch[1]);
    if (minNum >= limit) return true;
  }
  
  // Single number: "100 pessoas" → extract the number
  const singleMatch = lower.match(/(\d+)/);
  if (singleMatch) {
    const num = parseInt(singleMatch[1]);
    if (num >= limit) return true;
  }
  
  return false;
}

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
const normalizePhoneForTestMatch = (phone: string) => normalizePhone(phone).replace(/^55/, '').replace(/^0+/, '');

function getBrazilianPhoneVariants(rawPhone: string): string[] {
  const digits = normalizePhone(rawPhone);
  if (!digits) return [];

  const variants = new Set<string>([digits]);
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (digits.startsWith('55') && digits.length >= 12) variants.add(local);
  if (!digits.startsWith('55') && digits.length >= 10) variants.add(`55${digits}`);
  if (local.length === 10) {
    const withNine = `${local.slice(0, 2)}9${local.slice(2)}`;
    variants.add(withNine);
    variants.add(`55${withNine}`);
  }
  if (local.length === 11 && local[2] === '9') {
    const withoutNine = `${local.slice(0, 2)}${local.slice(3)}`;
    variants.add(withoutNine);
    variants.add(`55${withoutNine}`);
  }

  return Array.from(variants);
}


function isSameTestPhone(incomingPhone: string, testPhone: string): boolean {
  const incoming = normalizePhoneForTestMatch(incomingPhone);
  const configured = normalizePhoneForTestMatch(testPhone);
  if (!incoming || !configured) return false;

  const withOrWithoutNinth = (num: string): string[] => {
    const variants = new Set<string>([num]);

    // BR celular: DDD + 9 + número (11 dígitos). Alguns provedores retornam sem o 9.
    if (num.length === 11 && num[2] === '9') {
      variants.add(`${num.slice(0, 2)}${num.slice(3)}`); // remove 9º dígito
    }

    // Se vier sem 9 e parecer celular BR, também tenta versão com 9.
    if (num.length === 10) {
      variants.add(`${num.slice(0, 2)}9${num.slice(2)}`);
    }

    return Array.from(variants);
  };

  const incomingVariants = withOrWithoutNinth(incoming);
  const configuredVariants = withOrWithoutNinth(configured);

  for (const a of incomingVariants) {
    for (const b of configuredVariants) {
      if (!a || !b) continue;
      if (
        a === b ||
        a.endsWith(b) ||
        b.endsWith(a) ||
        a.slice(-11) === b.slice(-11) ||
        a.slice(-10) === b.slice(-10)
      ) {
        return true;
      }
    }
  }

  return false;
}

async function isVipNumber(supabase: SupabaseClient, instanceId: string, phone: string): Promise<boolean> {
  const n = normalizePhone(phone);
  const { data } = await supabase.from('wapi_vip_numbers').select('id').eq('instance_id', instanceId)
    .or(`phone.ilike.%${n}%,phone.ilike.%${n.replace(/^55/, '')}%`).limit(1);
  return Boolean(data?.length);
}

async function getBotSettings(supabase: SupabaseClient, instanceId: string) {
  const { data } = await supabase.from('wapi_bot_settings').select('*').eq('instance_id', instanceId).single();
  return data;
}

async function getBotQuestions(supabase: SupabaseClient, instanceId: string): Promise<Record<string, { question: string; confirmation: string | null; next: string }>> {
  const { data } = await supabase.from('wapi_bot_questions')
    .select('step, question_text, confirmation_text, sort_order')
    .eq('instance_id', instanceId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!data || data.length === 0) {
    return DEFAULT_QUESTIONS;
  }

  // Build question chain based on sort order
  const questions: Record<string, { question: string; confirmation: string | null; next: string }> = {};
  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    const nextStep = i < data.length - 1 ? data[i + 1].step : 'complete';
    questions[q.step] = {
      question: q.question_text,
      confirmation: q.confirmation_text || null,
      next: nextStep,
    };
  }
  return questions;
}

function replaceVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Suporta {{ key }}, {{key}} e {key} (com espaços opcionais)
    result = result.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'gi'), value);
    result = result.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), value);
  }
  return result;
}
async function sendTextViaWapiWithFallback(
  instanceId: string,
  instanceToken: string,
  remoteJid: string,
  message: string,
  delayTyping = 1
): Promise<{ messageId: string | null; attempt: string | null }> {
  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  const attempts: Array<{ name: string; body: JsonRecord }> = [
    { name: 'phone+message', body: { phone, message, delayTyping } },
    { name: 'phone+text', body: { phone, text: message, delayTyping } },
    { name: 'phoneNumber+message', body: { phoneNumber: phone, message, delayTyping } },
    { name: 'phoneNumber+text', body: { phoneNumber: phone, text: message, delayTyping } },
    { name: 'chatId+message', body: { chatId: `${phone}@s.whatsapp.net`, message, delayTyping } },
    { name: 'chatId+text', body: { chatId: `${phone}@s.whatsapp.net`, text: message, delayTyping } },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instanceToken}` },
        body: JSON.stringify(attempt.body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`[Bot] send-text failed [${attempt.name}]: ${res.status} ${errBody}`);
        continue;
      }

      const payload = await res.json();
      const msgId = payload?.messageId || payload?.data?.messageId || payload?.id || payload?.data?.id || null;
      // PHASE 2: Log response body for delivery diagnostics
      if (!msgId) {
        console.warn(`[Bot] send-text OK but NO msgId [${attempt.name}]. Response:`, JSON.stringify(payload).substring(0, 300));
      } else {
        console.log(`[Bot] send-text OK [${attempt.name}] msgId=${msgId}. Response:`, JSON.stringify(payload).substring(0, 200));
      }
      return { messageId: msgId, attempt: attempt.name };
    } catch (e) {
      console.warn(`[Bot] send-text exception [${attempt.name}]:`, e);
    }
  }

  console.error(`[Bot] send-text ALL attempts failed for ${remoteJid}`);
  return { messageId: null, attempt: null };
}

// Module-level provider context - set before each message processing
let _activeProvider: Provider = 'wapi';
let _activeClientToken: string | null = null;

function setActiveProvider(provider: string | null | undefined, clientToken: string | null | undefined) {
  _activeProvider = (provider === 'zapi' ? 'zapi' : 'wapi');
  _activeClientToken = clientToken || null;
}

async function sendBotMessage(instanceId: string, instanceToken: string, remoteJid: string, message: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
    console.log(`[Bot] Sending message to ${phone} via instance ${instanceId} (${_activeProvider})`);

    if (_activeProvider === 'zapi') {
      const res = await zapiRequest(instanceId, instanceToken, _activeClientToken, 'send-text', 'POST', { phone, message });
      const msgId = res.data ? ((res.data as JsonRecord).zapiMessageId || (res.data as JsonRecord).messageId) as string || null : null;
      console.log(`[Bot] Z-API send-text response: msgId=${msgId}`);
      return msgId;
    }

    const { messageId, attempt } = await sendTextViaWapiWithFallback(instanceId, instanceToken, remoteJid, message, 1);
    console.log(`[Bot] send-text response: msgId=${messageId}, attempt=${attempt}`);
    return messageId;
  } catch (e) {
    console.error(`[Bot] send-text exception:`, e);
    return null;
  }
}

// ============= INTERACTIVE MESSAGING (Mega Magic pilot) =============

/** Parse numbered emoji options from bot question text.
 *  Returns { body, options } where body is the text before options,
 *  and options is the list of { id, label } extracted from emoji lines. */
function parseNumberedOptions(text: string): { body: string; options: { id: string; label: string }[] } | null {
  const lines = text.split('\n');
  const bodyLines: string[] = [];
  const options: { id: string; label: string }[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { bodyLines.push(line); continue; }
    
    // Try emoji keycap: "1️⃣ - Já sou cliente" or "1️⃣ Já sou cliente"
    const emojiNum = emojiDigitsToNumber(trimmed);
    if (emojiNum !== null) {
      const label = trimmed
        .replace(/🔟/g, '')
        .replace(/[\d]\uFE0F?\u20E3/g, '')
        .replace(/^\s*[-\.]\s*/, '')
        .trim();
      if (label) {
        options.push({ id: String(emojiNum), label });
        continue;
      }
    }
    
    // Try plain number: "*1* - Label" or "1 - Label"
    const match = trimmed.match(/^\*?(\d+)\*?\s*[-\.]\s*(.+)$/);
    if (match) {
      options.push({ id: match[1], label: match[2].trim() });
      continue;
    }
    
    bodyLines.push(line);
  }
  
  if (options.length < 2) return null;
  
  // Clean trailing empty lines from body
  while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) {
    bodyLines.pop();
  }
  
  return { body: bodyLines.join('\n').trim(), options };
}

/** Send interactive message (buttons or list) for Mega Magic Z-API, fallback to text. */

async function sendWithDelay(
  instance: { id: string; instance_id: string; instance_token: string; provider?: string },
  remoteJid: string,
  message: string,
  delaySeconds?: number | null
): Promise<string | null> {
  const waitMs = Math.max(0, delaySeconds ?? 0) * 1000;
  if (waitMs > 0) await delay(waitMs);
  return sendInteractiveOrText(instance.instance_id, instance.instance_token, remoteJid, message, instance);
}

async function sendInteractiveOrText(
  instanceId: string,
  instanceToken: string,
  remoteJid: string,
  message: string,
  instance: { id: string; provider?: string }
): Promise<string | null> {
  // Only apply to Z-API instances enabled for interactive messaging
  if (!INTERACTIVE_ENABLED_INSTANCES.has(instance.id) || _activeProvider !== 'zapi') {
    return sendBotMessage(instanceId, instanceToken, remoteJid, message);
  }
  
  const parsed = parseNumberedOptions(message);
  if (!parsed || parsed.options.length > 10) {
    // 11+ options or parse failed: send as text
    return sendBotMessage(instanceId, instanceToken, remoteJid, message);
  }
  
  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  
  try {
    if (parsed.options.length <= 3) {
      // 2-3 options: send as buttons
      console.log(`[Bot-Interactive] Sending ${parsed.options.length} buttons to ${phone}`);
      const res = await zapiRequest(instanceId, instanceToken, _activeClientToken, 'send-button-actions', 'POST', {
        phone,
        message: parsed.body,
        buttonActions: parsed.options.map(opt => ({
          id: opt.id,
          type: 'REPLY',
          label: opt.label,
        })),
      });
      if (res.ok) {
        const msgId = res.data ? ((res.data as JsonRecord).zaapId || (res.data as JsonRecord).zapiMessageId || (res.data as JsonRecord).messageId) as string || null : null;
        console.log(`[Bot-Interactive] Button send OK, msgId=${msgId}`);
        return msgId;
      }
      console.warn(`[Bot-Interactive] Button send failed, falling back to text: ${res.error}`);
    } else {
      // 4-10 options: send as option list
      console.log(`[Bot-Interactive] Sending option list (${parsed.options.length} items) to ${phone}`);
      const res = await zapiRequest(instanceId, instanceToken, _activeClientToken, 'send-option-list', 'POST', {
        phone,
        message: parsed.body,
        optionList: {
          title: 'Opções',
          buttonLabel: 'Ver opções',
          options: parsed.options.map(opt => ({
            id: opt.id,
            title: opt.label,
          })),
        },
      });
      if (res.ok) {
        const msgId = res.data ? ((res.data as JsonRecord).zaapId || (res.data as JsonRecord).zapiMessageId || (res.data as JsonRecord).messageId) as string || null : null;
        console.log(`[Bot-Interactive] List send OK, msgId=${msgId}`);
        return msgId;
      }
      console.warn(`[Bot-Interactive] List send failed, falling back to text: ${res.error}`);
    }
  } catch (e) {
    console.error(`[Bot-Interactive] Exception, falling back to text:`, e);
  }
  
  // Fallback: send as plain text
  return sendBotMessage(instanceId, instanceToken, remoteJid, message);
}

async function sendBotImage(instanceId: string, instanceToken: string, remoteJid: string, imageUrl: string, caption: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');

    if (_activeProvider === 'zapi') {
      const res = await zapiRequest(instanceId, instanceToken, _activeClientToken, 'send-image', 'POST', { phone, image: imageUrl, caption: caption || '' });
      const msgId = res.data ? ((res.data as JsonRecord).zapiMessageId || (res.data as JsonRecord).messageId) as string || null : null;
      return msgId;
    }

    // W-API: Download image and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
      bin += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const ct = imgRes.headers.get('content-type') || 'image/jpeg';
    const base64 = `data:${ct};base64,${btoa(bin)}`;
    const res = await fetch(`${WAPI_BASE_URL}/message/send-image?instanceId=${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instanceToken}` },
      body: JSON.stringify({ phone, image: base64, caption }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    return r.messageId || null;
  } catch (e) {
    console.error(`[Bot] send-image exception:`, e);
    return null;
  }
}

async function sendBotVideo(instanceId: string, instanceToken: string, remoteJid: string, videoUrl: string, caption: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');

    if (_activeProvider === 'zapi') {
      const res = await zapiRequest(instanceId, instanceToken, _activeClientToken, 'send-video', 'POST', { phone, video: videoUrl, caption: caption || '' });
      const msgId = res.data ? ((res.data as JsonRecord).zapiMessageId || (res.data as JsonRecord).messageId) as string || null : null;
      return msgId;
    }

    const res = await fetch(`${WAPI_BASE_URL}/message/send-video?instanceId=${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instanceToken}` },
      body: JSON.stringify({ phone, video: videoUrl, caption }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    return r.messageId || null;
  } catch (e) {
    console.error(`[Bot] send-video exception:`, e);
    return null;
  }
}

async function sendBotDocument(instanceId: string, instanceToken: string, remoteJid: string, docUrl: string, fileName: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
    const ext = docUrl.split('.').pop()?.split('?')[0] || 'pdf';

    if (_activeProvider === 'zapi') {
      const res = await zapiRequest(instanceId, instanceToken, _activeClientToken, `send-document/${ext}`, 'POST', { phone, document: docUrl, fileName });
      const msgId = res.data ? ((res.data as JsonRecord).zapiMessageId || (res.data as JsonRecord).messageId) as string || null : null;
      return msgId;
    }

    const res = await fetch(`${WAPI_BASE_URL}/message/send-document?instanceId=${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instanceToken}` },
      body: JSON.stringify({ phone, document: docUrl, fileName, extension: ext }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    return r.messageId || null;
  } catch (e) {
    console.error(`[Bot] send-document exception:`, e);
    return null;
  }
}


async function processFlowBuilderMessage(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string; provider?: string; client_token?: string | null },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null },
  content: string,
  contactPhone: string,
  contactName: string | null
) {
  const companyId = instance.company_id;
  const isPilot = isMegaMagicPilotPhone(instance.id, contactPhone);
  
  console.log(`[FlowBuilder] ========== PROCESSING MESSAGE ==========`);
  console.log(`[FlowBuilder] Company: ${companyId}, Conv: ${conv.id}, Phone: ${contactPhone}`);
  console.log(`[FlowBuilder] Content: "${content}", BotStep: ${conv.bot_step}, BotEnabled: ${conv.bot_enabled}`);

  // Guard: skip Flow Builder if bot was disabled (human takeover or lost lead)
  if (conv.bot_step === 'human_takeover' || (conv.bot_enabled === false && !isPilot)) {
    console.log(`[FlowBuilder] Bot disabled (step: ${conv.bot_step}, enabled: ${conv.bot_enabled}), skipping`);
    return;
  }
  
  // ── SANDBOX: número-piloto usa o Fluxo Comercial V2 ────────────
  let flow: { id: string; name: string } | null = null;

  if (isPilot) {
    console.log(`[FlowBuilder] 🧪 SANDBOX: número-piloto detectado (${contactPhone}) → buscando Fluxo V2`);
    const { data: v2Flow } = await supabase
      .from('conversation_flows')
      .select('id, name')
      .eq('company_id', companyId)
      .ilike('name', '%V2%MODO TESTE%')
      .eq('is_active', true)
      .maybeSingle();

    if (v2Flow) {
      flow = v2Flow;
      console.log(`[FlowBuilder] 🧪 SANDBOX: usando fluxo V2 "${v2Flow.name}" (${v2Flow.id})`);
    } else {
      console.log(`[FlowBuilder] 🧪 SANDBOX: fluxo V2 não encontrado, caindo no fluxo padrão`);
    }
  }

  // 1. Find the default active flow for this company (se não for piloto ou V2 não existir)
  if (!flow) {
    const { data: defaultFlow, error: flowErr } = await supabase
      .from('conversation_flows')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (flowErr || !defaultFlow) {
      console.log(`[FlowBuilder] ❌ No active default flow found for company ${companyId}. Error: ${flowErr?.message || 'no flow'}`);
      return;
    }
    flow = defaultFlow;
  }
  // ─────────────────────────────────────────────────────────────────

  const flowId = flow.id;
  console.log(`[FlowBuilder] ✅ Found flow: "${flow.name}" (${flowId})`);
  
  // 2. Fetch all nodes, edges, and options for this flow
  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from('flow_nodes').select('*').eq('flow_id', flowId),
    supabase.from('flow_edges').select('*').eq('flow_id', flowId),
  ]);
  
  const nodes = nodesRes.data || [];
  const edges = edgesRes.data || [];
  
  console.log(`[FlowBuilder] Loaded ${nodes.length} nodes, ${edges.length} edges`);
  
  if (nodes.length === 0) {
    console.log(`[FlowBuilder] ❌ Flow ${flowId} has no nodes`);
    return;
  }
  
  // 3. Fetch or create lead state
  let { data: state } = await supabase
    .from('flow_lead_state')
    .select('*')
    .eq('conversation_id', conv.id)
    .eq('flow_id', flowId)
    .maybeSingle();

  const shouldRestartCompletedPilotFlow = isPilot && (
    conv.bot_enabled === false ||
    ['complete_final', 'flow_complete', 'flow_handoff', 'flow_ai_disabled', 'flow_no_followup', 'transferred'].includes(conv.bot_step || '')
  );

  if (shouldRestartCompletedPilotFlow) {
    console.log(`[FlowBuilder] 🧪 Resetting completed flow state for pilot conversation ${conv.id}`);

    const { error: resetErr } = await supabase
      .from('flow_lead_state')
      .delete()
      .eq('conversation_id', conv.id);

    if (resetErr) {
      console.error(`[FlowBuilder] Failed to reset pilot state for ${conv.id}: ${resetErr.message}`);
    } else {
      state = null;
      await supabase.from('wapi_conversations').update({
        bot_enabled: true,
        bot_step: null,
      }).eq('id', conv.id);
      conv.bot_enabled = true;
      conv.bot_step = null;
    }
  }
  
  const startNode = nodes.find(n => n.node_type === 'start');
  if (!startNode) {
    console.log(`[FlowBuilder] ❌ No start node in flow ${flowId}`);
    return;
  }
  
  console.log(`[FlowBuilder] Lead state: ${state ? `exists (node: ${state.current_node_id}, waiting: ${state.waiting_for_reply})` : 'NEW (first message)'}`);
  
  // 4. If no state, initialize at start node and send first message chain
  if (!state) {
    // ✅ GUARD: Check if conversation already completed a flow before (any flow)
    // This prevents restarting the flow if the default flow changed or state was somehow lost
    const { data: anyCompletedState } = await supabase
      .from('flow_lead_state')
      .select('id, current_node_id, waiting_for_reply')
      .eq('conversation_id', conv.id)
      .eq('waiting_for_reply', false)
      .limit(1)
      .maybeSingle();
    
    if (anyCompletedState) {
      console.log(`[FlowBuilder] ⛔ Conversation ${conv.id} already completed a flow (state: ${anyCompletedState.id}). Not restarting.`);
      return;
    }
    
    console.log(`[FlowBuilder] 🆕 Initializing flow state for conversation ${conv.id}`);
    
    // Create state at start node
    const { data: newState, error: stateErr } = await supabase
      .from('flow_lead_state')
      .insert({
        conversation_id: conv.id,
        flow_id: flowId,
        current_node_id: startNode.id,
        collected_data: {},
        waiting_for_reply: false,
      })
      .select()
      .single();
    
    if (stateErr) {
      console.error(`[FlowBuilder] Error creating state:`, stateErr.message);
      return;
    }
    
    state = newState;
    
    // Follow edges from start node to first real node
    await advanceFlowFromNode(supabase, instance, conv, state, startNode, nodes, edges, contactPhone, contactName, null);
    return;
  }
  
  // ✅ GUARD: If state exists but NOT waiting for reply, flow is done - don't process
  if (!state.waiting_for_reply) {
    console.log(`[FlowBuilder] ⛔ Flow already completed for conversation ${conv.id} (waiting_for_reply=false). Ignoring message.`);
    return;
  }
  
  // 5. If waiting_for_reply, process the user's response
  if (state.waiting_for_reply && state.current_node_id) {
    const currentNode = nodes.find(n => n.id === state.current_node_id);
    if (!currentNode) {
      console.log(`[FlowBuilder] Current node ${state.current_node_id} not found`);
      return;
    }
    
    console.log(`[FlowBuilder] 💬 Processing reply for node "${currentNode.title}" (${currentNode.node_type}), extract_field: ${currentNode.extract_field || 'none'}`);
    
    const collectedData = (state.collected_data || {}) as Record<string, string>;

    // ── QUALIFY node: use OpenAI to classify free-text response ─────────────
    if (currentNode.node_type === 'qualify') {
      const { data: qualifyOptions } = await supabase
        .from('flow_node_options')
        .select('*')
        .eq('node_id', currentNode.id)
        .order('display_order', { ascending: true });

      if (!qualifyOptions || qualifyOptions.length === 0) {
        // No options configured - just save raw and advance
        if (currentNode.extract_field) {
          collectedData[currentNode.extract_field] = content.trim();
          await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
        }
        const anyEdge = edges.find(e => e.source_node_id === currentNode.id);
        if (anyEdge) {
          const targetNode = nodes.find(n => n.id === anyEdge.target_node_id);
          if (targetNode) await advanceFlowFromNode(supabase, instance, conv, state, targetNode, nodes, edges, contactPhone, contactName, collectedData);
        }
        return;
      }

      // Build options list for OpenAI
      const optionsList = qualifyOptions.map((o, i) => `${i + 1}. value="${o.value}" label="${o.label}"`).join('\n');
      const qualifyContext = (currentNode.action_config as JsonRecord)?.qualify_context as string || '';
      
      console.log(`[FlowBuilder] 🧠 Qualifying response via OpenAI. Options: ${qualifyOptions.map(o => o.label).join(', ')}`);

      let matchedOptionValue: string | null = null;
      let matchedOptionLabel: string | null = null;

      try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (OPENAI_API_KEY) {
          const systemPrompt = `Você é um classificador de respostas de leads de buffet. Dado o texto do lead, identifique qual opção melhor representa a resposta.${qualifyContext ? ` Contexto: ${qualifyContext}.` : ''}
Retorne APENAS o value da opção escolhida, sem explicação, sem aspas, sem pontuação adicional.
Se não conseguir classificar com certeza, retorne a opção mais próxima.`;
          
          const userPrompt = `Opções disponíveis:\n${optionsList}\n\nResposta do lead: "${content.trim()}"\n\nRetorne apenas o value da opção correspondente:`;
          
          const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: 50,
              temperature: 0,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const aiValue = aiData.choices?.[0]?.message?.content?.trim().toLowerCase();
            console.log(`[FlowBuilder] 🧠 OpenAI classify result: "${aiValue}"`);

            // Log AI usage
            if (aiData.usage) {
              try {
                const pt = aiData.usage.prompt_tokens || 0;
                const ct = aiData.usage.completion_tokens || 0;
                await supabase.from('ai_usage_logs').insert({
                  company_id: companyId,
                  function_name: 'wapi-webhook',
                  model: 'gpt-4o-mini',
                  prompt_tokens: pt, completion_tokens: ct,
                  total_tokens: aiData.usage.total_tokens || 0,
                  estimated_cost_usd: (pt * 0.15 + ct * 0.6) / 1_000_000,
                });
              } catch (logErr) { console.error('AI usage log error:', logErr); }
            }
            
            if (aiValue) {
              // Find matching option by value
              const matchedOpt = qualifyOptions.find(o => o.value.toLowerCase() === aiValue || aiValue.includes(o.value.toLowerCase()));
              if (matchedOpt) {
                matchedOptionValue = matchedOpt.value;
                matchedOptionLabel = matchedOpt.label;
                console.log(`[FlowBuilder] 🧠 Classified as: label="${matchedOptionLabel}" value="${matchedOptionValue}"`);
              }
            }
          } else {
            console.error(`[FlowBuilder] OpenAI error: ${aiRes.status}`);
          }
        }
      } catch (e) {
        console.error('[FlowBuilder] OpenAI classify error:', e);
      }

      // Fallback: simple text matching if AI failed
      if (!matchedOptionValue) {
        const lower = content.toLowerCase();
        for (const opt of qualifyOptions) {
          if (lower.includes(opt.label.toLowerCase()) || lower.includes(opt.value.toLowerCase())) {
            matchedOptionValue = opt.value;
            matchedOptionLabel = opt.label;
            break;
          }
        }
      }

      // Use first option as last resort
      if (!matchedOptionValue && qualifyOptions.length > 0) {
        console.log(`[FlowBuilder] 🧠 No match found, using first option as fallback`);
        matchedOptionValue = qualifyOptions[0].value;
        matchedOptionLabel = qualifyOptions[0].label;
      }

      // Save the readable LABEL (not number, not raw input) to collected_data
      if (currentNode.extract_field && matchedOptionLabel) {
        collectedData[currentNode.extract_field] = matchedOptionLabel;
        await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
        state.collected_data = collectedData;
        console.log(`[FlowBuilder] 📝 Qualify saved: ${currentNode.extract_field} = "${matchedOptionLabel}"`);
      }

      // Find the edge for this option
      const matchedOpt = qualifyOptions.find(o => o.value === matchedOptionValue);
      let qualifyEdge = null;
      if (matchedOpt) {
        qualifyEdge = edges.find(e => e.source_node_id === currentNode.id && e.source_option_id === matchedOpt.id);
      }
      // Fallback to any edge from this node
      if (!qualifyEdge) {
        qualifyEdge = edges.find(e => e.source_node_id === currentNode.id);
      }

      if (qualifyEdge) {
        const targetNode = nodes.find(n => n.id === qualifyEdge!.target_node_id);
        if (targetNode) {
          await advanceFlowFromNode(supabase, instance, conv, state, targetNode, nodes, edges, contactPhone, contactName, collectedData);
        }
      } else {
        await supabase.from('flow_lead_state').update({ waiting_for_reply: false }).eq('id', state.id);
      }
      return;
    }
    // ── END QUALIFY ─────────────────────────────────────────────────────────
    
    // Pre-fetch node options to decide validation strategy
    const { data: preCheckOptions } = await supabase
      .from('flow_node_options')
      .select('id')
      .eq('node_id', currentNode.id)
      .limit(1);
    const nodeHasOptions = preCheckOptions && preCheckOptions.length > 0;
    
    // Extract data if needed (for question/action nodes)
    if (currentNode.extract_field) {
      const nameFields = ['nome', 'name', 'nome_lead', 'contact_name', 'customer_name', 'nome_cliente', 'client_name'];
      if (nameFields.includes(currentNode.extract_field)) {
        // Name-specific validation
        const nameValidation = validateName(content);
        if (!nameValidation.valid) {
          const retryMsg = `Hmm, não consegui entender seu nome 🤔 Por favor, digite apenas seu *nome*:`;
          const retryMsgId = `bot_${Date.now()}_retry`;
          await sendBotMessage(instance.instance_id, instance.instance_token, contactPhone, retryMsg);
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id,
            message_id: retryMsgId,
            content: retryMsg,
            message_type: 'text',
            from_me: true,
            timestamp: new Date().toISOString(),
            status: 'sent',
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          console.log(`[FlowBuilder] ❌ Name validation failed for "${content}" — re-asking`);
          return;
        }
        content = nameValidation.value!;
        console.log(`[FlowBuilder] ✅ Name validated & normalized: "${content}"`);
      } else if (!nodeHasOptions) {
        // Generic free-text validation ONLY for open-ended fields WITHOUT options
        // Skip this when node has options — the option matching logic below handles validation
        const freeTextValidation = validateFreeText(content);
        if (!freeTextValidation.valid) {
          const retryMsg = freeTextValidation.error || 'Por favor, responda a pergunta anterior 😊';
          const retryMsgId = `bot_${Date.now()}_retry`;
          await sendBotMessage(instance.instance_id, instance.instance_token, contactPhone, retryMsg);
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id,
            message_id: retryMsgId,
            content: retryMsg,
            message_type: 'text',
            from_me: true,
            timestamp: new Date().toISOString(),
            status: 'sent',
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          console.log(`[FlowBuilder] ❌ Free-text validation failed for field "${currentNode.extract_field}": "${content}" — re-asking`);
          return;
        }
      }
      // For nodes WITH options, the extract_field value will be saved AFTER option matching below
      if (!nodeHasOptions) {
        collectedData[currentNode.extract_field] = content.trim();
        console.log(`[FlowBuilder] 📝 Extracted: ${currentNode.extract_field} = "${content.trim()}"`);
      }
    }
    
    // Update collected_data
    await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
    state.collected_data = collectedData;
    
    // Find matching edge from current node
    // First check if this is a question node with options
    const { data: nodeOptions } = await supabase
      .from('flow_node_options')
      .select('*')
      .eq('node_id', currentNode.id)
      .order('display_order', { ascending: true });
    
    let matchedEdge = null;
    
    console.log(`[FlowBuilder] Node has ${nodeOptions?.length || 0} options`);
    
    // Timer nodes: any reply triggers "responded" path automatically
    if (currentNode.node_type === 'timer' && nodeOptions && nodeOptions.length > 0) {
      const respondedOpt = nodeOptions.find((o: any) => o.value === 'responded');
      if (respondedOpt) {
        const respondedEdge = edges.find(e => e.source_node_id === currentNode.id && e.source_option_id === respondedOpt.id);
        if (respondedEdge) {
          const targetNode = nodes.find(n => n.id === respondedEdge.target_node_id);
          if (targetNode) {
            console.log(`[FlowBuilder] ⏱️ Timer: Lead responded, following "responded" path`);
            await advanceFlowFromNode(supabase, instance, conv, state, targetNode, nodes, edges, contactPhone, contactName, collectedData);
          }
          return;
        }
      }
    }
    
    if (nodeOptions && nodeOptions.length > 0) {
      // Try to match by number (e.g., user types "1", "2", etc.)
      const userChoice = content.trim();
      // Collapse digits+separators (e.g. "1 1" → "11", "1-2" → "12") to handle
      // months like Nov/Dez represented as two keycap emojis (1️⃣1️⃣ / 1️⃣2️⃣).
      let normalizedChoice = userChoice;
      if (/^[\d][\d\s\-,./]*$/.test(userChoice)) {
        const collapsed = userChoice.replace(/[\s\-,./]+/g, '');
        if (/^\d+$/.test(collapsed) && collapsed !== userChoice) {
          console.log(`[FlowBuilder] Collapsed digits "${userChoice}" → "${collapsed}"`);
          normalizedChoice = collapsed;
        } else if (/^\d+$/.test(collapsed)) {
          normalizedChoice = collapsed;
        }
      }
      const numMatch = normalizedChoice.match(/^\d+$/);

      if (numMatch) {
        const choiceNum = parseInt(numMatch[0]);
        console.log(`[FlowBuilder] User chose number: ${choiceNum} (valid range: 1-${nodeOptions.length})`);
        if (choiceNum >= 1 && choiceNum <= nodeOptions.length) {
          const selectedOption = nodeOptions[choiceNum - 1];
          // Find edge for this option
          matchedEdge = edges.find(e => e.source_node_id === currentNode.id && e.source_option_id === selectedOption.id);
          
          // Store the LABEL (readable text) not the number or raw value
          if (currentNode.extract_field) {
            collectedData[currentNode.extract_field] = selectedOption.label;
            await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
            console.log(`[FlowBuilder] 📝 Saved label for choice ${choiceNum}: ${currentNode.extract_field} = "${selectedOption.label}"`);
          }
        }
      }

      if (!matchedEdge) {
        const selectedOption = matchFlowOptionByReply(userChoice, nodeOptions as Array<{ id: string; label: string; value: string }>);
        if (selectedOption) {
          matchedEdge = edges.find(e => e.source_node_id === currentNode.id && e.source_option_id === selectedOption.id);

          if (currentNode.extract_field) {
            collectedData[currentNode.extract_field] = selectedOption.label;
            await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
            console.log(`[FlowBuilder] 📝 Saved label for text reply: ${currentNode.extract_field} = "${selectedOption.label}"`);
          }

          console.log(`[FlowBuilder] ✅ Matched option by text reply: "${userChoice}" → "${selectedOption.label}"`);
        }
      }
      
      if (!matchedEdge) {
      // Try AI interpretation if enabled
        if (currentNode.allow_ai_interpretation) {
          // Use real LLM classification (same logic as qualify node)
          const optionsList = nodeOptions.map((o: any, i: number) => `${i + 1}. value="${o.value}" label="${o.label}"`).join('\n');
          const qualifyContext = (currentNode.action_config as JsonRecord)?.qualify_context as string || '';

          let aiMatchedValue: string | null = null;
          let aiMatchedLabel: string | null = null;

          try {
            const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
            if (OPENAI_API_KEY) {
              const systemPrompt = `Você é um classificador de respostas de leads de buffet. Dado o texto do lead, identifique qual opção melhor representa a resposta.${qualifyContext ? ` Contexto: ${qualifyContext}.` : ''}
Retorne APENAS o value da opção escolhida, sem explicação, sem aspas, sem pontuação adicional.
Se não conseguir classificar com certeza, retorne a opção mais próxima.`;
              const userPrompt = `Opções disponíveis:\n${optionsList}\n\nResposta do lead: "${content.trim()}"\n\nRetorne apenas o value da opção correspondente:`;

              const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                  ],
                  max_tokens: 50,
                  temperature: 0,
                }),
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const aiValue = aiData.choices?.[0]?.message?.content?.trim().toLowerCase();
                console.log(`[FlowBuilder] 🧠 AI interpretation result: "${aiValue}"`);

                // Log AI usage
                if (aiData.usage) {
                  try {
                    const pt = aiData.usage.prompt_tokens || 0;
                    const ct = aiData.usage.completion_tokens || 0;
                    await supabase.from('ai_usage_logs').insert({
                      company_id: instance.company_id,
                      function_name: 'wapi-webhook',
                      model: 'gpt-4o-mini',
                      prompt_tokens: pt, completion_tokens: ct,
                      total_tokens: aiData.usage.total_tokens || 0,
                      estimated_cost_usd: (pt * 0.15 + ct * 0.6) / 1_000_000,
                    });
                  } catch (logErr) { console.error('AI usage log error:', logErr); }
                }
                if (aiValue) {
                  const matchedOpt = nodeOptions.find((o: any) => o.value.toLowerCase() === aiValue || aiValue.includes(o.value.toLowerCase()));
                  if (matchedOpt) {
                    aiMatchedValue = matchedOpt.value;
                    aiMatchedLabel = matchedOpt.label;
                  }
                }
              }
            }
          } catch (e) {
            console.error('[FlowBuilder] AI interpretation error:', e);
          }

          // Fallback: simple text matching if AI failed
          if (!aiMatchedValue) {
            const lower = content.toLowerCase();
            for (const opt of nodeOptions) {
              if (lower.includes(opt.label.toLowerCase()) || lower.includes(opt.value.toLowerCase())) {
                aiMatchedValue = opt.value;
                aiMatchedLabel = opt.label;
                break;
              }
            }
          }

          if (aiMatchedValue) {
            const aiOpt = nodeOptions.find((o: any) => o.value === aiMatchedValue);
            if (aiOpt) {
              matchedEdge = edges.find((e: any) => e.source_node_id === currentNode.id && e.source_option_id === aiOpt.id);
              if (matchedEdge && currentNode.extract_field && aiMatchedLabel) {
                collectedData[currentNode.extract_field] = aiMatchedLabel;
                await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
                console.log(`[FlowBuilder] 📝 AI interpreted: ${currentNode.extract_field} = "${aiMatchedLabel}"`);
              }
            }
          }
        }
        
        // If still no match, re-send the question with options
        if (!matchedEdge) {
          console.log(`[FlowBuilder] ⚠️ No option matched for input "${content}". Re-sending question.`);
          
          // Register invalid reply in lead_history for score penalty
          if (conv.lead_id) {
            await supabase.from('lead_history').insert({
              lead_id: conv.lead_id,
              action: 'bot_invalid_reply',
              new_value: content.substring(0, 200),
              old_value: currentNode.title,
              company_id: instance.company_id,
            });
            console.log(`[FlowBuilder] Registered bot_invalid_reply for lead ${conv.lead_id}`);
          }
          
          const optionsText = nodeOptions.map((o, i) => `*${i + 1}* - ${o.label}`).join('\n');
          const retryMsg = `Por favor, responda com o *número* da opção desejada:\n\n${optionsText}`;
          
          const retryMsgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, retryMsg);
          if (retryMsgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id, message_id: retryMsgId, from_me: true,
              message_type: 'text', content: retryMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: companyId,
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
          return;
        }
      }
    } else {
      // No options - find any edge from this node (fallback/default edge)
      matchedEdge = edges.find(e => e.source_node_id === currentNode.id && !e.source_option_id);
      if (!matchedEdge) {
        matchedEdge = edges.find(e => e.source_node_id === currentNode.id);
      }
    }
    
    if (!matchedEdge) {
      console.log(`[FlowBuilder] ❌ No matching edge from node "${currentNode.title}" (${currentNode.id}). Flow ends here.`);
      await supabase.from('flow_lead_state').update({ waiting_for_reply: false }).eq('id', state.id);
      return;
    }
    
    // Find target node
    const targetNode = nodes.find(n => n.id === matchedEdge!.target_node_id);
    if (!targetNode) {
      console.log(`[FlowBuilder] ❌ Target node ${matchedEdge.target_node_id} not found in flow`);
      return;
    }
    
    console.log(`[FlowBuilder] ➡️ Matched edge → advancing to "${targetNode.title}" (${targetNode.node_type})`);
    console.log(`[FlowBuilder] Collected data so far: ${JSON.stringify(collectedData)}`);
    
    // Advance to target node
    await advanceFlowFromNode(supabase, instance, conv, state, targetNode, nodes, edges, contactPhone, contactName, collectedData);
  }
}

// Generic free-text validation: rejects blank/very short answers and obvious non-answers
function validateFreeText(input: string): { valid: boolean; error?: string } {
  const text = input.trim();
  if (text.length <= 1) {
    return { valid: false, error: 'Por favor, digite uma resposta válida 😊' };
  }
  const nonAnswerWords = [
    'oi', 'olá', 'ola', 'hey', 'hello',
    'bom dia', 'boa tarde', 'boa noite',
    'não sei', 'nao sei', 'talvez', 'sei lá', 'sei la',
    'quero', 'queria', 'gostaria', 'preciso',
    'sim', 'não', 'nao', 'ok', 'tá', 'ta', 'blz',
    'ajuda', 'atendente', 'humano',
  ];
  const lower = text.toLowerCase();
  const matched = nonAnswerWords.find(w => {
    const regex = new RegExp(`^${w}$`, 'i');
    return regex.test(lower);
  });
  if (matched) {
    return { valid: false, error: `Não entendi sua resposta 🤔 Por favor, responda a pergunta anterior:` };
  }
  return { valid: true };
}


async function advanceFlowFromNode(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null },
  state: { id: string; collected_data: unknown },
  currentNode: { id: string; node_type: string; title: string; message_template: string | null; action_type: string | null; action_config: unknown; extract_field: string | null; require_extraction: boolean | null },
  allNodes: typeof currentNode[],
  allEdges: { id: string; source_node_id: string; target_node_id: string; source_option_id: string | null; condition_type: string | null; condition_value: string | null }[],
  contactPhone: string,
  contactName: string | null,
  collectedData: Record<string, string> | null
) {
  const data = collectedData || (state.collected_data as Record<string, string>) || {};
  
  console.log(`[FlowBuilder] ▶️ Advancing to node: "${currentNode.title}" (type: ${currentNode.node_type}, id: ${currentNode.id})`);
  console.log(`[FlowBuilder] Data so far: ${JSON.stringify(data)}`);

  // Buscar nome da empresa para templates
  let companyName = '';
  try {
    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', instance.company_id)
      .single();
    companyName = companyData?.name || '';
  } catch (_) { /* silently ignore */ }
  
  // Replace variables in message template
  // Supports both {{key}} and {key}, plus aliases for template-friendly names
  const replaceVars = (text: string) => {
    const aliasMap: Record<string, string> = {
      nome: String(data.customer_name || contactName || contactPhone || ''),
      mes: String(data.event_date || ''),
      convidados: String(data.guest_count || ''),
      dia: String(data.visit_day || ''),
      // Aliases para nome da empresa (suportando hífen e variações)
      'nome-empresa': companyName,
      'nome_empresa': companyName,
      empresa: companyName,
      buffet: companyName,
    };

    let result = text;

    // Merge collected data + aliases (aliases take precedence for template keys)
    const allVars: Record<string, string> = { ...data };
    for (const [k, v] of Object.entries(aliasMap)) {
      allVars[k] = v;
    }

    // First replace {{key}} (double braces), then {key} (single braces)
    for (const [key, value] of Object.entries(allVars)) {
      const safeValue = String(value ?? '');
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), safeValue);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), safeValue);
    }
    return result;
  };
  
  switch (currentNode.node_type) {
    case 'start': {
      // Start node - just follow to next node
      console.log(`[FlowBuilder] ⏩ Start node - auto-advancing`);
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        } else {
          console.log(`[FlowBuilder] ❌ Next node not found: ${nextEdge.target_node_id}`);
        }
      } else {
        console.log(`[FlowBuilder] ❌ No edge from start node`);
      }
      break;
    }
    
    case 'message': {
      // Send message and auto-advance to next node
      if (currentNode.message_template) {
        const msg = replaceVars(currentNode.message_template);
        console.log(`[FlowBuilder] 📤 Sending message: "${msg.substring(0, 80)}..."`);
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
        if (msgId) {
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
        }
        
        // Update conversation
        await supabase.from('wapi_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_content: msg.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);
      }
      
      // Auto-advance to next node
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          // Small delay between messages
          await new Promise(r => setTimeout(r, 2000));
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        }
      } else {
        // No more edges - end
        await supabase.from('flow_lead_state').update({ current_node_id: currentNode.id, waiting_for_reply: false }).eq('id', state.id);
      }
      break;
    }
    
    case 'question': {
      // Send question with options and wait for reply
      const { data: options } = await supabase
        .from('flow_node_options')
        .select('*')
        .eq('node_id', currentNode.id)
        .order('display_order', { ascending: true });
      
      console.log(`[FlowBuilder] ❓ Question node with ${options?.length || 0} options, extract_field: ${currentNode.extract_field || 'none'}`);
      
      let msg = currentNode.message_template ? replaceVars(currentNode.message_template) : currentNode.title;
      
      if (options && options.length > 0) {
        const optionsText = options.map((o, i) => `*${i + 1}* - ${o.label}`).join('\n');
        msg += `\n\n${optionsText}`;
      }
      
      console.log(`[FlowBuilder] 📤 Sending question: "${msg.substring(0, 80)}..."`);
      const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
      if (msgId) {
        await supabase.from('wapi_messages').upsert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: 'text', content: msg, status: 'sent',
          timestamp: new Date().toISOString(), company_id: instance.company_id,
        }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
      }
      
      // Update state to wait for reply
      await supabase.from('flow_lead_state').update({
        current_node_id: currentNode.id,
        waiting_for_reply: true,
        last_sent_at: new Date().toISOString(),
      }).eq('id', state.id);
      
      // Update conversation
      await supabase.from('wapi_conversations').update({
        bot_step: `flow_${currentNode.id}`,
        last_message_at: new Date().toISOString(),
        last_message_content: msg.substring(0, 100),
        last_message_from_me: true,
      }).eq('id', conv.id);
      break;
    }
    
    case 'action': {
      const actionType = currentNode.action_type;
      const actionConfig = (currentNode.action_config || {}) as JsonRecord;
      
      console.log(`[FlowBuilder] Executing action: ${actionType}`);
      
      // Helper to send optional message and save it
      const sendActionMessage = async () => {
        if (currentNode.message_template) {
          const msg = replaceVars(currentNode.message_template);
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
          if (msgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id, message_id: msgId, from_me: true,
              message_type: 'text', content: msg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: instance.company_id,
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
          await supabase.from('wapi_conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_content: msg.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', conv.id);
        }
      };
      
      // Helper to auto-advance to next node
      const autoAdvance = async () => {
        const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
        if (nextEdge) {
          const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
          if (nextNode) {
            await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
          }
        } else {
          await supabase.from('flow_lead_state').update({ current_node_id: currentNode.id, waiting_for_reply: false }).eq('id', state.id);
        }
      };
      
      // Helper to save a media message to DB
      const saveMediaMsg = async (msgId: string, type: string, content: string, mediaUrl?: string) => {
        await supabase.from('wapi_messages').upsert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: type, content, media_url: mediaUrl || null,
          status: 'sent', timestamp: new Date().toISOString(), company_id: instance.company_id,
        }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
      };
      
      switch (actionType) {
        case 'handoff': {
          // Disable bot and notify team
          await sendActionMessage();
          
          await supabase.from('wapi_conversations').update({
            bot_enabled: false,
            bot_step: 'flow_handoff',
            last_message_at: new Date().toISOString(),
            last_message_from_me: true,
          }).eq('id', conv.id);
          
          await supabase.from('flow_lead_state').update({
            current_node_id: currentNode.id,
            waiting_for_reply: false,
          }).eq('id', state.id);
          
          // Create notification (scoped to company)
          try {
            const unitLower = instance.unit?.toLowerCase() || '';
            const unitPermission = `leads.unit.${unitLower}`;
            const targetUserIds = await getCompanyNotificationTargets(supabase, instance.company_id, unitPermission);
            
            const notifications = targetUserIds.map(userId => ({
              user_id: userId,
              company_id: instance.company_id,
              type: 'flow_handoff',
              title: '🔄 Lead transferido pelo Flow Builder',
              message: `${data.customer_name || data.nome || contactName || contactPhone} foi transferido para atendimento humano.`,
              data: { conversation_id: conv.id, contact_phone: contactPhone, unit: instance.unit },
              read: false,
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
            }
          } catch (e) {
            console.error('[FlowBuilder] Notification error:', e);
          }
          break;
        }
        
        case 'extract_data': {
          // Data extraction already happened via extract_field. Now sync to CRM.
          await syncCollectedDataToLead(supabase, instance, conv, data, contactPhone, contactName);
          await autoAdvance();
          break;
        }
        
        case 'schedule_visit': {
          await supabase.from('wapi_conversations').update({ has_scheduled_visit: true }).eq('id', conv.id);
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({ status: 'em_contato' }).eq('id', conv.lead_id);
          }
          await sendActionMessage();
          await autoAdvance();
          break;
        }
        
        case 'send_media': {
          // Send photo gallery from sales_materials
          console.log(`[FlowBuilder] 📸 Sending photo gallery`);
          await sendActionMessage();
          
          const unit = instance.unit;
          if (unit) {
            const { data: photoMats } = await supabase.from('sales_materials')
              .select('photo_urls, name')
              .eq('company_id', instance.company_id)
              .eq('type', 'photo_collection')
              .eq('unit', unit)
              .eq('is_active', true)
              .order('sort_order')
              .limit(1);
            
            const photos = photoMats?.[0]?.photo_urls || [];
            if (photos.length > 0) {
              console.log(`[FlowBuilder] Sending ${photos.length} photos`);
              // Send photos (limit concurrency to avoid rate limits)
              for (const photoUrl of photos) {
                const msgId = await sendBotImage(instance.instance_id, instance.instance_token, conv.remote_jid, photoUrl, '');
                if (msgId) await saveMediaMsg(msgId, 'image', '📷', photoUrl);
                await new Promise(r => setTimeout(r, 1500));
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 2000));
          await autoAdvance();
          break;
        }
        
        case 'send_pdf': {
          // Send PDF package matching guest count
          console.log(`[FlowBuilder] 📄 Sending PDF package`);
          
          const unit = instance.unit;
          if (unit) {
            const guestsStr = data.guest_count || data.convidados || '';
            const guestMatch = guestsStr.match(/(\d+)/);
            const guestCount = guestMatch ? parseInt(guestMatch[1]) : null;
            
            const { data: pdfMats } = await supabase.from('sales_materials')
              .select('*')
              .eq('company_id', instance.company_id)
              .eq('type', 'pdf_package')
              .eq('unit', unit)
              .eq('is_active', true)
              .order('guest_count');
            
            let pdfsToSend: typeof pdfMats = [];
            if (pdfMats && pdfMats.length > 0) {
              // Separate universal (guest_count=null) from specific PDFs
              const universalPdfs = pdfMats.filter(p => p.guest_count === null);
              const specificPdfs = pdfMats.filter(p => p.guest_count !== null);
              
              if (universalPdfs.length > 0) {
                // Universal mode: send ALL universal PDFs
                pdfsToSend = universalPdfs;
                console.log(`[FlowBuilder] Found ${universalPdfs.length} universal PDFs`);
              } else if (guestCount && specificPdfs.length > 0) {
                // Specific mode: find matching PDF by guest count
                let matchingPdf = specificPdfs.find(p => p.guest_count === guestCount);
                if (!matchingPdf) {
                  matchingPdf = specificPdfs.find(p => (p.guest_count || 0) >= guestCount) || specificPdfs[specificPdfs.length - 1];
                }
                if (matchingPdf) pdfsToSend = [matchingPdf];
              } else if (specificPdfs.length > 0) {
                pdfsToSend = [specificPdfs[0]];
              }
            }
            
            if (pdfsToSend.length > 0) {
              await sendActionMessage();
              await new Promise(r => setTimeout(r, 1000));
              
              for (const pdf of pdfsToSend) {
                const isPkgImage = /\.(png|jpe?g|webp)(\?|$)/i.test(pdf.file_url || '');
                const cleanName = (pdf.name || 'Pacote').trim();
                if (isPkgImage) {
                  const msgId = await sendBotImage(instance.instance_id, instance.instance_token, conv.remote_jid, pdf.file_url, cleanName);
                  if (msgId) await saveMediaMsg(msgId, 'image', cleanName, pdf.file_url);
                } else {
                  const fileName = (cleanName.replace(/[^a-zA-Z0-9\s\-]/g, '').trim() || 'Pacote') + '.pdf';
                  const msgId = await sendBotDocument(instance.instance_id, instance.instance_token, conv.remote_jid, pdf.file_url, fileName);
                  if (msgId) await saveMediaMsg(msgId, 'document', fileName, pdf.file_url);
                }
                if (pdfsToSend.length > 1) await new Promise(r => setTimeout(r, 1500));
              }
            } else {
              console.log(`[FlowBuilder] No PDF found for unit ${unit}`);
              await sendActionMessage();
            }
          } else {
            await sendActionMessage();
          }
          
          await new Promise(r => setTimeout(r, 2000));
          await autoAdvance();
          break;
        }
        
        case 'send_video': {
          // Send video from sales_materials
          console.log(`[FlowBuilder] 🎬 Sending video`);
          
          const unit = instance.unit;
          if (unit) {
            const { data: videoMats } = await supabase.from('sales_materials')
              .select('file_url, name')
              .eq('company_id', instance.company_id)
              .eq('type', 'video')
              .eq('unit', unit)
              .eq('is_active', true)
              .order('sort_order')
              .limit(1);
            
            if (videoMats && videoMats.length > 0) {
              const video = videoMats[0];
              // Fetch caption
              const { data: captions } = await supabase.from('sales_material_captions')
                .select('caption_text')
                .eq('caption_type', 'video')
                .eq('is_active', true)
                .limit(1);
              const caption = captions?.[0]?.caption_text?.replace(/\{unidade\}/gi, unit) || '';
              
              await sendActionMessage();
              await new Promise(r => setTimeout(r, 1000));
              
              const msgId = await sendBotVideo(instance.instance_id, instance.instance_token, conv.remote_jid, video.file_url, caption);
              if (msgId) await saveMediaMsg(msgId, 'video', caption || '🎬', video.file_url);
            } else {
              await sendActionMessage();
            }
          } else {
            await sendActionMessage();
          }
          
          await new Promise(r => setTimeout(r, 2000));
          await autoAdvance();
          break;
        }
        
        case 'disable_followup': {
          // Disable follow-up messages for this conversation
          console.log(`[FlowBuilder] 🔕 Disabling follow-ups`);
          await sendActionMessage();
          
          // Mark conversation to prevent follow-up-check from triggering
          await supabase.from('wapi_conversations').update({
            bot_step: 'flow_no_followup',
          }).eq('id', conv.id);
          
          await autoAdvance();
          break;
        }
        
        case 'disable_ai': {
          // Disable AI/bot for this conversation
          console.log(`[FlowBuilder] 🤖 Disabling AI`);
          await sendActionMessage();
          
          await supabase.from('wapi_conversations').update({
            bot_enabled: false,
            bot_step: 'flow_ai_disabled',
          }).eq('id', conv.id);
          
          await supabase.from('flow_lead_state').update({
            current_node_id: currentNode.id,
            waiting_for_reply: false,
          }).eq('id', state.id);
          
          // Don't auto-advance - bot is disabled
          break;
        }
        
        case 'mark_existing_customer': {
          // Mark lead as existing customer and notify team
          console.log(`[FlowBuilder] 👤 Marking as existing customer`);
          await sendActionMessage();
          
          // Update lead status to cliente_retorno (consistent with legacy bot)
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({ 
              status: 'cliente_retorno',
              campaign_name: 'WhatsApp (Bot) - Cliente',
              observacoes: 'Cliente existente - retornou pelo WhatsApp',
            }).eq('id', conv.lead_id);
          }
          
          // Notify team (scoped to company)
          try {
            const unitLower = instance.unit?.toLowerCase() || '';
            const unitPermission = `leads.unit.${unitLower}`;
            const targetUserIds = await getCompanyNotificationTargets(supabase, instance.company_id, unitPermission);
            
            const leadName = data.customer_name || data.nome || contactName || contactPhone;
            const notifications = targetUserIds.map(userId => ({
              user_id: userId,
              company_id: instance.company_id,
              type: 'existing_client',
              title: '👤 Cliente existente identificado',
              message: `${leadName} foi marcado como cliente existente pelo Flow Builder.`,
              data: { conversation_id: conv.id, contact_phone: contactPhone, unit: instance.unit },
              read: false,
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
            }
          } catch (e) {
            console.error('[FlowBuilder] Notification error:', e);
          }
          
          await autoAdvance();
          break;
        }
        
        case 'check_party_availability':
        case 'check_visit_availability': {
          // Placeholder: send message and advance (calendar integration TBD)
          console.log(`[FlowBuilder] 📅 ${actionType} (advancing)`);
          await sendActionMessage();
          await autoAdvance();
          break;
        }
        
        case 'ai_response': {
          // Placeholder: send message and advance (AI integration TBD)
          console.log(`[FlowBuilder] 🤖 AI response (advancing)`);
          await sendActionMessage();
          await autoAdvance();
          break;
        }
        
        default: {
          // Unknown action, send message and advance
          await sendActionMessage();
          await autoAdvance();
          break;
        }
      }
      break;
    }
    
    case 'end': {
      console.log(`[FlowBuilder] 🏁 END node reached. Final collected data: ${JSON.stringify(data)}`);
      // Send final message and disable bot
      if (currentNode.message_template) {
        const msg = replaceVars(currentNode.message_template);
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
        if (msgId) {
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
        }
      }
      
      // Sync data to CRM
      await syncCollectedDataToLead(supabase, instance, conv, data, contactPhone, contactName);
      
      // Disable bot
      await supabase.from('wapi_conversations').update({
        bot_enabled: false,
        bot_step: 'flow_complete',
        last_message_at: new Date().toISOString(),
        last_message_from_me: true,
      }).eq('id', conv.id);
      
      await supabase.from('flow_lead_state').update({
        current_node_id: currentNode.id,
        waiting_for_reply: false,
      }).eq('id', state.id);
      break;
    }
    
    case 'delay': {
      // Wait for configured seconds, then auto-advance
      const delaySec = ((currentNode.action_config as JsonRecord)?.delay_seconds as number) || 5;
      console.log(`[FlowBuilder] ⏳ Delay node: waiting ${delaySec}s`);
      await new Promise(r => setTimeout(r, delaySec * 1000));
      
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        }
      }
      break;
    }
    
    case 'timer': {
      // Send optional message and wait for reply with timeout
      console.log(`[FlowBuilder] ⏱️ Timer node: waiting for reply (timeout: ${((currentNode.action_config as JsonRecord)?.timeout_minutes as number) || 10}min)`);
      
      if (currentNode.message_template) {
        const msg = replaceVars(currentNode.message_template);
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
        if (msgId) {
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
        }
        
        await supabase.from('wapi_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_content: msg.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);
      }
      
      // Set state to wait for reply
      await supabase.from('flow_lead_state').update({
        current_node_id: currentNode.id,
        waiting_for_reply: true,
        last_sent_at: new Date().toISOString(),
      }).eq('id', state.id);
      
      await supabase.from('wapi_conversations').update({
        bot_step: `flow_timer_${currentNode.id}`,
      }).eq('id', conv.id);
      break;
    }
    
    case 'qualify': {
      // Qualify node: send the question and wait for free-text reply
      // AI classification happens when the user replies (in processFlowBuilderMessage)
      console.log(`[FlowBuilder] 🧠 Qualify node: sending question, waiting for free-text reply`);
      
      let msg = currentNode.message_template ? replaceVars(currentNode.message_template) : currentNode.title;
      
      console.log(`[FlowBuilder] 📤 Sending qualify question: "${msg.substring(0, 80)}..."`);
      const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
      if (msgId) {
        await supabase.from('wapi_messages').upsert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: 'text', content: msg, status: 'sent',
          timestamp: new Date().toISOString(), company_id: instance.company_id,
        }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
      }
      
      // Update state to wait for reply
      await supabase.from('flow_lead_state').update({
        current_node_id: currentNode.id,
        waiting_for_reply: true,
        last_sent_at: new Date().toISOString(),
      }).eq('id', state.id);
      
      await supabase.from('wapi_conversations').update({
        bot_step: `flow_qualify_${currentNode.id}`,
        last_message_at: new Date().toISOString(),
        last_message_content: msg.substring(0, 100),
        last_message_from_me: true,
      }).eq('id', conv.id);
      break;
    }
    
    default: {
      // Unknown node type, try to advance
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        }
      }
      break;
    }

  }
}

async function syncCollectedDataToLead(
  supabase: SupabaseClient,
  instance: { id: string; unit: string | null; company_id: string },
  conv: { id: string; lead_id: string | null },
  data: Record<string, string>,
  contactPhone: string,
  contactName: string | null
) {
  const n = normalizePhone(contactPhone);
  const leadData: JsonRecord = {};
  
  // Map both legacy bot field names and Flow Builder extract field names
  if (data.nome || data.customer_name) leadData.name = data.customer_name || data.nome;
  if (data.mes || data.event_date) leadData.month = data.event_date || data.mes;
  if (data.dia || data.preferred_slot) leadData.day_preference = data.preferred_slot || data.dia;
  if (data.convidados || data.guest_count) leadData.guests = data.guest_count || data.convidados;
  
  // Store additional Flow Builder fields in observacoes
  const extraFields: string[] = [];
  if (data.child_name) extraFields.push(`Criança: ${data.child_name}`);
  if (data.child_age) extraFields.push(`Idade: ${data.child_age}`);
  if (data.event_type) extraFields.push(`Tipo: ${data.event_type}`);
  if (data.visit_date) extraFields.push(`Visita: ${data.visit_date}`);
  if (extraFields.length > 0) leadData.observacoes = extraFields.join(' | ');
  
  if (Object.keys(leadData).length === 0 && !data.nome && !data.customer_name) return;
  
  if (conv.lead_id) {
    await supabase.from('campaign_leads').update(leadData).eq('id', conv.lead_id);
    console.log(`[FlowBuilder] Updated lead ${conv.lead_id}`);
  } else {
    const { data: newLead } = await supabase.from('campaign_leads').insert({
      name: data.nome || contactName || contactPhone,
      whatsapp: n,
      unit: instance.unit,
      campaign_id: 'flow-builder',
      campaign_name: 'WhatsApp (Flow Builder)',
      status: 'novo',
      company_id: instance.company_id,
      ...leadData,
    }).select('id').single();
    
    if (newLead) {
      await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
      console.log(`[FlowBuilder] Created lead ${newLead.id}`);
    }
  }
}

// ============= ORIGINAL BOT QUALIFICATION =============

async function processBotQualification(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null },
  content: string, contactPhone: string, contactName: string | null
) {
  // ── SANDBOX: número-piloto sempre vai para o Flow Builder V2 ─────
  const isPilotPhone = isMegaMagicPilotPhone(instance.id, contactPhone);
  if (isPilotPhone) {
    // Only force Flow Builder if the company actually has an active flow
    const { data: pilotFlows } = await supabase
      .from('conversation_flows')
      .select('id')
      .eq('company_id', instance.company_id)
      .eq('is_active', true)
      .limit(1);
    if (pilotFlows && pilotFlows.length > 0) {
      console.log(`[Bot] 🧪 SANDBOX: número-piloto (${contactPhone}) → forçando Flow Builder V2`);
      await processFlowBuilderMessage(supabase, instance, conv, content, contactPhone, contactName);
      return;
    }
    console.log(`[Bot] 🧪 SANDBOX: número-piloto (${contactPhone}) → sem fluxo ativo, seguindo bot legado`);
  }
  // ─────────────────────────────────────────────────────────────────

  const settings = await getBotSettings(supabase, instance.id);
  if (!settings) return;

  // ── Guard: skip bot if linked lead is "perdido" ──
  if (conv.lead_id) {
    const { data: linkedLead } = await supabase
      .from('campaign_leads')
      .select('status')
      .eq('id', conv.lead_id)
      .single();
    if (linkedLead?.status === 'perdido') {
      console.log(`[Bot] Lead ${conv.lead_id} is perdido, skipping bot processing`);
      return;
    }
  }

  // ── Test mode guard (applies to ALL bot modes including Flow Builder) ──
  const n = normalizePhone(contactPhone);
  const isTest = Boolean(settings.test_mode_number) && isSameTestPhone(contactPhone, settings.test_mode_number);

  // If test mode is on, only allow the test number through
  if (settings.test_mode_enabled && !isTest) {
    console.log(`[Bot] Test mode ON — phone ${contactPhone} is NOT test number, skipping`);
    return;
  }

  if (isPilotPhone && conv.bot_step !== 'human_takeover') {
    // Steps verdadeiramente TERMINAIS — só esses justificam reset do bot piloto.
    // 'sending_materials' e 'proximo_passo*' NÃO entram aqui pois são intermediários:
    // se entrarem, uma mensagem que chega durante esses steps causa restart prematuro.
    const completedPilotSteps = [
      'complete_final',
      'flow_complete',
      'flow_handoff',
      'flow_ai_disabled',
      'flow_no_followup',
      'transferred',
      'work_interest',
    ];

    if (conv.bot_enabled === false || completedPilotSteps.includes(conv.bot_step || '')) {
      // 🛡️ Anti-burst guard: evita restart duplicado quando várias mensagens
      // chegam em sequência rápida (ex.: lead manda "1","2","3" um atrás do outro,
      // ou Z-API entrega o mesmo evento mais de uma vez). Se a conversa já foi
      // atualizada nos últimos 90s, presumimos que outro processo já reiniciou
      // e está enviando o welcome — não disparamos de novo para evitar duplicar
      // todo o fluxo de boas-vindas + mídias.
      const updatedAtMs = conv.updated_at ? new Date(conv.updated_at).getTime() : 0;
      const recentlyTouched = updatedAtMs > 0 && (Date.now() - updatedAtMs) < 90_000;

      if (recentlyTouched) {
        console.log(`[Bot] 🧪 Pilot restart skipped for conv ${conv.id} — conversation was touched ${Math.round((Date.now() - updatedAtMs)/1000)}s ago (anti-burst guard)`);
        return;
      }

      // 🛡️ Follow-up guard: se a última mensagem do bot foi um auto_reminder
      // (follow-up automático após complete_final), NÃO reiniciar o fluxo.
      // O handler normal de `complete_final` (logo abaixo) trata a resposta
      // como uma escolha de proximo_passo. Restart aqui causaria reenvio
      // completo de boas-vindas, fotos, vídeo e PDF.
      if (conv.bot_step === 'complete_final') {
        const { data: lastBotMsg } = await supabase
          .from('wapi_messages')
          .select('metadata')
          .eq('conversation_id', conv.id)
          .eq('from_me', true)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastSource = (lastBotMsg?.metadata as JsonRecord | null)?.source;
        if (lastSource === 'auto_reminder') {
          console.log(`[Bot] 🧪 Pilot restart skipped for conv ${conv.id} — last bot message was auto_reminder follow-up; letting complete_final handler treat reply as proximo_passo`);
          return;
        }
      }

      // Atomic guard via conditional UPDATE: somente reinicia se o bot_step
      // ainda for um step terminal. Se outro processo concorrente já trocou
      // para 'welcome', o UPDATE retorna 0 linhas e abortamos.
      const { data: restartRows, error: restartErr } = await supabase
        .from('wapi_conversations')
        .update({
          bot_enabled: true,
          bot_step: 'welcome',
          bot_data: {},
        })
        .eq('id', conv.id)
        .in('bot_step', completedPilotSteps)
        .select('id');

      if (restartErr) {
        console.error(`[Bot] 🧪 Pilot restart failed for conv ${conv.id}: ${restartErr.message}`);
        return;
      }

      if (!restartRows || restartRows.length === 0) {
        console.log(`[Bot] 🧪 Pilot restart aborted for conv ${conv.id} — another process already restarted (race condition prevented)`);
        return;
      }

      console.log(`[Bot] 🧪 Restarting legacy bot for Mega Magic pilot conversation ${conv.id}`);
      conv.bot_enabled = true;
      conv.bot_step = 'welcome';
      conv.bot_data = {};
    }
  }

  // Check if bot settings allow running
  const botSettingsAllow = (settings.test_mode_enabled && isTest) || (settings.bot_enabled && !settings.test_mode_enabled);

  // Check if Flow Builder mode is enabled — delegate to flow processor
  if (settings.use_flow_builder) {
    console.log(`[Bot] Flow Builder mode enabled for instance ${instance.id}, delegating...`);
    await processFlowBuilderMessage(supabase, instance, conv, content, contactPhone, contactName);
    return;
  }
  
  // If bot_enabled is false, check if this is an LP lead that needs bot activation
  // This happens when the LP sends the first message (outgoing), creating the conversation with bot_enabled=false
  // Then when the lead responds, bot_enabled is still false but we need to activate the flow
  if ((conv.bot_enabled === false || conv.bot_step === 'lp_sent') && botSettingsAllow) {
    // ✅ GUARD: Don't re-activate bot if the flow was already completed
    const completedBotSteps = ['complete_final', 'flow_complete', 'flow_handoff', 'flow_ai_disabled', 'flow_no_followup', 'qualified_from_lp', 'transferred', 'work_interest', 'sending_materials', 'human_takeover'];
    if (completedBotSteps.includes(conv.bot_step || '') || (conv.bot_step || '').startsWith('flow_')) {
      console.log(`[Bot] Flow already completed (step: ${conv.bot_step}), not re-activating bot for ${contactPhone}`);
      return;
    }
    
    // Check if there's an LP lead linked or findable by phone number
    // Build all Brazilian phone variants (with/without 55, with/without 9th digit)
    const buildPhoneVariants = (raw: string): string[] => {
      const clean = (raw || '').replace(/\D/g, '');
      const set = new Set<string>();
      if (!clean) return [];
      set.add(clean);
      const noCC = clean.startsWith('55') && clean.length >= 12 ? clean.slice(2) : clean;
      set.add(noCC);
      set.add('55' + noCC);
      if (noCC.length === 10) {
        const with9 = noCC.slice(0, 2) + '9' + noCC.slice(2);
        set.add(with9);
        set.add('55' + with9);
      }
      if (noCC.length === 11 && noCC[2] === '9') {
        const without9 = noCC.slice(0, 2) + noCC.slice(3);
        set.add(without9);
        set.add('55' + without9);
      }
      return Array.from(set);
    };
    const vars = buildPhoneVariants(n);
    let lpLead = null;
    
    if (conv.lead_id) {
      const { data: linked } = await supabase.from('campaign_leads')
        .select('id, name, month, day_of_month, guests, campaign_id')
        .eq('id', conv.lead_id)
        .single();
      if (linked?.campaign_id && !linked.campaign_id.startsWith('whatsapp')) lpLead = linked;
    }
    
    if (!lpLead) {
      const { data: found } = await supabase.from('campaign_leads')
        .select('id, name, month, day_of_month, guests, campaign_id, whatsapp')
        .in('whatsapp', vars)
        .eq('company_id', instance.company_id)
        .not('campaign_id', 'like', 'whatsapp%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (found) {
        lpLead = found;
        console.log(`[Bot] LP lead matched by phone variant for ${n} -> lead ${found.id} (stored: ${found.whatsapp})`);
      } else {
        console.log(`[Bot] LP lead NOT FOUND for phone ${n} (variants tried: ${JSON.stringify(vars)}) — bot stays at lp_sent`);
      }
    }
    
    if (lpLead && lpLead.name && lpLead.month) {
      console.log(`[Bot] LP lead detected (${lpLead.id}), checking response: "${content}"`);
      
      // Check if lead chose option 2 (falar com atendente) — don't activate bot
      const normalized = content.trim();
      if (normalized === '2') {
        console.log(`[Bot] LP lead chose option 2 (atendente), keeping bot disabled`);
        await supabase.from('wapi_conversations').update({
          bot_enabled: false,
          bot_step: null,
          lead_id: lpLead.id,
        }).eq('id', conv.id);
        // Send a confirmation message
        const transferMsg = settings.transfer_message || 'Ótimo! Um atendente vai falar com você em breve. Aguarde! 😊';
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, transferMsg);
        if (msgId) {
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id, message_id: msgId, from_me: true, message_type: 'text',
            company_id: instance.company_id, content: transferMsg, status: 'sent', timestamp: new Date().toISOString()
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
        }
        return;
      }
      
      // Option 1 or any other response — re-enable bot and send materials
      console.log(`[Bot] LP lead chose option 1 or responded, re-enabling bot for conversation ${conv.id}`);
      // Atomic claim: only reactivate if bot_step is still lp_sent or null (prevents duplicate webhook race)
      const { data: reactivated } = await supabase.from('wapi_conversations').update({
        bot_enabled: true,
        bot_step: 'welcome',
        lead_id: lpLead.id,
      }).eq('id', conv.id)
        .in('bot_step', ['lp_sent', null, ''])
        .select('id')
        .maybeSingle();
      
      if (!reactivated) {
        console.log(`[Bot] LP reactivation already claimed for conv ${conv.id}, skipping`);
        return;
      }
      conv.bot_enabled = true;
      conv.bot_step = 'welcome';
      conv.lead_id = lpLead.id;
    } else {
      return; // No LP lead found, don't activate bot
    }
  } else if (conv.bot_enabled === false) {
    return;
  }
  
  if (!botSettingsAllow) return;
  if (await isVipNumber(supabase, instance.id, contactPhone)) return;
  
  // Check if lead already exists and has complete data - send welcome message instead of bot
  if (conv.lead_id) {
    const { data: existingLead } = await supabase.from('campaign_leads')
      .select('name, month, day_preference, day_of_month, guests')
      .eq('id', conv.lead_id)
      .single();
    
      // If lead already has all qualification data, send welcome message for qualified leads
      // LP leads have day_of_month, bot leads have day_preference - check both
      const hasCompleteData = existingLead?.name && existingLead?.month && (existingLead?.day_preference || existingLead?.day_of_month) && existingLead?.guests;
      if (hasCompleteData) {
        console.log(`[Bot] Lead ${conv.lead_id} already qualified from LP, bot_step: ${conv.bot_step}`);
        
        // If we're waiting for proximo_passo answer, don't return - let it process below
        if (conv.bot_step === 'proximo_passo' || conv.bot_step === 'proximo_passo_reminded') {
          console.log(`[Bot] Lead is qualified but waiting for proximo_passo answer, continuing...`);
          // Don't return - continue to process the proximo_passo step below
        } else if (!conv.bot_step || conv.bot_step === 'welcome') {
          // Atomic claim: only process if bot_step is still welcome/null (prevents duplicate welcome from concurrent webhooks)
          const { data: lpWelcomeClaimed } = await supabase.from('wapi_conversations').update({
            bot_step: 'sending_materials',
          }).eq('id', conv.id)
            .in('bot_step', ['welcome', ''])
            .select('id')
            .maybeSingle();
          
          // Also try null bot_step
          let claimed = !!lpWelcomeClaimed;
          if (!claimed && !conv.bot_step) {
            const { data: lpNullClaimed } = await supabase.from('wapi_conversations').update({
              bot_step: 'sending_materials',
            }).eq('id', conv.id)
              .is('bot_step', null)
              .select('id')
              .maybeSingle();
            claimed = !!lpNullClaimed;
          }
          
          if (!claimed) {
            console.log(`[Bot] LP qualified welcome already claimed for conv ${conv.id}, skipping`);
            return;
          }
          
          // First message from LP lead — send welcome + materials + next step question (same as direct leads)
          const defaultQualifiedMsg = `Olá, {nome}! 👋\n\nRecebemos seu interesse pelo site e já temos seus dados aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}`;
          const qualifiedTemplate = settings.qualified_lead_message || defaultQualifiedMsg;
          
          const dayDisplay = existingLead.day_of_month ? `Dia ${existingLead.day_of_month}` : (existingLead.day_preference || '');
          // Buscar nome da empresa para variáveis de template (leads qualificados da LP)
          let lpCompanyName = '';
          try {
            const { data: lpCompanyData } = await supabase
              .from('companies')
              .select('name')
              .eq('id', instance.company_id)
              .single();
            lpCompanyName = lpCompanyData?.name || '';
          } catch (_) { /* ignore */ }

          const leadData: Record<string, string> = {
            nome: existingLead.name,
            mes: existingLead.month || '',
            dia: dayDisplay,
            convidados: existingLead.guests || '',
            empresa: lpCompanyName,
            buffet: lpCompanyName,
            'nome-empresa': lpCompanyName,
            'nome_empresa': lpCompanyName,
          };
          
          const welcomeMsg = replaceVariables(qualifiedTemplate, leadData);
          
          // Send welcome message
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, welcomeMsg);
          
          if (msgId) {
            // Save message to database
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              company_id: instance.company_id,
              content: welcomeMsg,
              status: 'sent',
              timestamp: new Date().toISOString()
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
          
          // Update bot_data (bot_step already set to sending_materials by atomic claim above)
          await supabase.from('wapi_conversations').update({
            bot_data: leadData,
            last_message_at: new Date().toISOString(),
            last_message_content: welcomeMsg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          console.log(`[Bot] Sent qualified lead welcome message to ${contactPhone}, now sending materials...`);
          
          // Send materials + next step question in background (same as direct flow after qualification)
          const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
          const nextStepQuestion = settings.next_step_question || defaultNextStepQuestion;
          
          waitUntil(
            sendQualificationMaterialsThenQuestion(
              supabase,
              instance,
              conv,
              leadData,
              settings,
              nextStepQuestion
            ).catch(err => console.error('[Bot] Error sending LP lead materials:', err))
          );
          
          return;
        } else if (conv.bot_step === 'sending_materials') {
          // Materials are being sent, ignore incoming messages during this phase
          console.log(`[Bot] Lead ${conv.lead_id} is in sending_materials phase, ignoring message`);
          return;
        } else if (conv.bot_step === 'complete_final') {
          // Lead responded after a follow-up reactivated the bot
          // Treat their response as a proximo_passo choice
          console.log(`[Bot] Lead ${conv.lead_id} responded after follow-up (complete_final). Treating as proximo_passo.`);
          
          // Update step to proximo_passo so the normal flow handles it
          await supabase.from('wapi_conversations').update({
            bot_step: 'proximo_passo',
          }).eq('id', conv.id);
          
          // Re-read conv with updated step and fall through to normal processing
          conv.bot_step = 'proximo_passo';
        } else {
          // For other steps (like qualified_from_lp), return
          return;
        }
      }
  }

  // Get questions from database
  const questions = await getBotQuestions(supabase, instance.id);
  const questionSteps = Object.keys(questions);
  const firstStep = questionSteps[0] || 'nome';

  const step = conv.bot_step || 'welcome';
  const botData = (conv.bot_data || {}) as Record<string, string>;

  // ── ATOMIC CLAIM: prevent duplicate processing when multiple messages arrive simultaneously ──
  // Try to "lock" this step by doing a conditional UPDATE that only succeeds if bot_step hasn't changed.
  // If another webhook call already claimed this step, we skip silently.
  const { data: claimed } = await supabase
    .from('wapi_conversations')
    .update({ bot_data: { ...botData, _claimed_step: step, _claimed_at: new Date().toISOString() } })
    .eq('id', conv.id)
    .eq('bot_step', step)
    .select('id')
    .maybeSingle();

  if (!claimed) {
    console.log(`[Bot] Step "${step}" already claimed for conv ${conv.id}, skipping duplicate`);
    return;
  }
  // ── END ATOMIC CLAIM ──

  let nextStep: string;
  let msg: string = '';
  const updated = { ...botData };
  // Clear inactive reminder flag so follow-up can re-trigger if lead stops again at next step
  delete (updated as JsonRecord)._inactive_reminded;
  delete (updated as JsonRecord)._claimed_step;
  delete (updated as JsonRecord)._claimed_at;
  // Clear recovery flag so follow-up-check can recover again if webhook fails on a future step
  delete (updated as JsonRecord)._recovery_attempted;
  delete (updated as JsonRecord)._recovery_notified;

  // Buscar nome da empresa para variáveis de template
  let companyName = '';
  try {
    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', instance.company_id)
      .single();
    companyName = companyData?.name || '';
  } catch (_) { /* ignore */ }

  // Injetar variáveis de empresa no mapa
  updated.empresa = companyName;
  updated.buffet = companyName;
  updated['nome-empresa'] = companyName;
  updated['nome_empresa'] = companyName;

  if (step === 'welcome') {
    // Send welcome message + first question
    const firstQ = questions[firstStep];
    msg = replaceVariables(settings.welcome_message, updated) + '\n\n' + (firstQ?.question || DEFAULT_QUESTIONS.nome.question);
    nextStep = firstStep;
  } else if (questions[step] || step === 'proximo_passo' || step === 'proximo_passo_reminded') {
    // Check if lead is responding "1" to the inactive follow-up "Responda *1* para continuar"
    // In that case, re-send the current question instead of validating "1" as an answer
    const wasInactiveReminded = (conv.bot_data as JsonRecord)?._inactive_reminded === true;
    if (wasInactiveReminded && content.trim() === '1' && step !== 'proximo_passo' && step !== 'proximo_passo_reminded') {
      const currentQ = questions[step];
      msg = currentQ?.question || (DEFAULT_QUESTIONS as Record<string, { question: string }>)[step]?.question || 'Por favor, responda a pergunta acima:';
      nextStep = step;
      console.log(`[Bot] Lead responded "1" to inactive follow-up, re-sending question for step: ${step}`);
      
      // Update conversation - clear the flag and re-send question
      await supabase.from('wapi_conversations').update({
        bot_step: nextStep,
        bot_data: updated,
        bot_enabled: true,
      }).eq('id', conv.id);
      
      await sendWithDelay(instance, conv.remote_jid, msg, settings.message_delay_seconds);
      return;
    }

    // Get the current question text for dynamic option extraction
    const currentQuestionText = questions[step]?.question;
    
    // Validate the answer
    const validation = validateAnswer(step, content, currentQuestionText);
    
    if (!validation.valid) {
      // Invalid answer - re-send error with menu
      msg = validation.error || 'Não entendi sua resposta. Por favor, tente novamente.';
      nextStep = step;
      console.log(`[Bot] Invalid answer for step ${step}: "${content.substring(0, 50)}"`);
      
      // Register invalid reply in lead_history for score penalty
      if (conv.lead_id) {
        await supabase.from('lead_history').insert({
          lead_id: conv.lead_id,
          action: 'bot_invalid_reply',
          new_value: content.substring(0, 200),
          old_value: step,
          company_id: instance.company_id,
        });
        console.log(`[Bot] Registered bot_invalid_reply for lead ${conv.lead_id}`);
      }
    } else {
      // Valid answer - save and proceed
      updated[step] = validation.value || content.trim();
      
      // Update contact_name when bot collects the lead's real name
      // BUT: respect manually edited names (with /, codes, +, - separators)
      if (step === 'nome' && (validation.value || content.trim())) {
        const realName = validation.value || content.trim();
        const existing = (conv.contact_name || '').trim();
        const isManuallyEdited =
          existing.includes('/') ||
          /[0-9]{3,}[A-Za-z]/.test(existing) ||
          /[A-Za-z][0-9]{2,}/.test(existing) ||
          existing.includes(' + ') ||
          /[A-Za-zÀ-ÿ]+\s*-\s*[A-Za-z0-9]/.test(existing);
        if (isManuallyEdited) {
          console.log(`[Bot] Skipping contact_name update — "${existing}" looks manually edited (conv ${conv.id})`);
        } else {
          await supabase.from('wapi_conversations').update({
            contact_name: realName,
          }).eq('id', conv.id);
          console.log(`[Bot] Updated contact_name to "${realName}" for conv ${conv.id}`);
        }
      }
      
      const currentQ = questions[step];
      const nextStepKey = currentQ?.next || (step === 'proximo_passo' || step === 'proximo_passo_reminded' ? 'complete_final' : 'complete');
      
      // Special handling for "tipo" step - check if already client
      if (step === 'tipo') {
        const isAlreadyClient = validation.value === 'Já sou cliente' || content.trim() === '1';
        
        if (isAlreadyClient) {
          // User is already a client - transfer to commercial team, disable bot, don't create lead
          console.log(`[Bot] User ${contactPhone} is already a client. Transferring to commercial team.`);
          
          // Use configurable transfer message or default
          const defaultTransfer = `Entendido, {nome}! 🏰\n\nVou transferir sua conversa para nossa equipe comercial que vai te ajudar com sua festa.\n\nAguarde um momento, por favor! 👑`;
          const transferTemplate = settings.transfer_message || defaultTransfer;
          msg = replaceVariables(transferTemplate, updated);
          nextStep = 'transferred';
          
          // Send message, disable bot, and DON'T create lead
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
          
          if (msgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              content: msg,
              status: 'sent',
              timestamp: new Date().toISOString(),
              company_id: instance.company_id,
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
          
          // Mark as transferred and disable bot
          await supabase.from('wapi_conversations').update({
            bot_step: 'transferred',
            bot_data: updated,
            bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: msg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          // Create lead with status "cliente_retorno" for existing clients
          const leadName = updated.nome || contactName || contactPhone;
          let newLeadId: string | null = null;
          try {
            const { data: newLead, error: leadErr } = await supabase.from('campaign_leads').insert({
              name: leadName,
              whatsapp: n,
              unit: instance.unit,
              campaign_id: 'whatsapp-bot-cliente',
              campaign_name: 'WhatsApp (Bot) - Cliente',
              status: 'cliente_retorno',
              company_id: instance.company_id,
              observacoes: 'Cliente existente - retornou pelo WhatsApp',
            }).select('id').single();

            if (!leadErr && newLead) {
              newLeadId = newLead.id;
              console.log(`[Bot] Existing client lead created: ${newLead.id}`);
              // Link lead to conversation. Only overwrite contact_name when
              // the existing one is missing/numeric — never replace a real pushName.
              const existing = (conv.contact_name || '').trim();
              const isPlaceholder =
                !existing ||
                /^[\d\s+()\-]+$/.test(existing) ||
                existing === conv.contact_phone;
              const updatePayload: Record<string, unknown> = { lead_id: newLead.id };
              if (isPlaceholder && leadName) updatePayload.contact_name = leadName;
              await supabase.from('wapi_conversations').update(updatePayload).eq('id', conv.id);
            } else if (leadErr) {
              console.error('[Bot] Error creating client return lead:', leadErr);
            }
          } catch (leadCreateErr) {
            console.error('[Bot] Exception creating client return lead:', leadCreateErr);
          }
          
          // Create notifications for users with permission for this unit (scoped to company)
          try {
            const unitLower = instance.unit?.toLowerCase() || '';
            const unitPermission = `leads.unit.${unitLower}`;
            const targetUserIds = await getCompanyNotificationTargets(supabase, instance.company_id, unitPermission);
            
            // Create notification for each user
            const notifications = targetUserIds.map(userId => ({
              user_id: userId,
              company_id: instance.company_id,
              type: 'existing_client',
              title: 'Cliente existente precisa de atenção',
              message: `${updated.nome || contactName || contactPhone} disse que já é cliente`,
              data: {
                conversation_id: conv.id,
                contact_name: updated.nome || contactName || contactPhone,
                contact_phone: contactPhone,
                unit: instance.unit || 'Unknown',
                lead_id: newLeadId,
              },
              read: false
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
              console.log(`[Bot] Created ${notifications.length} notifications for existing client alert`);
            }
          } catch (notifErr) {
            console.error('[Bot] Error creating client notifications:', notifErr);
          }
          
          console.log(`[Bot] Conversation transferred. Bot disabled. Lead created with status cliente_retorno.`);
          return; // Exit early - don't continue with normal flow
        }
        // Check if wants to work here (option 3)
        const wantsWork = validation.value === 'Trabalhe Conosco' || content.trim() === '3';
        
        if (wantsWork) {
          console.log(`[Bot] User ${contactPhone} wants to work here. Creating RH lead.`);
          
          const defaultWorkResponse = `Que legal que você quer fazer parte do nosso time! 💼✨\n\nEnvie seu currículo aqui nesta conversa e nossa equipe de RH vai analisar!\n\nObrigado pelo interesse! 😊`;
          const workResponseTemplate = settings.work_here_response || defaultWorkResponse;
          msg = replaceVariables(workResponseTemplate, updated);
          nextStep = 'work_interest';
          
          // Send message
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
          
          if (msgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              content: msg,
              status: 'sent',
              timestamp: new Date().toISOString(),
              company_id: instance.company_id,
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
          
          // Create lead with "Trabalhe Conosco" unit
          const leadName = updated.nome || contactName || contactPhone;
          const { data: newLead, error: leadErr } = await supabase.from('campaign_leads').insert({
            name: leadName,
            whatsapp: n,
            unit: 'Trabalhe Conosco',
            campaign_id: 'whatsapp-bot-rh',
            campaign_name: 'WhatsApp (Bot) - RH',
            status: 'trabalhe_conosco',
            company_id: instance.company_id,
          }).select('id').single();
          
          if (leadErr) {
            console.error(`[Bot] Error creating RH lead:`, leadErr.message);
          } else {
            console.log(`[Bot] RH Lead created: ${newLead.id}`);
            await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          }
          
          // Disable bot
          await supabase.from('wapi_conversations').update({
            bot_step: 'work_interest',
            bot_data: updated,
            bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: msg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          // Create notifications for admins (scoped to company)
          try {
            const targetUserIds = await getCompanyNotificationTargets(supabase, instance.company_id, 'leads.unit.all');
            
            const notifications = targetUserIds.map(userId => ({
              user_id: userId,
              company_id: instance.company_id,
              type: 'work_interest',
              title: '👷 Interesse em trabalhar na empresa',
              message: `${leadName} quer trabalhar na empresa! Enviou interesse via WhatsApp.`,
              data: {
                conversation_id: conv.id,
                contact_name: leadName,
                contact_phone: contactPhone,
              },
              read: false
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
              console.log(`[Bot] Created ${notifications.length} notifications for work interest`);
            }
          } catch (notifErr) {
            console.error('[Bot] Error creating work interest notifications:', notifErr);
          }
          
          console.log(`[Bot] Work interest flow complete. Bot disabled.`);
          return;
        }
        
        // If wants quote (option 2), continue with normal flow
        console.log(`[Bot] User ${contactPhone} wants a quote. Continuing qualification.`);
      }
      
      // ── GUEST LIMIT CHECK ──
      // Fallback: if wapi_bot_settings has no guest_limit, check lp_bot_settings
      let effectiveGuestLimit = settings.guest_limit;
      let effectiveGuestLimitMessage = settings.guest_limit_message;
      let effectiveGuestLimitRedirectName = settings.guest_limit_redirect_name;

      if (!effectiveGuestLimit) {
        const { data: lpSettings } = await supabase
          .from('lp_bot_settings')
          .select('guest_limit, guest_limit_message, guest_limit_redirect_name')
          .eq('company_id', instance.company_id)
          .single();

        if (lpSettings?.guest_limit) {
          effectiveGuestLimit = lpSettings.guest_limit;
          effectiveGuestLimitMessage = lpSettings.guest_limit_message;
          effectiveGuestLimitRedirectName = lpSettings.guest_limit_redirect_name;
          console.log(`[Bot] Using lp_bot_settings fallback for guest limit: ${effectiveGuestLimit}`);
        }
      }

      // If the last answered step was "convidados" and a guest limit is configured,
      // check if the selected option exceeds the limit and redirect if so.
      if (nextStepKey === 'complete' && effectiveGuestLimit) {
        const guestAnswer = updated.convidados || '';
        if (exceedsGuestLimit(guestAnswer, effectiveGuestLimit)) {
          console.log(`[Bot] 🚫 Guest limit exceeded! Answer="${guestAnswer}", limit=${effectiveGuestLimit}`);
          
          const redirectMsg = effectiveGuestLimitMessage || `Nossa capacidade máxima é de ${effectiveGuestLimit} convidados. Infelizmente não conseguimos atender essa demanda.`;
          const redirectName = effectiveGuestLimitRedirectName || 'buffet parceiro';
          
          // Send redirect message
          const redirectMsgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, redirectMsg);
          if (redirectMsgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id, message_id: redirectMsgId, from_me: true,
              message_type: 'text', content: redirectMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: instance.company_id,
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
          
          // Create lead with status "transferido"
          const leadName = updated.nome || contactName || contactPhone;
          const obs = `Redirecionado para ${redirectName} - acima do limite de ${effectiveGuestLimit - 1} convidados (${guestAnswer})`;
          
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({
              name: leadName,
              month: updated.mes || null,
              day_preference: updated.dia || null,
              guests: guestAnswer,
              status: 'transferido' as any,
              observacoes: obs,
            }).eq('id', conv.lead_id);
          } else {
            const { data: newLead } = await supabase.from('campaign_leads').insert({
              name: leadName,
              whatsapp: n,
              unit: instance.unit,
              campaign_id: 'whatsapp-bot',
              campaign_name: 'WhatsApp (Bot)',
              status: 'transferido' as any,
              month: updated.mes || null,
              day_preference: updated.dia || null,
              guests: guestAnswer,
              observacoes: obs,
              company_id: instance.company_id,
            }).select('id').single();
            
            if (newLead) {
              await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
            }
          }
          
          // Disable bot
          await supabase.from('wapi_conversations').update({
            bot_step: 'complete_final',
            bot_data: updated,
            bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: redirectMsg.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', conv.id);
          
          console.log(`[Bot] Guest limit redirect complete. Bot disabled.`);
          return;
        }
      }
      
      if (nextStepKey === 'complete') {
        // All qualification questions answered - create or update lead
        // Then: send completion msg -> send materials -> send next step question
        nextStep = 'sending_materials'; // New intermediate step
        
        // Build completion message from settings or use default
        const defaultCompletion = `Perfeito, {nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}`;
        const completionTemplate = settings.completion_message || defaultCompletion;
        let completionMsg = replaceVariables(completionTemplate, updated);
        
        console.log(`[Bot] Qualification complete for ${contactPhone}. Data:`, JSON.stringify(updated));
        
        // Create or update lead
        if (conv.lead_id) {
          console.log(`[Bot] Updating existing lead ${conv.lead_id}`);
          const { error: updateErr } = await supabase.from('campaign_leads').update({
            name: updated.nome || contactName || contactPhone,
            month: updated.mes || null,
            day_preference: updated.dia || null,
            guests: updated.convidados || null,
          }).eq('id', conv.lead_id);
          
          if (updateErr) {
            console.error(`[Bot] Error updating lead:`, updateErr.message);
          } else {
            console.log(`[Bot] Lead ${conv.lead_id} updated successfully`);
          }
        } else {
          console.log(`[Bot] Creating new lead for phone ${n}, unit ${instance.unit}`);
          const { data: newLead, error } = await supabase.from('campaign_leads').insert({
            name: updated.nome || contactName || contactPhone,
            whatsapp: n,
            unit: instance.unit,
            campaign_id: 'whatsapp-bot',
            campaign_name: 'WhatsApp (Bot)',
            status: 'novo',
            month: updated.mes || null,
            day_preference: updated.dia || null,
            guests: updated.convidados || null,
            company_id: instance.company_id,
          }).select('id').single();
          
          if (error) {
            console.error(`[Bot] Error creating lead:`, error.message);
          } else {
            console.log(`[Bot] Lead created successfully: ${newLead.id}`);
            await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          }
        }
        
        // Only send completion message now - materials and next step question will follow
        msg = completionMsg;
        
      } else if (nextStepKey === 'proximo_passo' || step === 'proximo_passo' || step === 'proximo_passo_reminded') {
        // Processing proximo_passo answer
        nextStep = 'complete_final';
        
        const choice = validation.value || '';
        let responseMsg = '';
        let newLeadStatus: 'em_contato' | 'aguardando_resposta' | 'novo' = 'novo';
        let scheduleVisit = false;
        let notificationType = '';
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationPriority = false;
        
        // Default responses
        const defaultVisitResponse = `Ótima escolha! 🎉✨\n\nNossa equipe vai entrar em contato para agendar sua visita ao buffet!\n\nAguarde um momento que já vamos te chamar! 😊`;
        const defaultQuestionsResponse = `Claro! 💬\n\nPode mandar sua dúvida aqui que nossa equipe vai te responder rapidinho!\n\nEstamos à disposição! 👑`;
        const defaultAnalyzeResponse = `Sem problemas! 📋\n\nVou enviar nossos materiais para você analisar com calma. Quando estiver pronto, é só chamar aqui!\n\nEstamos à disposição! 👑✨`;
        
        const leadName = updated.nome || contactName || contactPhone;
        
        if (choice === 'Agendar visita' || content.trim() === '1') {
          // User wants to schedule a visit - HIGH PRIORITY
          scheduleVisit = true;
          newLeadStatus = 'em_contato';
          responseMsg = settings.next_step_visit_response || defaultVisitResponse;
          notificationType = 'visit_scheduled';
          notificationTitle = '🗓️ VISITA AGENDADA - Ação urgente!';
          notificationMessage = `${leadName} quer agendar uma visita! Entre em contato o mais rápido possível.`;
          notificationPriority = true;
          console.log(`[Bot] User ${contactPhone} wants to schedule a visit - updating status to em_contato`);
        } else if (choice === 'Tirar dúvidas' || content.trim() === '2') {
          // User wants to ask questions
          newLeadStatus = 'aguardando_resposta';
          responseMsg = settings.next_step_questions_response || defaultQuestionsResponse;
          notificationType = 'lead_questions';
          notificationTitle = '💬 Lead com dúvidas';
          notificationMessage = `${leadName} quer tirar dúvidas. Responda assim que possível!`;
          notificationPriority = false;
          console.log(`[Bot] User ${contactPhone} wants to ask questions - updating status to aguardando_resposta`);
        } else if (choice === 'Analisar com calma' || content.trim() === '3') {
          // User wants time to think - keep at orcamento_enviado (budget sent, analyzing)
          newLeadStatus = 'orcamento_enviado' as any;
          responseMsg = settings.next_step_analyze_response || defaultAnalyzeResponse;
          notificationType = 'lead_analyzing';
          notificationTitle = '📋 Lead analisando materiais';
          notificationMessage = `${leadName} está analisando os materiais. Aguarde ou faça follow-up em breve.`;
          notificationPriority = false;
          console.log(`[Bot] User ${contactPhone} wants time to analyze - updating status to orcamento_enviado`);
         } else {
           // Invalid choice — DO NOT revert step (would re-trigger auto reminder cron forever).
           // Keep current step (proximo_passo OR proximo_passo_reminded) and increment invalid_count.
           // After 2 invalid replies, pause bot 24h and notify operator.
           const prevInvalid = Number((updated as Record<string, unknown>)?.invalid_count || 0);
           const newInvalid = prevInvalid + 1;
           (updated as Record<string, unknown>).invalid_count = newInvalid;

           if (newInvalid >= 2) {
             // Pause bot silently and hand over to human
             nextStep = step; // keep current
             const pausedUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
             await supabase.from('wapi_conversations').update({
               bot_paused_until: pausedUntil,
               bot_paused_reason: 'invalid_replies_handover',
               bot_paused_at: new Date().toISOString(),
             }).eq('id', conv.id);
             console.warn(`[Bot] 🛑 Conversation ${conv.id} paused after ${newInvalid} invalid proximo_passo replies`);

             // Notify team — needs human attention
             try {
               const unitLower = (instance as { unit?: string }).unit?.toLowerCase() || '';
               const unitPermission = `leads.unit.${unitLower}`;
               const targetUserIds = await getCompanyNotificationTargets(supabase, instance.company_id, unitPermission);
               const notifs = targetUserIds.map((uid: string) => ({
                 user_id: uid,
                 company_id: instance.company_id,
                 type: 'lead_needs_human',
                 title: '🤝 Lead precisa de atenção humana',
                 message: `${updated.nome || contactName || contactPhone} não respondeu corretamente — bot pausado, assuma a conversa.`,
                 data: { conversation_id: conv.id, lead_id: conv.lead_id, reason: 'invalid_replies' },
               }));
               if (notifs.length) await supabase.from('notifications').insert(notifs);
             } catch (e) {
               console.error('[Bot] notify human handover error', e);
             }

             // Do not send another bot message — silent handover
             msg = '';
           } else {
             // First invalid: re-ask but KEEP step at proximo_passo_reminded if we were already reminded,
             // so the cron job does not pick it up again.
             nextStep = step; // preserve current state
             const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
             msg = `Por favor, responda apenas com o *número* da opção desejada (1, 2 ou 3) 👇\n\n${settings.next_step_question || defaultNextStepQuestion}`;
           }
         }
        
        if (nextStep === 'complete_final') {
          msg = replaceVariables(responseMsg, updated);
          
          // Update conversation flags
          await supabase.from('wapi_conversations').update({
            has_scheduled_visit: scheduleVisit
          }).eq('id', conv.id);
          
          // Update lead status
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({
              status: newLeadStatus
            }).eq('id', conv.lead_id);
            
            // Record in lead history
            await supabase.from('lead_history').insert({
              lead_id: conv.lead_id,
              action: 'Próximo passo escolhido',
              old_value: 'novo',
              new_value: choice,
              company_id: instance.company_id,
            });
            
            console.log(`[Bot] Lead ${conv.lead_id} status updated to ${newLeadStatus}`);
          }
          
          // Create notifications for team (scoped to company)
          if (notificationType) {
            try {
              const unitLower = instance.unit?.toLowerCase() || '';
              const unitPermission = `leads.unit.${unitLower}`;
              const targetUserIds = await getCompanyNotificationTargets(supabase, instance.company_id, unitPermission);
              
              // Create notification for each user
              const notifications = targetUserIds.map(userId => ({
                user_id: userId,
                company_id: instance.company_id,
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                data: {
                  conversation_id: conv.id,
                  lead_id: conv.lead_id,
                  contact_name: leadName,
                  contact_phone: contactPhone,
                  unit: instance.unit || 'Unknown',
                  choice: choice,
                  priority: notificationPriority
                },
                read: false
              }));
              
              if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
                console.log(`[Bot] Created ${notifications.length} notifications for next step choice: ${choice}`);
              }
            } catch (notifErr) {
              console.error('[Bot] Error creating next step notifications:', notifErr);
            }
          }
        }
      } else {
        // More questions to ask
        nextStep = nextStepKey;
        const nextQ = questions[nextStepKey];
        
        // Build confirmation + next question
        let confirmation = currentQ.confirmation || '';
        if (confirmation) {
          confirmation = replaceVariables(confirmation, updated);
        }
        
        msg = confirmation ? `${confirmation}\n\n${nextQ?.question || ''}` : (nextQ?.question || '');
      }
    }
  } else {
    // Unknown step, reset
    return;
  }

  // Send the text message
  const msgId = await sendInteractiveOrText(instance.instance_id, instance.instance_token, conv.remote_jid, msg, instance);
  
  // Always save bot message to DB so it appears in chat, even if W-API delivery failed
  await supabase.from('wapi_messages').upsert({
    conversation_id: conv.id,
    message_id: msgId || `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from_me: true,
    message_type: 'text',
    content: msg,
    status: msgId ? 'sent' : 'failed',
    timestamp: new Date().toISOString(),
    company_id: instance.company_id,
  }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
  
  await supabase.from('wapi_conversations').update({
    bot_step: nextStep,
    bot_data: updated,
    last_message_at: new Date().toISOString(),
    last_message_content: msg.substring(0, 100),
    last_message_from_me: true
  }).eq('id', conv.id);

  // After qualification complete (sending_materials step), send materials and then the next step question
  if (nextStep === 'sending_materials') {
    // Get next step question from database or use default
    const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
    const nextStepQuestion = settings.next_step_question || defaultNextStepQuestion;
    
    // Use background task to send materials, then send the next step question
    waitUntil(
      sendQualificationMaterialsThenQuestion(
        supabase,
        instance,
        conv,
        updated,
        settings,
        nextStepQuestion
      ).catch(err => console.error('[Bot] Error sending materials:', err))
    );
  }
  
  // Disable bot after proximo_passo is answered
  if (nextStep === 'complete_final') {
    await supabase.from('wapi_conversations').update({
      bot_enabled: false
    }).eq('id', conv.id);
  }
}

// ============= AUTO-SEND MATERIALS AFTER QUALIFICATION =============

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendBotActionViaWapiSend(
  action: 'send-text' | 'send-image' | 'send-video' | 'send-document',
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string },
  payload: { message?: string; mediaUrl?: string; caption?: string; fileName?: string },
  options?: { timeoutMs?: number; logLabel?: string }
): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`[Bot Materials] Missing Supabase env vars for ${action}`);
    return null;
  }

  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? (action === 'send-video' ? 60000 : 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: JsonRecord = {
      action,
      phone,
      instanceId: instance.instance_id,
      instanceToken: instance.instance_token,
      conversationId: conv.id,
      companyId: instance.company_id,
      source: 'bot',
      automation: true,
    };

    if (payload.message !== undefined) body.message = payload.message;
    if (payload.mediaUrl !== undefined) body.mediaUrl = payload.mediaUrl;
    if (payload.caption !== undefined) body.caption = payload.caption;
    if (payload.fileName !== undefined) body.fileName = payload.fileName;

    const response = await fetch(`${supabaseUrl}/functions/v1/wapi-send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: JsonRecord | null = null;

    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as JsonRecord;
      } catch (_) {
        parsed = null;
      }
    }

    if (!response.ok) {
      console.error(`[Bot Materials] ${action} failed (${response.status}) [${options?.logLabel || 'no-label'}]: ${rawText}`);
      return null;
    }

    if (parsed?.success === false || parsed?.error) {
      console.error(`[Bot Materials] ${action} returned error [${options?.logLabel || 'no-label'}]:`, parsed);
      return null;
    }

    const nestedData = parsed?.data as JsonRecord | undefined;
    const messageId = typeof parsed?.messageId === 'string'
      ? parsed.messageId
      : typeof nestedData?.messageId === 'string'
        ? nestedData.messageId
        : `queued_${action}_${Date.now()}`;

    return messageId;
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    console.error(
      `[Bot Materials] ${action} ${isAbort ? 'timed out' : 'threw'} [${options?.logLabel || 'no-label'}]:`,
      error,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendQualificationMaterials(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string },
  botData: Record<string, string>,
  settings: {
    auto_send_materials?: boolean;
    auto_send_photos?: boolean;
    auto_send_presentation_video?: boolean;
    auto_send_promo_video?: boolean;
    auto_send_pdf?: boolean;
    auto_send_photos_intro?: string | null;
    auto_send_pdf_intro?: string | null;
    message_delay_seconds?: number;
  } | null
): Promise<{ sentAny: boolean; failedSteps: string[] }> {
  const failedSteps: string[] = [];
  let sentAny = false;

  try {
    if (settings?.auto_send_materials === false) {
      console.log('[Bot Materials] Auto-send is disabled in settings');
      return { sentAny: false, failedSteps };
    }

    const unit = instance.unit;
    const month = botData.mes || '';
    const guestsStr = botData.convidados || '';
    const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

    let companyName = unit || '';
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name')
      .eq('id', instance.company_id)
      .maybeSingle();
    if (companyRow?.name) companyName = companyRow.name;

    console.log(`[Bot Materials] Starting auto-send for ${phone}, unit: ${unit}, companyName: ${companyName}, month: ${month}, guests: ${guestsStr}`);

    if (!unit) {
      console.log('[Bot Materials] No unit configured, skipping');
      return { sentAny: false, failedSteps };
    }

    const sendPhotos = settings?.auto_send_photos !== false;
    const sendPresentationVideo = settings?.auto_send_presentation_video !== false;
    const sendPromoVideo = settings?.auto_send_promo_video !== false;
    const sendPdf = settings?.auto_send_pdf !== false;
    const messageDelay = (settings?.message_delay_seconds || 5) * 1000;
    const photosIntro = settings?.auto_send_photos_intro || '✨ Conheça nosso espaço incrível! 🏰🎉';
    const pdfIntro = settings?.auto_send_pdf_intro || '📋 Oi {nome}! Segue o pacote completo para {convidados} no {empresa}. Qualquer dúvida é só chamar! 💜';

    await delay(messageDelay);

    const { data: captions } = await supabase
      .from('sales_material_captions')
      .select('caption_type, caption_text')
      .eq('is_active', true);

    const captionMap: Record<string, string> = {};
    captions?.forEach((caption) => {
      captionMap[caption.caption_type] = caption.caption_text;
    });

    let { data: materials, error: matError } = await supabase
      .from('sales_materials')
      .select('*')
      .eq('unit', unit)
      .eq('is_active', true)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true });

    if ((!materials || materials.length === 0) && instance.company_id) {
      console.log(`[Bot Materials] No materials for unit "${unit}", falling back to company_id`);
      const fallback = await supabase
        .from('sales_materials')
        .select('*')
        .eq('company_id', instance.company_id)
        .eq('is_active', true)
        .order('type', { ascending: true })
        .order('sort_order', { ascending: true });
      materials = fallback.data;
      matError = fallback.error;
    }

    if (matError || !materials?.length) {
      console.log(`[Bot Materials] No materials found for unit ${unit} or company fallback`);
      if (matError) failedSteps.push('materials_query');
      return { sentAny: false, failedSteps };
    }

    console.log(`[Bot Materials] Found ${materials.length} materials for ${unit}`);

    // 🎯 Filter by event_mode (interno/externo) when lead chose a venue type
    // local_festa = '1' → interno; local_festa = '2' → externo
    // Materials with event_mode = NULL are sent in both cases (universal)
    const localFesta = (botData.local_festa || '').trim();
    let chosenMode: 'interno' | 'externo' | null = null;
    if (localFesta === '1' || /interno|nosso\s*espa[çc]o|no\s*espa[çc]o/i.test(localFesta)) {
      chosenMode = 'interno';
    } else if (localFesta === '2' || /externa?|barraca|em\s*casa|condom[ií]nio|ch[áa]cara/i.test(localFesta)) {
      chosenMode = 'externo';
    }

    if (chosenMode) {
      const beforeCount = materials.length;
      materials = materials.filter((m) => !m.event_mode || m.event_mode === chosenMode);
      console.log(`[Bot Materials] Filtered by event_mode="${chosenMode}": ${beforeCount} → ${materials.length}`);
    }

    const photoCollections = materials.filter((material) => material.type === 'photo_collection');
    const allVideos = materials.filter((material) => material.type === 'video');
    const promoVideos = allVideos.filter((material) => material.name?.toLowerCase().includes('promo') || material.name?.toLowerCase().includes('carnaval'));
    const presentationVideos = allVideos.filter((material) => !promoVideos.includes(material));
    const pdfPackages = materials.filter((material) => material.type === 'pdf_package');

    const guestMatch = guestsStr.match(/(\d+)/);
    const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : null;

    const sendText = async (message: string, logLabel: string) => {
      const msgId = await sendBotActionViaWapiSend('send-text', instance, conv, { message }, { timeoutMs: 30000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    const sendImage = async (url: string, caption: string, logLabel: string) => {
      const msgId = await sendBotActionViaWapiSend('send-image', instance, conv, { mediaUrl: url, caption }, { timeoutMs: 30000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    const sendVideo = async (url: string, caption: string, logLabel: string) => {
      const msgId = await sendBotActionViaWapiSend('send-video', instance, conv, { mediaUrl: url, caption }, { timeoutMs: 60000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    const sendDocument = async (url: string, fileName: string, logLabel: string) => {
      const msgId = await sendBotActionViaWapiSend('send-document', instance, conv, { mediaUrl: url, fileName }, { timeoutMs: 30000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    if (sendPhotos && photoCollections.length > 0) {
      const collection = photoCollections[0];
      const photos = collection.photo_urls || [];

      if (photos.length > 0) {
        console.log(`[Bot Materials] Sending ${photos.length} photos from collection`);
        const introText = photosIntro.replace(/\{unidade\}/gi, companyName).replace(/\{empresa\}/gi, companyName);
        await sendText(introText, 'photos_intro');
        await delay(messageDelay / 2);

        for (let i = 0; i < photos.length; i++) {
          await sendImage(photos[i], '', `photo_${i + 1}`);
          if (i < photos.length - 1) await delay(800);
        }

        console.log('[Bot Materials] Photos step complete');
        await delay(messageDelay);
      }
    }

    if (sendPresentationVideo && presentationVideos.length > 0) {
      // When event_mode filter is active, send ALL matching videos (e.g. 3 external videos for Carrossel).
      // Otherwise keep legacy behavior (single video) to avoid changing other clients.
      const videosToSend = chosenMode ? presentationVideos : [presentationVideos[0]];
      const videoCaption = captionMap['video'] || `🎬 Conheça o ${companyName}! ✨`;
      const caption = videoCaption.replace(/\{unidade\}/gi, companyName).replace(/\{empresa\}/gi, companyName);

      for (let i = 0; i < videosToSend.length; i++) {
        const video = videosToSend[i];
        console.log(`[Bot Materials] Sending presentation video ${i + 1}/${videosToSend.length}: ${video.name}`);
        // Caption only on the first video to avoid spam
        await sendVideo(video.file_url, i === 0 ? caption : '', `presentation_video_${i + 1}`);
        if (i < videosToSend.length - 1) await delay(messageDelay / 2);
      }
      await delay(messageDelay);
    }

    if (sendPromoVideo && promoVideos.length > 0) {
      const promoVideo = promoVideos[0];
      console.log(`[Bot Materials] Sending promo video: ${promoVideo.name}`);

      const promoCaption = captionMap['video_promo'] || captionMap['video'] || '🎬 Confira nosso vídeo! ✨';
      const caption = promoCaption.replace(/\{unidade\}/gi, companyName).replace(/\{empresa\}/gi, companyName);
      await sendVideo(promoVideo.file_url, caption, 'promo_video');
      await delay(messageDelay * 1.5);
    }

    if (sendPdf && pdfPackages.length > 0) {
      const universalPdfs = pdfPackages.filter((pkg) => pkg.guest_count === null);
      const specificPdfs = pdfPackages.filter((pkg) => pkg.guest_count !== null);

      let pdfsToSend: typeof pdfPackages = [];

      if (universalPdfs.length > 0) {
        pdfsToSend = universalPdfs;
        console.log(`[Bot Materials] Found ${universalPdfs.length} universal PDFs`);
      } else if (guestCount && specificPdfs.length > 0) {
        let matchingPdf = specificPdfs.find((pkg) => pkg.guest_count === guestCount);
        if (!matchingPdf) {
          const sortedPackages = [...specificPdfs].sort((a, b) => (a.guest_count || 0) - (b.guest_count || 0));
          matchingPdf = sortedPackages.find((pkg) => (pkg.guest_count || 0) >= guestCount) || sortedPackages[sortedPackages.length - 1];
        }
        if (matchingPdf) pdfsToSend = [matchingPdf];
      }

      if (pdfsToSend.length > 0) {
        const firstPdf = pdfsToSend[0];
        console.log(`[Bot Materials] Sending ${pdfsToSend.length} PDF(s): ${firstPdf.name}`);

        const firstName = (botData.nome || '').split(' ')[0] || 'você';
        const pdfIntroText = pdfIntro
          .replace(/\{nome\}/gi, firstName)
          .replace(/\{convidados\}/gi, guestsStr)
          .replace(/\{unidade\}/gi, companyName)
          .replace(/\{empresa\}/gi, companyName);

        await sendText(pdfIntroText, 'pdf_intro');
        await delay(messageDelay / 4);

        for (let i = 0; i < pdfsToSend.length; i++) {
          const pdf = pdfsToSend[i];
          const isPkgImage = /\.(png|jpe?g|webp)(\?|$)/i.test(pdf.file_url || '');
          const cleanName = (pdf.name || 'Pacote').trim();
          if (isPkgImage) {
            await sendImage(pdf.file_url, cleanName, `pdf_image_${i + 1}`);
          } else {
            const sanitizedName = cleanName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
            const fileName = `${sanitizedName || 'Pacote'}.pdf`;
            await sendDocument(pdf.file_url, fileName, `pdf_document_${i + 1}`);
          }

          if (i < pdfsToSend.length - 1) await delay(2000);
        }

        await delay(messageDelay);
      }
    }

    if (sentAny) {
      await supabase.from('wapi_conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_content: '📄 Materiais enviados',
        last_message_from_me: true,
      }).eq('id', conv.id);
    }

    console.log(`[Bot Materials] Auto-send complete for ${phone}. Failures: ${failedSteps.join(', ') || 'none'}`);
    return { sentAny, failedSteps };
  } catch (err) {
    console.error('[Bot Materials] Fatal error during auto-send:', err);
    failedSteps.push('fatal_materials_error');
    return { sentAny, failedSteps };
  }
}

// Wrapper function that sends materials AND THEN the next step question
async function sendQualificationMaterialsThenQuestion(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string },
  botData: Record<string, string>,
  settings: {
    auto_send_materials?: boolean;
    auto_send_photos?: boolean;
    auto_send_presentation_video?: boolean;
    auto_send_promo_video?: boolean;
    auto_send_pdf?: boolean;
    auto_send_photos_intro?: string | null;
    auto_send_pdf_intro?: string | null;
    message_delay_seconds?: number;
  } | null,
  nextStepQuestion: string
) {
  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  const messageDelay = (settings?.message_delay_seconds || 5) * 1000;

  try {
    const materialResult = await sendQualificationMaterials(supabase, instance, conv, botData, settings);
    if (materialResult.failedSteps.length > 0) {
      console.warn(`[Bot] Material flow had partial failures for ${phone}: ${materialResult.failedSteps.join(', ')}`);
    }

    await delay(messageDelay);

    console.log(`[Bot] Sending next step question to ${phone}`);
    
    // Use sendInteractiveOrText so buttons are sent for Mega Magic Z-API
    const msgId = await sendInteractiveOrText(
      instance.instance_id,
      instance.instance_token,
      conv.remote_jid,
      nextStepQuestion,
      instance
    );

    if (!msgId) {
      console.warn(`[Bot] Next step question failed for ${phone}; recovery will retry later`);
      return;
    }

    // Save bot message to DB (sendInteractiveOrText bypasses wapi-send, so no auto-save)
    await supabase.from('wapi_messages').upsert({
      conversation_id: conv.id,
      message_id: msgId || `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      from_me: true,
      message_type: 'text',
      content: nextStepQuestion,
      status: msgId ? 'sent' : 'failed',
      timestamp: new Date().toISOString(),
      company_id: instance.company_id,
    }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });

    const { data: stepAdvanced } = await supabase.from('wapi_conversations').update({
      bot_step: 'proximo_passo',
      last_message_at: new Date().toISOString(),
      last_message_content: nextStepQuestion.substring(0, 100),
      last_message_from_me: true,
    }).eq('id', conv.id)
      .eq('bot_step', 'sending_materials')
      .select('id')
      .maybeSingle();

    if (!stepAdvanced) {
      console.log(`[Bot] bot_step already changed from sending_materials for conv ${conv.id}, skipping proximo_passo update`);
    }

    console.log(`[Bot] Next step question sent to ${phone}`);
  } catch (err) {
    console.error('[Bot] Error in sendQualificationMaterialsThenQuestion:', err);
  }
}

function isPdfContent(bytes: Uint8Array): boolean { return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; }

function getExt(mime: string, fn?: string): string {
  if (fn) { const p = fn.split('.'); if (p.length > 1) return p[p.length - 1].toLowerCase(); }
  const m: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };
  return m[mime] || 'bin';
}

async function downloadMedia(supabase: SupabaseClient, iId: string, iToken: string, msgId: string, type: string, fn?: string, mKey?: string | null, dPath?: string | null, mUrl?: string | null, mime?: string | null): Promise<{ url: string; fileName: string } | null> {
  try {
    // If no media key/path but we have a URL, try direct download
    if ((!mKey || !dPath) && mUrl && !mUrl.includes('supabase.co')) {
      console.log(`[${msgId}] No mediaKey/directPath, trying direct URL download: ${mUrl.substring(0, 60)}...`);
      try {
        const directRes = await fetch(mUrl);
        if (directRes.ok) {
          const ct = directRes.headers.get('content-type') || (type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'application/octet-stream');
          const rMime = ct.split(';')[0].trim();
          const buf = await directRes.arrayBuffer();
          if (buf.byteLength > 0) {
            const ext = getExt(rMime, fn);
            const path = `received/${type}s/${msgId}.${ext}`;
            console.log(`[${msgId}] Direct download: ${buf.byteLength} bytes, uploading to ${path}`);
            const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(path, buf, { contentType: rMime, upsert: true });
            if (!upErr) {
              const { data: signedUrlData } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 604800);
              if (signedUrlData?.signedUrl) {
                return { url: signedUrlData.signedUrl, fileName: fn || `${msgId}.${ext}` };
              }
            } else {
              console.error(`[${msgId}] Direct upload error:`, upErr.message);
            }
          }
        } else {
          console.log(`[${msgId}] Direct URL fetch failed: ${directRes.status}`);
        }
      } catch (e) {
        console.log(`[${msgId}] Direct URL download error:`, e instanceof Error ? e.message : String(e));
      }
      return null;
    }
    
    if (!mKey || !dPath) {
      console.log(`[${msgId}] Skipping download - missing mediaKey, directPath, and no usable URL`);
      return null;
    }
    
    console.log(`[${msgId}] Starting download for type: ${type}`);
    const defMime = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/ogg' : mime || 'application/pdf';
    const body = { messageId: msgId, type, mimetype: defMime, mediaKey: mKey, directPath: dPath, ...(mUrl && !mUrl.includes('supabase.co') ? { url: mUrl } : {}) };
    
    const res = await fetch(`${WAPI_BASE_URL}/message/download-media?instanceId=${iId}`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${iToken}` }, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[${msgId}] W-API download failed: ${res.status} - ${errText.substring(0, 200)}`);
      return null;
    }
    
    const r = await res.json();
    console.log(`[${msgId}] W-API response keys: ${Object.keys(r).join(', ')}`);
    
    let b64 = r.base64 || r.data || r.media;
    let rMime = r.mimetype || r.mimeType || defMime;
    const link = r.fileLink || r.file_link || r.url || r.link;
    
    // If W-API returns a fileLink instead of base64, fetch it
    if (!b64 && link) {
      console.log(`[${msgId}] Fetching from fileLink: ${link.substring(0, 50)}...`);
      const fr = await fetch(link);
      if (!fr.ok) {
        console.error(`[${msgId}] Failed to fetch fileLink: ${fr.status}`);
        return null;
      }
      const ct = fr.headers.get('content-type');
      if (ct) rMime = ct.split(';')[0].trim();
      
      const ab = await fr.arrayBuffer();
      const bytes = new Uint8Array(ab);
      console.log(`[${msgId}] Downloaded ${bytes.length} bytes from fileLink`);
      
      // PDF validation
      if (type === 'document' && rMime === 'application/pdf' && !isPdfContent(bytes)) {
        console.log(`[${msgId}] Invalid PDF content, skipping`);
        return null;
      }
      
      // Convert to base64 in chunks to avoid memory issues
      const CHUNK_SIZE = 32768;
      let bin = '';
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        bin += String.fromCharCode.apply(null, Array.from(chunk));
      }
      b64 = btoa(bin);
    }
    
    if (!b64) {
      console.log(`[${msgId}] No base64 data received from W-API`);
      return null;
    }
    
    console.log(`[${msgId}] Got base64 data, length: ${b64.length}`);
    
    // Decode base64 in chunks
    const bs = atob(b64);
    const bytes = new Uint8Array(bs.length);
    for (let i = 0; i < bs.length; i++) bytes[i] = bs.charCodeAt(i);
    
    // PDF validation
    if (type === 'document' && (rMime === 'application/pdf' || fn?.toLowerCase().endsWith('.pdf')) && !isPdfContent(bytes)) {
      console.log(`[${msgId}] Invalid PDF content after decode, skipping`);
      return null;
    }
    
    const ext = getExt(rMime, fn);
    const path = type === 'document' && fn ? `received/documents/${msgId}_${fn.replace(/[^a-zA-Z0-9\-_\.]/g, '_').substring(0, 100)}` : `received/${type}s/${msgId}.${ext}`;
    
    console.log(`[${msgId}] Uploading ${bytes.length} bytes to ${path}`);
    const { error } = await supabase.storage.from('whatsapp-media').upload(path, bytes, { contentType: rMime, upsert: true });
    
    if (error) {
      console.error(`[${msgId}] Storage upload error:`, error.message);
      return null;
    }
    
    // Use signed URL for private bucket (7-day expiry)
    const { data: signedUrlData, error: signedErr } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 604800);
    if (signedErr || !signedUrlData?.signedUrl) {
      console.error(`[${msgId}] Signed URL creation error:`, signedErr?.message);
      return null;
    }
    console.log(`[${msgId}] Upload successful, signed URL: ${signedUrlData.signedUrl.substring(0, 60)}...`);
    return { url: signedUrlData.signedUrl, fileName: fn || `${msgId}.${ext}` };
  } catch (err) {
    console.error(`[${msgId}] Download error:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Fetch profile picture and update conversation (fire-and-forget)
async function fetchAndUpdateProfilePicture(
  supabase: SupabaseClient,
  instanceId: string,
  instanceToken: string,
  conversationId: string,
  remoteJid: string,
  provider: string = 'wapi'
): Promise<void> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
    let picUrl: string | null = null;

    if (provider === 'zapi') {
      // Z-API profile picture endpoint
      const zapiBase = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}`;
      const res = await fetch(`${zapiBase}/profile-picture/${phone}`);
      if (res.ok) {
        const data = await res.json();
        picUrl = data?.link || data?.profilePictureUrl || data?.imgUrl || data?.url || null;
      }
    } else {
      // W-API profile picture endpoint
      const res = await fetch(
        `${WAPI_BASE_URL}/misc/profile-picture?instanceId=${instanceId}&phone=${phone}`,
        { headers: { 'Authorization': `Bearer ${instanceToken}` } }
      );
      
      if (!res.ok) {
        const res2 = await fetch(
          `${WAPI_BASE_URL}/contact/profile-picture?instanceId=${instanceId}&phone=${phone}`,
          { headers: { 'Authorization': `Bearer ${instanceToken}` } }
        );
        if (res2.ok) {
          const data2 = await res2.json();
          picUrl = data2?.profilePicture || data2?.profilePictureUrl || data2?.imgUrl || data2?.url || data2?.picture || null;
        }
      } else {
        const data = await res.json();
        picUrl = data?.profilePicture || data?.profilePictureUrl || data?.imgUrl || data?.url || data?.picture || null;
      }
    }

    if (picUrl) {
      await supabase.from('wapi_conversations').update({ contact_picture: picUrl }).eq('id', conversationId);
      console.log(`[ProfilePic] Updated profile picture for conversation ${conversationId} (${provider})`);
    }
  } catch (err) {
    // Silent fail - profile picture is not critical
    console.warn(`[ProfilePic] Failed to fetch profile picture:`, err instanceof Error ? err.message : String(err));
  }
}

/**
 * Detects when a contact_name is just digits (LID or raw phone) and tries to
 * fetch the real saved name from the WhatsApp provider's contact API. Works
 * only if the buffet has the contact saved on their WhatsApp agenda. Silent
 * fallback when not available.
 */
async function fetchAndUpdateContactName(
  supabase: SupabaseClient,
  instanceId: string,
  instanceToken: string,
  clientToken: string | null,
  conversationId: string,
  remoteJid: string,
  currentName: string | null,
  provider: string = 'wapi'
): Promise<void> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
    const cleanName = (currentName || '').trim();
    const isNumeric = !cleanName || /^[\d\s+()-]+$/.test(cleanName);
    if (!isNumeric) return;

    let resolvedName: string | null = null;

    if (provider === 'zapi') {
      const zapiBase = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}`;
      const headers: Record<string, string> = {};
      if (clientToken) headers['Client-Token'] = clientToken;
      try {
        const res = await fetch(`${zapiBase}/contacts/${phone}`, { headers });
        if (res.ok) {
          const data = await res.json();
          resolvedName = data?.name || data?.short || data?.notify || data?.vname || null;
        }
      } catch { /* ignore */ }
      if (!resolvedName) {
        try {
          const res = await fetch(`${zapiBase}/chats/${phone}`, { headers });
          if (res.ok) {
            const data = await res.json();
            resolvedName = data?.name || data?.contactName || null;
          }
        } catch { /* ignore */ }
      }
    } else {
      const tryEndpoints = [
        `${WAPI_BASE_URL}/contacts/contact-info?instanceId=${instanceId}&phoneNumber=${phone}`,
        `${WAPI_BASE_URL}/contacts/contact-info?instanceId=${instanceId}&phone=${phone}`,
        `${WAPI_BASE_URL}/contact/info?instanceId=${instanceId}&phone=${phone}`,
        `${WAPI_BASE_URL}/contacts?instanceId=${instanceId}&phone=${phone}`,
      ];
      for (const url of tryEndpoints) {
        try {
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${instanceToken}` } });
          if (!res.ok) continue;
          const data = await res.json();
          resolvedName = data?.name || data?.contact?.name || data?.pushname
            || data?.pushName || data?.verifiedName || data?.verifiedBizName
            || data?.shortName || data?.notify || null;
          if (resolvedName) break;
        } catch { /* try next */ }
      }
    }

    if (resolvedName) {
      const trimmed = String(resolvedName).trim();
      if (trimmed && !/^[\d\s+()-]+$/.test(trimmed)) {
        await supabase.from('wapi_conversations').update({ contact_name: trimmed }).eq('id', conversationId);
        console.log(`[ContactName] Resolved "${cleanName}" → "${trimmed}" via ${provider} API for conv ${conversationId}`);
      }
    }
  } catch (err) {
    console.warn(`[ContactName] Failed to fetch contact name:`, err instanceof Error ? err.message : String(err));
  }
}

function extractMsgContent(mc: JsonRecord, msg: JsonRecord) {
  let type = 'text', content = '', url: string | null = null, key: string | null = null, path: string | null = null, fn: string | undefined, download = false, mime: string | null = null;
  
  if (mc.locationMessage) { type = 'location'; const l = mc.locationMessage as JsonRecord; content = `📍 Localização: ${(l.degreesLatitude as number)?.toFixed(6) || '?'}, ${(l.degreesLongitude as number)?.toFixed(6) || '?'}`; }
  else if (mc.liveLocationMessage) { type = 'location'; content = '📍 Localização ao vivo'; }
  else if (mc.contactMessage || mc.contactsArrayMessage) {
    type = 'contact';
    if (mc.contactsArrayMessage) {
      const arr = (mc.contactsArrayMessage as JsonRecord).contacts as Array<JsonRecord> | undefined;
      console.log(`[Contact] contactsArrayMessage received, contacts count: ${arr?.length || 0}`);
      if (arr && arr.length > 0) {
        const parts = arr.map((c) => {
          const name = c.displayName || 'Contato';
          const vcard = c.vcard as string | undefined;
          console.log(`[Contact] Array vCard for "${name}":`, vcard?.substring(0, 200));
          const phone = vcard?.match(/TEL[^:]*:([\d+\- ()]+)/)?.[1]?.replace(/[\s\-()]/g, '') || '';
          return phone ? `${name} - ${phone}` : String(name);
        });
        content = `👤 ${parts.join(' | ')}`;
      } else {
        content = '👤 Contato';
      }
    } else {
      const cm = mc.contactMessage as JsonRecord;
      const displayName = cm?.displayName || 'Contato';
      const vcard = cm?.vcard as string | undefined;
      console.log(`[Contact] contactMessage received for "${displayName}", vCard:`, vcard?.substring(0, 300));
      const phone = vcard?.match(/TEL[^:]*:([\d+\- ()]+)/)?.[1]?.replace(/[\s\-()]/g, '') || '';
      console.log(`[Contact] Extracted phone: "${phone}"`);
      content = phone ? `👤 ${displayName} - ${phone}` : `👤 ${displayName}`;
    }
  }
  else if (mc.stickerMessage) { type = 'sticker'; content = '🎭 Figurinha'; }
  // Z-API interactive response: button click
  else if (mc.buttonsResponseMessage) {
    const br = mc.buttonsResponseMessage as JsonRecord;
    const replyText = extractZapiInteractiveText(br);
    const replyId = extractZapiInteractiveId(br);
    content = replyText || replyId;
    console.log(`[Interactive] Button response received: id=${replyId}, text="${replyText}", content="${content}"`);
  }
  // Z-API interactive response: list selection
  else if (mc.listResponseMessage) {
    const lr = mc.listResponseMessage as JsonRecord;
    const replyText = extractZapiInteractiveText(lr);
    const replyId = extractZapiInteractiveId(lr);
    content = replyText || replyId;
    console.log(`[Interactive] List response received: content="${content}", raw=${JSON.stringify(lr).substring(0, 200)}`);
  }
  else if (mc.reactionMessage) return null;
  else if (mc.pollCreationMessage || mc.pollUpdateMessage) { type = 'poll'; content = '📊 Enquete'; }
  else if ((mc as JsonRecord).conversation) content = (mc as Record<string, string>).conversation;
  else if ((mc.extendedTextMessage as JsonRecord)?.text) content = ((mc.extendedTextMessage as JsonRecord).text as string);
  else if (mc.imageMessage) { const m = mc.imageMessage as JsonRecord; type = 'image'; content = (m.caption as string) || '[Imagem]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.videoMessage) { const m = mc.videoMessage as JsonRecord; type = 'video'; content = (m.caption as string) || '[Vídeo]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.audioMessage) { const m = mc.audioMessage as JsonRecord; type = 'audio'; content = '[Áudio]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentMessage) { const m = mc.documentMessage as JsonRecord; type = 'document'; content = (m.fileName as string) || '[Documento]'; fn = m.fileName as string; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentWithCaptionMessage) { const d = ((mc.documentWithCaptionMessage as JsonRecord).message as JsonRecord)?.documentMessage as JsonRecord; if (d) { type = 'document'; content = (d.caption as string) || (d.fileName as string) || '[Documento]'; fn = d.fileName as string; url = d.url as string || null; key = d.mediaKey as string || null; path = d.directPath as string || null; download = true; mime = d.mimetype as string || null; } }
  else if ((msg as Record<string, string>).body || (msg as Record<string, string>).text) content = (msg as Record<string, string>).body || (msg as Record<string, string>).text;
  
  return { type, content, url, key, path, fn, download, mime };
}

function getPreview(mc: JsonRecord, msg: JsonRecord): string {
  if ((mc as JsonRecord).conversation) return (mc as Record<string, string>).conversation;
  if ((mc.extendedTextMessage as JsonRecord)?.text) return ((mc.extendedTextMessage as JsonRecord).text as string);
  if (mc.imageMessage) return '📷 Imagem';
  if (mc.videoMessage) return '🎥 Vídeo';
  if (mc.audioMessage) return '🎤 Áudio';
  if (mc.documentMessage) return '📄 ' + ((mc.documentMessage as JsonRecord).fileName || 'Documento');
  if (mc.documentWithCaptionMessage) return '📄 ' + (((mc.documentWithCaptionMessage as JsonRecord).message as JsonRecord)?.documentMessage as JsonRecord)?.fileName || 'Documento';
  if (mc.locationMessage) return '📍 Localização';
  if (mc.contactMessage || mc.contactsArrayMessage) return '👤 Contato';
  if (mc.stickerMessage) return '🎭 Figurinha';
  return (msg as Record<string, string>).body || (msg as Record<string, string>).text || '';
}

// ============= FASE 7.1: VISIT CONFIRMATION RESPONSE HANDLER =============

async function handleVisitConfirmationResponse(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null },
  content: string
): Promise<boolean> {
  if (!conv.lead_id) return false;

  // Parse response: 1/confirmo or 2/remarcar
  const normalized = content.trim().toLowerCase();
  let optionNum: number | null = null;

  // Try plain number
  const numMatch = normalized.replace(/[^\d]/g, '');
  if (/^[12]$/.test(numMatch)) optionNum = parseInt(numMatch);

  // Try emoji keycap
  if (!optionNum) {
    const emojiNum = emojiDigitsToNumber(content.trim());
    if (emojiNum && emojiNum >= 1 && emojiNum <= 2) optionNum = emojiNum;
  }

  // Try text matching
  if (!optionNum) {
    const clean = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (clean.includes('confirmo') || clean.includes('confirmado') || clean.includes('sim')) optionNum = 1;
    else if (clean.includes('remarcar') || clean.includes('remarca') || clean.includes('reagendar')) optionNum = 2;
  }

  if (!optionNum) return false;

  // Check for pending visit confirmation on this conversation (max 72h)
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: pendingConfirmation } = await supabase
    .from('visit_confirmation_history')
    .select('id, visit_id, company_id, sent_at')
    .eq('company_id', instance.company_id)
    .eq('status', 'sent')
    .eq('response_received', false)
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (!pendingConfirmation || pendingConfirmation.length === 0) return false;

  // Find the confirmation for this lead's visit
  const visitIds = pendingConfirmation.map(p => p.visit_id);
  const { data: matchingVisits } = await supabase
    .from('lead_visits')
    .select('id, lead_id')
    .in('id', visitIds)
    .eq('lead_id', conv.lead_id)
    .limit(1);

  if (!matchingVisits || matchingVisits.length === 0) return false;

  const visit = matchingVisits[0];
  const confirmation = pendingConfirmation.find(p => p.visit_id === visit.id);
  if (!confirmation) return false;

  console.log(`[Visit Confirmation] Lead ${conv.lead_id} chose option ${optionNum} for visit ${visit.id}`);

  const responseType = optionNum === 1 ? 'confirmed' : 'reschedule';
  const newVisitStatus = optionNum === 1 ? 'confirmada' : 'remarcada';

  // Update confirmation history
  await supabase.from('visit_confirmation_history')
    .update({
      response_received: true,
      response_type: responseType,
      response_at: new Date().toISOString(),
      status: 'responded',
    })
    .eq('id', confirmation.id);

  // Update visit status
  await supabase.from('lead_visits')
    .update({ status_visita: newVisitStatus })
    .eq('id', visit.id);

  // Record in lead_history
  const actionText = optionNum === 1
    ? 'Visita confirmada pelo cliente (automação)'
    : 'Cliente solicitou remarcação de visita (automação)';

  await supabase.from('lead_history').insert({
    lead_id: conv.lead_id,
    action: actionText,
    new_value: newVisitStatus,
    user_name: 'Sistema (Confirmação de Visita)',
  });

  // Send auto-reply to the lead confirming their response
  // Load custom reply messages from settings
  const { data: vcSettings } = await supabase
    .from('visit_confirmation_settings')
    .select('reply_confirmed_message, reply_reschedule_message')
    .eq('company_id', instance.company_id)
    .maybeSingle();

  const defaultConfirmed = `Ótimo, sua visita está *confirmada*! ✅\n\nEstamos te esperando! Qualquer dúvida, é só chamar aqui. 😊`;
  const defaultReschedule = `Entendido! 📝\n\nNossa equipe vai entrar em contato para remarcar sua visita. Aguarde! 😊`;

  let replyMsg = '';
  if (optionNum === 1) {
    replyMsg = vcSettings?.reply_confirmed_message || defaultConfirmed;
  } else {
    replyMsg = vcSettings?.reply_reschedule_message || defaultReschedule;
  }

  const replyMsgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, replyMsg);
  if (replyMsgId) {
    await supabase.from('wapi_messages').upsert({
      conversation_id: conv.id,
      message_id: replyMsgId,
      from_me: true,
      message_type: 'text',
      content: replyMsg,
      status: 'sent',
      timestamp: new Date().toISOString(),
      company_id: instance.company_id,
      metadata: { source: 'visit_confirmation', type: 'response' },
    }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });

    await supabase.from('wapi_conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_content: replyMsg.substring(0, 100),
      last_message_from_me: true,
    }).eq('id', conv.id);
  }

  // If reschedule, notify team
  if (optionNum === 2) {
    const { data: lead } = await supabase.from('campaign_leads')
      .select('name')
      .eq('id', conv.lead_id)
      .single();

    const leadName = lead?.name || 'Lead';

    // Get company users to notify
    const { data: companyUsers } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', instance.company_id);

    for (const cu of companyUsers || []) {
      await supabase.from('notifications').insert({
        user_id: cu.user_id,
        company_id: instance.company_id,
        type: 'visit_reschedule',
        title: '📅 Visita precisa ser remarcada',
        message: `${leadName} solicitou remarcação da visita`,
        data: { lead_id: conv.lead_id, visit_id: visit.id },
      });
    }
  }

  return true;
}

// ============= FASE 4B: REACTIVATION RESPONSE HANDLER =============

async function handleReactivationResponse(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null },
  content: string
): Promise<boolean> {
  // Only handle if conversation has a lead
  if (!conv.lead_id) return false;

  // Parse option number from response (1, 2, 3 or emoji variants)
  const normalized = content.trim().replace(/[^\d]/g, '');
  let optionNum: number | null = null;
  
  // Try plain number
  if (/^[123]$/.test(normalized)) {
    optionNum = parseInt(normalized);
  }
  // Try emoji keycap
  if (!optionNum) {
    const emojiNum = emojiDigitsToNumber(content.trim());
    if (emojiNum && emojiNum >= 1 && emojiNum <= 3) optionNum = emojiNum;
  }
  // Try "opção X" pattern
  if (!optionNum) {
    const match = content.trim().match(/op[çc][aã]o\s*(\d)/i);
    if (match) {
      const n = parseInt(match[1]);
      if (n >= 1 && n <= 3) optionNum = n;
    }
  }

  if (!optionNum) return false;

  // Check for pending interactive reactivation on this conversation
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(); // max 72h safety
  const { data: pendingReactivation } = await supabase
    .from('lead_reactivation_history')
    .select('id, lead_id, company_id, reactivation_stage, sent_at')
    .eq('conversation_id', conv.id)
    .eq('status', 'sent')
    .eq('is_interactive', true)
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingReactivation) return false;

  // Check capture window from settings
  const { data: reactivationSettings } = await supabase
    .from('automation_reactivation_settings')
    .select('capture_window_hours, pause_days_on_analyzing, option_1_label, option_2_label, option_3_label')
    .eq('company_id', pendingReactivation.company_id)
    .eq('interactive_options_enabled', true)
    .maybeSingle();

  if (!reactivationSettings) return false;

  // Verify within capture window
  const sentAt = new Date(pendingReactivation.sent_at).getTime();
  const windowMs = (reactivationSettings.capture_window_hours || 48) * 60 * 60 * 1000;
  if (Date.now() - sentAt > windowMs) {
    console.log(`[Reactivation 4B] Response outside capture window for conv ${conv.id}`);
    return false;
  }

  // Check if a human already replied after the reactivation
  const { data: humanReply } = await supabase
    .from('wapi_messages')
    .select('id')
    .eq('conversation_id', conv.id)
    .eq('from_me', true)
    .gt('timestamp', pendingReactivation.sent_at)
    .is('metadata', null) // human messages don't have metadata.source
    .limit(1)
    .maybeSingle();

  // Also check messages with metadata that don't have reactivation source
  if (!humanReply) {
    const { data: humanReply2 } = await supabase
      .from('wapi_messages')
      .select('id, metadata')
      .eq('conversation_id', conv.id)
      .eq('from_me', true)
      .gt('timestamp', pendingReactivation.sent_at)
      .limit(5);
    
    const hasHumanMsg = (humanReply2 || []).some(m => {
      const meta = m.metadata as JsonRecord | null;
      return !meta || meta.source !== 'reactivation_engine';
    });
    if (hasHumanMsg) {
      console.log(`[Reactivation 4B] Human already replied after reactivation, skipping auto-response`);
      return false;
    }
  }

  const optionLabels = [
    reactivationSettings.option_1_label || 'Ainda tenho interesse na festa',
    reactivationSettings.option_2_label || 'Quero ver os valores', 
    reactivationSettings.option_3_label || 'Ainda estou analisando',
  ];
  const optionLabel = optionLabels[optionNum - 1];

  console.log(`[Reactivation 4B] ✅ Lead ${conv.lead_id} chose option ${optionNum}: "${optionLabel}"`);

  let actionExecuted = '';

  // === OPTION 1: Ainda tenho interesse ===
  if (optionNum === 1) {
    actionExecuted = 'status_cliente_retorno';
    
    // Update lead status to cliente_retorno
    await supabase.from('campaign_leads')
      .update({ status: 'cliente_retorno' })
      .eq('id', conv.lead_id);

    // Record in lead_history
    await supabase.from('lead_history').insert({
      lead_id: conv.lead_id,
      action: 'Lead reativado automaticamente',
      new_value: 'Cliente Retorno (Reativação 4B)',
      user_name: 'Sistema (Reativação Inteligente)',
    });

    // Notify responsavel
    const { data: lead } = await supabase.from('campaign_leads')
      .select('name, responsavel_id')
      .eq('id', conv.lead_id)
      .single();

    if (lead) {
      // Get company users to notify
      const { data: companyUsers } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', pendingReactivation.company_id);

      const userIds = (companyUsers || []).map(u => u.user_id);
      // Notify responsavel or all company users
      const notifyIds = lead.responsavel_id ? [lead.responsavel_id] : userIds;

      for (const userId of notifyIds) {
        await supabase.from('notifications').insert({
          user_id: userId,
          company_id: pendingReactivation.company_id,
          type: 'lead_reactivated',
          title: '🔄 Lead reativado!',
          message: `${lead.name || 'Lead'} respondeu à reativação: "${optionLabel}"`,
          data: { lead_id: conv.lead_id, option: optionNum },
        });
      }
    }
  }

  // === OPTION 2: Quero ver os valores ===
  if (optionNum === 2) {
    actionExecuted = 'send_pdf_values';
    
    // Send PDF values - reuse existing sales_materials mechanism
    const unit = instance.unit;
    if (unit) {
      const { data: pdfMats } = await supabase.from('sales_materials')
        .select('*')
        .eq('company_id', instance.company_id)
        .eq('type', 'pdf_package')
        .eq('unit', unit)
        .eq('is_active', true)
        .order('guest_count');

      const pdfsToSend = pdfMats?.filter(p => p.guest_count === null) || // universal first
        (pdfMats && pdfMats.length > 0 ? [pdfMats[0]] : []);

      for (const pdf of pdfsToSend) {
        const isImage = /\.(png|jpe?g|webp)(\?|$)/i.test(pdf.file_url || '');
        const cleanName = (pdf.name || 'Valores').trim();
        if (isImage) {
          const msgId = await sendBotImage(instance.instance_id, instance.instance_token, conv.remote_jid, pdf.file_url, cleanName);
          if (msgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id, message_id: msgId, from_me: true,
              message_type: 'image', content: cleanName, media_url: pdf.file_url,
              status: 'sent', timestamp: new Date().toISOString(),
              company_id: instance.company_id,
              metadata: { source: 'reactivation_4b', action: 'send_values' },
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
        } else {
          const fileName = (cleanName.replace(/[^a-zA-Z0-9\s\-]/g, '').trim() || 'Valores') + '.pdf';
          const msgId = await sendBotDocument(instance.instance_id, instance.instance_token, conv.remote_jid, pdf.file_url, fileName);
          if (msgId) {
            await supabase.from('wapi_messages').upsert({
              conversation_id: conv.id, message_id: msgId, from_me: true,
              message_type: 'document', content: fileName, media_url: pdf.file_url,
              status: 'sent', timestamp: new Date().toISOString(),
              company_id: instance.company_id,
              metadata: { source: 'reactivation_4b', action: 'send_values' },
            }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
          }
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      if (pdfsToSend.length === 0) {
        // No PDFs available, send text fallback
        const fallbackMsg = 'Opa! Vou verificar os valores atualizados e já te envio. Aguarda só um momento! 😊';
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, fallbackMsg);
        if (msgId) {
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: fallbackMsg,
            status: 'sent', timestamp: new Date().toISOString(),
            company_id: instance.company_id,
            metadata: { source: 'reactivation_4b', action: 'send_values_fallback' },
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
        }
      }
    }

    // Record in lead_history
    await supabase.from('lead_history').insert({
      lead_id: conv.lead_id,
      action: 'Reativação: lead pediu valores',
      new_value: 'PDF de valores enviado automaticamente',
      user_name: 'Sistema (Reativação Inteligente)',
    });
  }

  // === OPTION 3: Ainda estou analisando ===
  if (optionNum === 3) {
    actionExecuted = 'pause_reactivation';
    
    // Send acknowledgment
    const ackMsg = 'Sem problemas! 😊 Qualquer dúvida, é só chamar. Estamos aqui!';
    const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, ackMsg);
    if (msgId) {
      await supabase.from('wapi_messages').upsert({
        conversation_id: conv.id, message_id: msgId, from_me: true,
        message_type: 'text', content: ackMsg,
        status: 'sent', timestamp: new Date().toISOString(),
        company_id: instance.company_id,
        metadata: { source: 'reactivation_4b', action: 'pause_ack' },
      }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
    }

    // Record in lead_history
    await supabase.from('lead_history').insert({
      lead_id: conv.lead_id,
      action: 'Reativação: lead analisando',
      new_value: `Reativação pausada por ${reactivationSettings.pause_days_on_analyzing} dias`,
      user_name: 'Sistema (Reativação Inteligente)',
    });
  }

  // Update reactivation history with response
  await supabase.from('lead_reactivation_history')
    .update({
      status: 'replied',
      option_selected: optionNum,
      option_label: optionLabel,
      selected_at: new Date().toISOString(),
      action_executed: actionExecuted,
    })
    .eq('id', pendingReactivation.id);

  // Update conversation
  await supabase.from('wapi_conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_from_me: optionNum !== 1, // for option 1, let human take over
  }).eq('id', conv.id);

  return true;
}

// Background processor - runs after response is sent
async function processWebhookEvent(body: JsonRecord) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const rawWebhookEventId = typeof body[RAW_WEBHOOK_EVENT_ID_FIELD] === 'string' ? body[RAW_WEBHOOK_EVENT_ID_FIELD] as string : null;
  delete body[RAW_WEBHOOK_EVENT_ID_FIELD];
  await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'processing' });
  
  const { event, instanceId, data } = body;
  const { data: instance, error: iErr } = await supabase.from('wapi_instances').select('*').eq('instance_id', instanceId).single();
  if (iErr || !instance) {
    console.log('Instance not found:', instanceId);
    await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'ignored', processing_note: 'instance_not_found' });
    return;
  }

  // Set active provider for all bot send functions in this request
  setActiveProvider(instance.provider, instance.client_token);

  if (instance.provider === 'zapi') {
    waitUntil(reinforceZapiNotifySentByMe(instance as JsonRecord, 'webhook-received'));
  }

  // === AUTO-RECOVERY: If webhook arrives but DB says disconnected/degraded, the instance IS connected ===
  if (instance.status === 'disconnected' || instance.status === 'degraded') {
    console.warn(`[Webhook] ⚡ Message received for instance ${instanceId} but DB status is "${instance.status}". Auto-recovering status to connected...`);
    const recoveredAt = new Date().toISOString();
    await supabase.from('wapi_instances').update({ 
      status: 'connected', 
      connected_at: recoveredAt 
    }).eq('id', instance.id);
    // Update local reference so rest of handler uses correct status
    instance.status = 'connected';
    instance.connected_at = recoveredAt;
  }

  let evt = event || body.event;

  // If event is undefined but body contains message-like data, treat as message
  if (!evt) {
    const rawD = data as JsonRecord | undefined;
    const hasKey = rawD?.key || body.key;
    const hasRemoteJid = rawD?.key?.remoteJid || rawD?.remoteJid || rawD?.from || body.key?.remoteJid || body.remoteJid || body.from;
    const hasMessageContent = rawD?.message || rawD?.msgContent || rawD?.body || rawD?.text || body.message || body.body || body.text || body.msgContent;
    // Also check for media-specific fields
    const hasMediaContent = rawD?.message?.imageMessage || rawD?.message?.videoMessage || rawD?.message?.audioMessage || rawD?.message?.documentMessage || body.message?.imageMessage || body.message?.videoMessage || body.message?.audioMessage || body.message?.documentMessage;
    // Check for messageId (delivery/status events)
    const hasMessageId = body.messageId || rawD?.messageId;
    const hasStatus = body.status || rawD?.status || body.ack !== undefined || rawD?.ack !== undefined;
    
    if (hasKey || (hasRemoteJid && (hasMessageContent || hasMediaContent))) {
      console.log('[Webhook] No event field but message data detected, routing as messages.upsert');
      evt = 'messages.upsert';
    } else if (hasMessageId && (hasStatus || body.fromMe !== undefined)) {
      console.log('[Webhook] No event field but status/delivery data detected, routing as webhookDelivery');
      evt = 'webhookDelivery';
    } else {
      // Log body keys for debugging unknown events
      const bodyKeys = Object.keys(body).join(', ');
      const dataKeys = rawD ? Object.keys(rawD).join(', ') : 'none';
      console.log(`[Webhook] Unroutable event. body keys: [${bodyKeys}], data keys: [${dataKeys}]`);
    }
  }

  // === PHASE 2: Route status-like events without 'event' field ===
  // Events with { instanceId, connectedPhone, chat, status, moment } but no event field
  if (!evt && (body.connectedPhone || body.connectedLid)) {
    const connPhone = body.connectedPhone || null;
    console.log(`[Webhook] Status-like event detected for instance ${instanceId}. connectedPhone=${connPhone}, status=${body.status}, chat=${JSON.stringify(body.chat)?.substring(0, 100)}`);
    
    // If connectedPhone present, treat as connection confirmation
    if (connPhone) {
      await supabase.from('wapi_instances').update({ 
        status: 'connected', 
        phone_number: connPhone, 
        connected_at: new Date().toISOString() 
      }).eq('id', instance.id);
      console.log(`[Webhook] Updated instance ${instanceId} as connected with phone ${connPhone}`);
    }
    // Don't break - let it fall through to log if needed
    return;
  }

  // 🛡️ GLOBAL GUARD: Silently drop ANY event whose JID looks like a WhatsApp
  // Status broadcast feed, "@broadcast" list, or "@newsletter" channel. These
  // are NOT real conversations and historically polluted the chat list with a
  // ghost contact (ex: "AbracadabraFestass" / contact_phone="status") that the
  // bot kept replying to. We scan every common JID field in the payload and
  // short-circuit the entire dispatcher before any reducer can create/update
  // a wapi_conversation row.
  try {
    const _d = (data as JsonRecord) || {};
    const _b = (body as JsonRecord) || {};
    const _candidateJids: unknown[] = [
      _d?.key?.remoteJid, _d?.remoteJid, _d?.from, _d?.chat?.id, _d?.sender?.id,
      _d?.key?.participant, _d?.participant, _d?.author, _d?.key?.participantPn,
      _b?.key?.remoteJid, _b?.remoteJid, _b?.from, _b?.chat?.id, _b?.sender?.id,
      _b?.key?.participant, _b?.participant, _b?.author,
      (_d?.message as JsonRecord)?.key?.remoteJid,
    ];
    const _looksLikeStatus = (v: unknown) => {
      if (typeof v !== 'string') return false;
      const s = v.toLowerCase();
      return s.includes('@broadcast') || s.includes('@newsletter')
        || s.startsWith('status@') || s === 'status';
    };
    if (_candidateJids.some(_looksLikeStatus)) {
      console.log(`[Webhook] 🛡️ Global guard dropped status/broadcast/newsletter event (evt=${evt})`);
      await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'ignored', processing_note: 'status_broadcast_guard' });
      return;
    }
  } catch (_guardErr) {
    // Never let the guard itself break message processing
  }

  try {
    switch (evt) {
    case 'connection': case 'webhookConnected': {
      const c = (data as JsonRecord)?.connected ?? body.connected ?? false;
      const connPhone = (data as JsonRecord)?.phone || body.connectedPhone || null;
      
      // === PHASE 2: Don't mark as 'connected' without a phone number ===
      if (c && !connPhone) {
        console.warn(`[Webhook] Connection event for ${instanceId} says connected but NO phone number. Marking as degraded.`);
        await supabase.from('wapi_instances').update({ 
          status: 'degraded',
          connected_at: new Date().toISOString(),
        }).eq('id', instance.id);
      } else {
        await supabase.from('wapi_instances').update({ 
          status: c ? 'connected' : 'disconnected', 
          phone_number: connPhone, 
          connected_at: c ? new Date().toISOString() : null 
        }).eq('id', instance.id);
      }
      break;
    }
    case 'disconnection': case 'webhookDisconnected':
      await supabase.from('wapi_instances').update({ status: 'disconnected', connected_at: null }).eq('id', instance.id);
      // === Notify company users about disconnection ===
      try {
        const unitName = instance.unit || instance.instance_id || 'WhatsApp';
        const { data: companyUsers } = await supabase
          .from('user_companies')
          .select('user_id')
          .eq('company_id', instance.company_id);
        if (companyUsers && companyUsers.length > 0) {
          const notifications = companyUsers.map((u: any) => ({
            user_id: u.user_id,
            company_id: instance.company_id,
            type: 'instance_disconnected',
            title: '⚠️ WhatsApp desconectado',
            message: `WhatsApp da unidade ${unitName} perdeu conexão. Reconecte via QR Code em Configurações.`,
            data: { instance_id: instance.id, instance_name: unitName },
          }));
          await supabase.from('notifications').insert(notifications);
          console.log(`[Webhook] Disconnect notification sent to ${companyUsers.length} users for instance ${instance.id}`);
        }
      } catch (notifErr) {
        console.error(`[Webhook] Error sending disconnect notification:`, notifErr);
      }
      break;
    case 'call': case 'webhookCall': case 'call_offer': case 'call_reject': case 'call_timeout': break;
    case 'message': case 'message-received': case 'messages.upsert': case 'webhookReceived': {
      // ⏱️ LATENCY: Start timing at beginning of message processing
      const processingStartAt = Date.now();
      
       // For messages.upsert, the message data is directly in `data` (with key, pushName, message, etc.)
      // For other events, message may be nested in data.message
      const rawData = data as JsonRecord;
      console.log(`[Debug-0] evt=${evt}, rawData keys: [${rawData ? Object.keys(rawData).join(',') : 'null'}], body keys: [${Object.keys(body).join(',')}]`);
      const msg = rawData?.key ? rawData : (rawData?.message as JsonRecord) || rawData || body;
      if (!msg) { console.log('[Debug-0] msg is null, breaking'); break; }
      const mc = (msg as JsonRecord).message || (msg as JsonRecord).msgContent || {};
      console.log(`[Debug-0] msg keys: [${Object.keys(msg as object).join(',')}], mc keys: [${Object.keys(mc as object).join(',')}], mc type: ${typeof mc}`);
      if ((mc as JsonRecord).protocolMessage) break;
      
      let rj = (msg as JsonRecord).key?.remoteJid || (msg as JsonRecord).from || (msg as JsonRecord).remoteJid || ((msg as JsonRecord).chat?.id ? `${(msg as JsonRecord).chat?.id}` : null) || ((msg as JsonRecord).sender?.id ? `${(msg as JsonRecord).sender?.id}@s.whatsapp.net` : null);
      if (!rj) break;
      // Ignore WhatsApp status broadcasts — they are not real conversations and must
      // never create rows or trigger the bot. Examples: "status@broadcast", "*@broadcast".
      // Also check participant/author fields: WhatsApp Status events sometimes route the
      // poster's JID through these fields, which historically contaminated real leads.
      const _participantJid = (msg as JsonRecord).key?.participant
        || (msg as JsonRecord).participant
        || (msg as JsonRecord).author
        || (msg as JsonRecord).key?.participantPn
        || null;

      // === JID NORMALIZER: fonte única de verdade para classificação/canonical ===
      const rjNorm = normalizeJid(rj);
      const partNorm = normalizeJid(_participantJid);
      if (rjNorm.shouldIgnore || partNorm.kind === 'broadcast' || partNorm.kind === 'newsletter') {
        console.log(`[Webhook] Skipping ${rjNorm.kind}/${partNorm.kind} event: rj=${rj}, participant=${_participantJid}`);
        await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'ignored', processing_note: `jid_${rjNorm.kind === 'individual' ? partNorm.kind : rjNorm.kind}` });
        break;
      }
      // Use canonical form for groups/individuals (lid mantém-se p/ resolução abaixo)
      if (rjNorm.kind === 'individual' || rjNorm.kind === 'group') {
        rj = rjNorm.canonical;
      }
      const isGrp = rjNorm.kind === 'group';

      const fromMe = (msg as JsonRecord).key?.fromMe || (msg as JsonRecord).fromMe || false;
      const msgId = (msg as JsonRecord).key?.id || (msg as JsonRecord).id || (msg as JsonRecord).messageId;
      const isLidJid = rjNorm.kind === 'lid';
      const originalLidJid = isLidJid ? (rj as string) : null;
      let isUnresolvedInboundLid = false;
      let resolvedLidConv: JsonRecord | null = null;
      if (isLidJid) {
        resolvedLidConv = await resolveLidConversation(supabase, instance.id, rj as string, msgId, msg as JsonRecord);
        if (resolvedLidConv?.remote_jid) {
          rj = resolvedLidConv.remote_jid;
        } else {
          // Inbound W-API/Z-API messages can arrive only with WhatsApp's private
          // @lid identifier. Dropping them makes real client messages disappear
          // from the platform. Keep inbound messages visible, but mark the thread
          // as unresolved so automation does not reply to an unsafe destination.
          if (!fromMe) {
            isUnresolvedInboundLid = true;
            console.warn(`[Webhook] Preserving unresolved inbound @lid message without bot auto-reply: ${rj}`);
          } else {
            console.log(`[Webhook] Ignoring unresolved outgoing @lid echo/status (fromMe=${fromMe}): ${rj}`);
            break;
          }
        }
      }
      const phone = (rj as string).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');

      // If we mapped a @lid → real phone, propagate the real phone to any existing
      // LID-based conversation rows so future plataforma → celular sends use the
      // real number instead of the LID digits (which Z-API silently drops).
      if (originalLidJid && resolvedLidConv?.remote_jid && !String(resolvedLidConv.remote_jid).includes('@lid')) {
        const realPhoneDigits = phone.replace(/\D/g, '');
        if (realPhoneDigits && realPhoneDigits.startsWith('55')) {
          waitUntil((async () => {
            const { error: updErr } = await supabase
              .from('wapi_conversations')
              .update({ contact_phone: realPhoneDigits })
              .eq('instance_id', instance.id)
              .eq('remote_jid', originalLidJid);
            if (updErr) {
              console.warn(`[Webhook] Failed to backfill contact_phone on LID conversation ${originalLidJid}:`, updErr.message);
            } else {
              console.log(`[Webhook] ✅ Backfilled real phone ${realPhoneDigits} on LID conversation ${originalLidJid}`);
            }
          })());
        }
      }
      
      
      let cName = isGrp ? ((msg as JsonRecord).chat?.name || (msg as JsonRecord).groupName || (msg as JsonRecord).subject || null) : ((msg as JsonRecord).pushName || (msg as JsonRecord).verifiedBizName || (msg as JsonRecord).sender?.pushName || (msg as JsonRecord).sender?.name || (msg as JsonRecord).senderName || (msg as JsonRecord).chat?.name || phone);
      const cPic = (msg as JsonRecord).chat?.profilePicture || (msg as JsonRecord).sender?.profilePicture || null;

      if (Object.keys(mc as object).length === 0 && !(msg as JsonRecord).body && !(msg as JsonRecord).text) { console.log(`[Debug-0] mc empty + no body/text, breaking. msg sample: ${JSON.stringify(msg).substring(0, 400)}`); break; }
      if ((mc as JsonRecord).call || (mc as JsonRecord).callLogMessage || (mc as JsonRecord).bcallMessage || (mc as JsonRecord).missedCallMessage || (msg as JsonRecord).type === 'call' || (msg as JsonRecord).callId) break;

       // Extract message content early (no DB call)
      const mcKeys = Object.keys(mc as object);
      const msgKeys = Object.keys(msg as object);
      console.log(`[Debug] msg keys: [${msgKeys.join(',')}], mc keys: [${mcKeys.join(',')}], mc empty: ${mcKeys.length === 0}`);
      if (mcKeys.length === 0) {
        console.log(`[Debug] msg.body: ${(msg as Record<string,unknown>).body}, msg.text: ${(msg as Record<string,unknown>).text}, msg.type: ${(msg as Record<string,unknown>).type}`);
        console.log(`[Debug] Full msg sample: ${JSON.stringify(msg).substring(0, 500)}`);
      }
      const ext = extractMsgContent(mc as JsonRecord, msg as JsonRecord);
      if (!ext) break;
      let { type, content, url, key, path, fn, download, mime } = ext;

      // Extract quoted message provider ID (reply citation) from Baileys/W-API contextInfo
      // or from Z-API normalized referenceMessageId, so inbound replies render as quoted on the platform.
      const _ctx = (mc as JsonRecord)?.extendedTextMessage?.contextInfo
        || (mc as JsonRecord)?.imageMessage?.contextInfo
        || (mc as JsonRecord)?.videoMessage?.contextInfo
        || (mc as JsonRecord)?.audioMessage?.contextInfo
        || (mc as JsonRecord)?.documentMessage?.contextInfo
        || (mc as JsonRecord)?.stickerMessage?.contextInfo
        || (mc as JsonRecord)?.contextInfo
        || (msg as JsonRecord)?.contextInfo
        || null;
      const quotedProviderMsgId = (_ctx as JsonRecord | null)?.stanzaId
        || (_ctx as JsonRecord | null)?.quotedMessageId
        || (_ctx as JsonRecord | null)?.quotedMsgId
        || (msg as JsonRecord)?.referenceMessageId
        || (body as JsonRecord)?.referenceMessageId
        || null;

      // Reject text messages with empty content (common in history sync events)
      if (type === 'text' && !content.trim()) {
        console.log(`[Webhook] Skipping empty text message, msgId=${msgId}, phone=${phone}`);
        break;
      }

      console.log(`[Debug] Extracted: type=${type}, download=${download}, hasUrl=${!!url}, hasKey=${!!key}, hasPath=${!!path}, msgId=${msgId}`);
      
      const preview = getPreview(mc as JsonRecord, msg as JsonRecord);
      const messageTimestamp = (msg as JsonRecord).messageTimestamp 
        ? new Date(((msg as JsonRecord).messageTimestamp as number) * 1000).toISOString() 
        : (msg as JsonRecord).moment 
          ? new Date(((msg as JsonRecord).moment as number) * 1000).toISOString() 
          : new Date().toISOString();
      const reconnectHistoryReplay = isReconnectHistoryReplay(instance as JsonRecord, messageTimestamp);
      if (reconnectHistoryReplay) {
        console.warn(`[Webhook] 🚫 Reconnect history replay detected; message will be saved but automation skipped (instance=${instance.id}, msgAt=${messageTimestamp}, connectedAt=${instance.connected_at}, phone=${phone})`);
      }
      
      // ⏱️ LATENCY: Log after parsing, before DB operations
      console.log(`[Latency] parsing_complete: ${Date.now() - processingStartAt}ms`);
      
      // Fetch existing conversation (single DB call) - use maybeSingle to handle 0 or 1 rows
      let { data: ex, error: exErr } = resolvedLidConv ? { data: resolvedLidConv as JsonRecord, error: null } : await supabase.from('wapi_conversations')
        .select('id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, contact_picture, lead_id, updated_at')
        .eq('instance_id', instance.id)
        .eq('remote_jid', rj)
        .maybeSingle();
      
      if (exErr) {
        console.error(`[Webhook] Error fetching conversation: ${exErr.message}`);
      }

      // Same-instance phone unification: Z-API/W-API may alternate BR numbers with
      // and without the 9th digit. Reuse the existing phone thread before creating
      // a second conversation for the same contact.
      if (!ex && !isGrp && !resolvedLidConv) {
        const phoneVariants = getBrazilianPhoneVariants(phone);

        // 🔎 Fallback adicional: buscar por VARIANTES DO REMOTE_JID (cobre rows
        // antigas sem contact_phone preenchido — causa comum de "mensagem some")
        const jidVariants = phoneVariants.map((v) => `${v}@s.whatsapp.net`);
        const { data: sameJidVariant } = await supabase.from('wapi_conversations')
          .select('id, instance_id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, contact_picture, lead_id, updated_at')
          .eq('company_id', instance.company_id)
          .eq('instance_id', instance.id)
          .in('remote_jid', jidVariants)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        if (sameJidVariant) {
          console.warn(`[Webhook][JidVariantMatch] incoming=${rj} matched_jid=${sameJidVariant.remote_jid} conv=${sameJidVariant.id}`);
          ex = sameJidVariant as JsonRecord;
          rj = sameJidVariant.remote_jid || rj;
        }
      }

      if (!ex && !isGrp && !resolvedLidConv) {
        const phoneVariants = getBrazilianPhoneVariants(phone);
        const { data: samePhoneConv } = await supabase.from('wapi_conversations')
          .select('id, instance_id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, contact_picture, lead_id, updated_at')
          .eq('company_id', instance.company_id)
          .eq('instance_id', instance.id)
          .in('contact_phone', phoneVariants)
          .not('remote_jid', 'like', '%@g.us')
          .not('remote_jid', 'like', '%@broadcast%')
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (samePhoneConv) {
          console.warn(`[Webhook][VariantMatch][same-instance] phone=${phone} variants=${JSON.stringify(phoneVariants)} matched_conv=${samePhoneConv.id} matched_jid=${samePhoneConv.remote_jid} incoming_jid=${rj} instance=${instance.id} company=${instance.company_id}`);
          ex = samePhoneConv as JsonRecord;
          rj = samePhoneConv.remote_jid || rj;
          try {
            await supabase.from('notifications').insert({
              user_id: null,
              company_id: instance.company_id,
              type: 'whatsapp_variant_match',
              title: '🔀 Variante de número unificada',
              message: `Mensagem de ${phone} foi vinculada à conversa existente (${samePhoneConv.remote_jid}). Verifique se está correto.`,
              data: {
                phone,
                variants: phoneVariants,
                matched_conversation_id: samePhoneConv.id,
                matched_remote_jid: samePhoneConv.remote_jid,
                incoming_remote_jid: rj,
                instance_id: instance.id,
                scope: 'same-instance',
              },
            });
          } catch (notifErr) {
            console.error('[Webhook][VariantMatch] notification insert failed:', notifErr);
          }
        }
      }

      // 🔄 CROSS-INSTANCE UNIFICATION
      // If no conversation exists for this instance+rj, look for an existing
      // conversation in the SAME COMPANY for the SAME PHONE on a DIFFERENT instance
      // (e.g. customer migrated W-API → Z-API). When found, "move" that conversation
      // to the current instance instead of creating a duplicate. This preserves the
      // full chat history, lead link, bot state and is fully transparent to both
      // the customer and the operator (single thread in the UI).
      if (!ex && !isGrp && !resolvedLidConv) {
        try {
          const digitsOnly = phone.replace(/\D/g, '');
          // Build phone variants: with/without 55, with/without 9th digit
          const variants = new Set<string>();
          variants.add(digitsOnly);
          if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) variants.add(digitsOnly.slice(2));
          if (!digitsOnly.startsWith('55') && digitsOnly.length >= 10) variants.add('55' + digitsOnly);
          const noCountry = digitsOnly.startsWith('55') ? digitsOnly.slice(2) : digitsOnly;
          if (noCountry.length === 10) {
            const withNine = noCountry.slice(0, 2) + '9' + noCountry.slice(2);
            variants.add(withNine);
            variants.add('55' + withNine);
          }
          if (noCountry.length === 11 && noCountry[2] === '9') {
            const withoutNine = noCountry.slice(0, 2) + noCountry.slice(3);
            variants.add(withoutNine);
            variants.add('55' + withoutNine);
          }

          const { data: crossInstance } = await supabase.from('wapi_conversations')
            .select('id, instance_id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, contact_picture, lead_id, updated_at')
            .eq('company_id', instance.company_id)
            .neq('instance_id', instance.id)
            .in('contact_phone', Array.from(variants))
            .not('remote_jid', 'like', '%@g.us')
            .not('remote_jid', 'like', '%@broadcast%')
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

          if (crossInstance) {
            console.warn(`[Webhook][VariantMatch][cross-instance] phone=${digitsOnly} variants=${JSON.stringify(Array.from(variants))} matched_conv=${crossInstance.id} from_instance=${crossInstance.instance_id} → to_instance=${instance.id} matched_jid=${crossInstance.remote_jid} incoming_jid=${rj} company=${instance.company_id}`);
            try {
              await supabase.from('notifications').insert({
                user_id: null,
                company_id: instance.company_id,
                type: 'whatsapp_variant_match',
                title: '🔄 Conversa migrada entre instâncias',
                message: `Conversa de ${digitsOnly} foi migrada para a instância atual. Variante detectada — verifique se está correto.`,
                data: {
                  phone: digitsOnly,
                  variants: Array.from(variants),
                  matched_conversation_id: crossInstance.id,
                  from_instance_id: crossInstance.instance_id,
                  to_instance_id: instance.id,
                  matched_remote_jid: crossInstance.remote_jid,
                  incoming_remote_jid: rj,
                  scope: 'cross-instance',
                },
              });
            } catch (notifErr) {
              console.error('[Webhook][VariantMatch] notification insert failed:', notifErr);
            }
            const { error: migErr } = await supabase
              .from('wapi_conversations')
              .update({
                instance_id: instance.id,
                remote_jid: rj,
                contact_phone: digitsOnly,
              })
              .eq('id', crossInstance.id);
            if (migErr) {
              console.error(`[Webhook] Cross-instance migration FAILED for ${crossInstance.id}: ${migErr.message}. Falling back to new conversation.`);
            } else {
              ex = {
                id: crossInstance.id,
                remote_jid: rj,
                bot_enabled: crossInstance.bot_enabled,
                bot_step: crossInstance.bot_step,
                bot_data: crossInstance.bot_data,
                unread_count: crossInstance.unread_count,
                is_closed: crossInstance.is_closed,
                contact_name: crossInstance.contact_name,
                contact_picture: crossInstance.contact_picture,
                lead_id: crossInstance.lead_id,
                updated_at: crossInstance.updated_at,
              } as JsonRecord;
            }
          }
        } catch (unifyErr) {
          console.error(`[Webhook] Cross-instance unification error:`, unifyErr);
        }
      }
      
      console.log(`[Latency] conversation_fetch: ${Date.now() - processingStartAt}ms, found: ${!!ex}`);
      
      let conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: JsonRecord | null; lead_id: string | null };
      
      if (ex) {
        conv = ex;
        // Build update object
        const upd: JsonRecord = { 
          last_message_at: new Date().toISOString(), 
          unread_count: fromMe ? ex.unread_count : (ex.unread_count || 0) + 1, 
          last_message_content: preview.substring(0, 100), 
          last_message_from_me: fromMe 
        };
        if (!fromMe && ex.is_closed) upd.is_closed = false;
        if (isUnresolvedInboundLid) {
          upd.bot_enabled = false;
          upd.bot_step = 'human_takeover';
          upd.bot_data = {
            ...((ex.bot_data as JsonRecord | null) || {}),
            unresolved_lid_jid: originalLidJid,
            unresolved_lid_at: new Date().toISOString(),
          };
        }
        // Disable bot when a HUMAN sends a message from the phone directly.
        // Bot-sent and UI-sent messages are already saved in wapi_messages before the webhook fires.
        // Phone-sent messages are NOT in the DB yet → if msgId is absent from wapi_messages, it's human.
        if (fromMe && ex.bot_enabled === true && msgId) {
          const isFlowStep = (ex.bot_step || '').startsWith('flow_');
          const isBotActive = isClassicBotStepActive(ex.bot_step) || isFlowStep;

          if (!isBotActive) {
            const { data: existingMsg } = await supabase.from('wapi_messages')
              .select('id')
              .eq('message_id', msgId)
              .maybeSingle();
            if (!existingMsg) {
              // Message not in DB → sent from phone by human → disable bot
              console.log(`[Bot] Human phone message detected (msgId ${msgId}), disabling bot for conv ${ex.id}`);
              upd.bot_enabled = false;
              upd.bot_step = 'human_takeover';
            }
          } else {
            console.log(`[Bot] Skipping human_takeover detection during active bot step (${ex.bot_step}) for conv ${ex.id}`);
          }
        }
        if (isGrp) { 
          const gn = (msg as JsonRecord).chat?.name || (msg as JsonRecord).groupName || (msg as JsonRecord).subject; 
          if (gn && gn !== ex.contact_name) upd.contact_name = gn; 
        } else if (!fromMe && cName && cName !== ex.contact_name) {
          // Only update contact_name from INCOMING messages — outgoing messages
          // carry the business's own pushName which would overwrite the real name.
          // Also skip if the incoming pushName matches the buffet/instance name
          // (happens when the client has the buffet saved in their phone).
          if (await isSelfName(supabase, instance.company_id, cName)) {
            console.log(`[SelfNameGuard] Ignoring pushName "${cName}" — matches company/instance name (conv ${ex.id})`);
          } else {
            // Lock contact_name once a real (non-numeric) name is established.
            // Overwrite only if the current name is missing, numeric, equals the phone,
            // or is the "Grupo <phone>" placeholder. This prevents Dani → Danielle,
            // Taly Amorim → 170526J Taly/Otto, etc. flapping on every new message.
            const existing = (ex.contact_name || '').trim();
            const existingDigits = existing.replace(/\D/g, '');
            const isPlaceholder =
              !existing ||
              /^[\d\s+()\-]+$/.test(existing) ||
              existing === ex.contact_phone ||
              (existingDigits.length >= 8 && existingDigits === existing.replace(/\D/g, '')) ||
              /^Grupo\s/i.test(existing);
            if (isPlaceholder) {
              upd.contact_name = cName;
            }
          }
        }
        if (cPic) upd.contact_picture = cPic;
        
        // Await to ensure human_takeover flag is committed before next message arrives
        await supabase.from('wapi_conversations').update(upd).eq('id', ex.id);
        
        // If no profile picture, fetch it in background
        if (!cPic && !ex.contact_picture) {
          fetchAndUpdateProfilePicture(supabase, instance.instance_id, instance.instance_token, ex.id, rj as string, instance.provider || 'wapi')
            .catch(() => {});
        }

        // If contact_name is numeric (LID/phone fallback), try to fetch real name from provider
        const effectiveName = (upd.contact_name as string | undefined) ?? ex.contact_name;
        if (!isGrp && (!effectiveName || /^[\d\s+()-]+$/.test(String(effectiveName).trim()))) {
          fetchAndUpdateContactName(
            supabase, instance.instance_id, instance.instance_token,
            instance.client_token || null, ex.id, rj as string,
            effectiveName as string | null, instance.provider || 'wapi'
          ).catch(() => {});
        }
      } else {
        // New conversation - need to check for existing lead
        // First, do a final check to prevent race conditions (upsert-like behavior)
        const { data: raceCheck } = await supabase.from('wapi_conversations')
          .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id, updated_at')
          .eq('instance_id', instance.id)
          .eq('remote_jid', rj)
          .maybeSingle();
        
        if (raceCheck) {
          // Conversation was created by another request in the meantime
          console.log(`[Webhook] Race condition avoided - conversation already exists: ${raceCheck.id}`);
          conv = raceCheck;
          // Update it with latest message info
          supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(), 
            unread_count: fromMe ? 0 : 1, 
            last_message_content: preview.substring(0, 100), 
            last_message_from_me: fromMe 
          }).eq('id', raceCheck.id).then(() => {});
        } else {
          const n = phone.replace(/\D/g, ''), vars = [n, n.replace(/^55/, ''), `55${n}`];
          const { data: lead } = await supabase.from('campaign_leads')
            .select('id, name, month, day_preference, guests')
            .or(vars.map(p => `whatsapp.ilike.%${p}%`).join(','))
            .eq('unit', instance.unit)
            .limit(1)
            .single();
          
          const hasCompleteLead = lead?.name && lead?.month && lead?.day_preference && lead?.guests;
          const isGroupJid = rj.includes('@g.us');
          const shouldStartBot = !isGroupJid && !hasCompleteLead && !isUnresolvedInboundLid && !reconnectHistoryReplay;
          
          // Self-name guard: don't store the buffet's own name as the contact name
          const safeIncomingName = (!isGrp && cName && await isSelfName(supabase, instance.company_id, cName)) ? null : cName;
          if (safeIncomingName !== cName) {
            console.log(`[SelfNameGuard] Ignoring pushName "${cName}" on new conversation — matches company name`);
          }
          
          const { data: nc, error: ce } = await supabase.from('wapi_conversations').insert({
            instance_id: instance.id, remote_jid: rj, contact_phone: phone, 
            contact_name: safeIncomingName || (isGrp ? `Grupo ${phone}` : phone), contact_picture: cPic,
            last_message_at: new Date().toISOString(), unread_count: fromMe ? 0 : 1, 
            last_message_content: preview.substring(0, 100), last_message_from_me: fromMe,
            lead_id: lead?.id || null, bot_enabled: shouldStartBot, 
            bot_step: shouldStartBot ? 'welcome' : (isUnresolvedInboundLid ? 'human_takeover' : null),
            bot_data: isUnresolvedInboundLid ? { unresolved_lid_jid: originalLidJid, unresolved_lid_at: new Date().toISOString() } : {},
            company_id: instance.company_id,
          }).select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id, updated_at').single();
          
          if (ce) {
            // If insert fails due to unique constraint, fetch existing
            console.log(`[Webhook] Insert failed (likely duplicate): ${ce.message}`);
            const { data: fallback } = await supabase.from('wapi_conversations')
              .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id, updated_at')
              .eq('instance_id', instance.id)
              .eq('remote_jid', rj)
              .single();
            if (!fallback) break;
            conv = fallback;
          } else {
            conv = nc;
            // Fetch profile picture in background for new conversations
            if (!cPic && nc?.id) {
              fetchAndUpdateProfilePicture(supabase, instance.instance_id, instance.instance_token, nc.id, rj as string, instance.provider || 'wapi')
                .catch(() => {});
            }
            // Resolve numeric/LID contact_name via provider API
            const newName = (nc as JsonRecord | null)?.contact_name as string | null | undefined;
            if (!isGrp && nc?.id && (!newName || /^[\d\s+()-]+$/.test(String(newName).trim()))) {
              fetchAndUpdateContactName(
                supabase, instance.instance_id, instance.instance_token,
                instance.client_token || null, nc.id, rj as string,
                newName ?? null, instance.provider || 'wapi'
              ).catch(() => {});
            }
          }
        }
      }
      
      console.log(`[Latency] conversation_ready: ${Date.now() - processingStartAt}ms`);

      // Download media in parallel with message insert if needed (for both sent and received messages)
      let mediaPromise: Promise<{ url: string; fileName: string } | null> | null = null;
      if (download && msgId) {
        mediaPromise = downloadMedia(supabase, instance.instance_id, instance.instance_token, msgId as string, type, fn, key, path, url, mime);
      }

      // Insert message immediately (don't wait for media download)
      // For outgoing messages (fromMe), check if already saved (e.g. by follow-up-check with metadata)
      const insertStartAt = Date.now();

      // Resolve quoted provider message ID → wapi_messages.id (uuid)
      let quotedDbId: string | null = null;
      if (quotedProviderMsgId) {
        const { data: qm } = await supabase.from('wapi_messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('message_id', String(quotedProviderMsgId))
          .maybeSingle();
        quotedDbId = qm?.id || null;
        if (!quotedDbId) console.log(`[Webhook] quoted msg ${quotedProviderMsgId} not found in DB for conv ${conv.id}`);
      }


      if (fromMe && msgId) {
        const { data: existingMsg } = await supabase.from('wapi_messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('message_id', msgId)
          .limit(1)
          .maybeSingle();
        
        if (existingMsg) {
          console.log(`[Bot] Skipping duplicate outgoing message ${msgId} - already saved`);
        } else {
          const grpMeta1 = isGrp ? {
            participant: ((msg as JsonRecord).key?.participant || (msg as JsonRecord).participant || '').replace('@s.whatsapp.net',''),
            sender_name: (msg as JsonRecord).pushName || (msg as JsonRecord).sender?.pushName || null
          } : null;
          await supabase.from('wapi_messages').upsert({
            conversation_id: conv.id, message_id: msgId, from_me: fromMe, message_type: type, content,
            media_url: url, media_key: key, media_direct_path: path, status: 'sent',
            timestamp: messageTimestamp,
            company_id: instance.company_id,
            metadata: grpMeta1,
            quoted_message_id: quotedDbId,
          }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
        }
      } else {
        // Dedup incoming messages — W-API may fire the same webhook twice
        if (!fromMe && msgId) {
          const { data: existingIncoming } = await supabase.from('wapi_messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .eq('message_id', msgId)
            .limit(1)
            .maybeSingle();
          if (existingIncoming) {
            console.log(`[Webhook] Skipping duplicate incoming message ${msgId}`);
            break;
          }
        }
        const grpMeta2 = isGrp ? {
          participant: ((msg as JsonRecord).key?.participant || (msg as JsonRecord).participant || '').replace('@s.whatsapp.net',''),
          sender_name: (msg as JsonRecord).pushName || (msg as JsonRecord).sender?.pushName || null
        } : null;
        await supabase.from('wapi_messages').upsert({
          conversation_id: conv.id, message_id: msgId, from_me: fromMe, message_type: type, content,
          media_url: url, media_key: key, media_direct_path: path, status: fromMe ? 'sent' : 'received',
          timestamp: messageTimestamp,
          company_id: instance.company_id,
          metadata: grpMeta2,
          quoted_message_id: quotedDbId,
        }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
      }
      
      console.log(`[Latency] message_inserted: ${Date.now() - insertStartAt}ms (total: ${Date.now() - processingStartAt}ms)`);

      // If media download was started, wait for it and update the message
      if (mediaPromise) {
        mediaPromise.then(async (res) => {
          if (res) {
            await supabase.from('wapi_messages')
              .update({ media_url: res.url, media_key: null, media_direct_path: null })
              .eq('message_id', msgId);
            console.log(`[Latency] media_updated: ${Date.now() - processingStartAt}ms`);
          }
        }).catch(err => console.error('[Media download error]', err));
      }

      if (isUnresolvedInboundLid) {
        console.log(`[Webhook] Unresolved inbound @lid saved for manual review; automation skipped (conv=${conv.id})`);
        break;
      }

      if (reconnectHistoryReplay) {
        console.log(`[Webhook] Reconnect history replay saved; all automation skipped (conv=${conv.id})`);
        break;
      }

      // Fase 7.1: Check for visit confirmation response BEFORE reactivation/bot
      if (!fromMe && !isGrp && type === 'text' && content) {
        try {
          const visitHandled = await handleVisitConfirmationResponse(supabase, instance, conv, content);
          if (visitHandled) {
            console.log(`[Visit Confirmation] Response handled for conv ${conv.id}, skipping bot`);
            break;
          }
        } catch (err) {
          console.error('[Visit Confirmation error]', err);
        }
      }

      // Fase 4B: Check for reactivation response BEFORE bot processing
      if (!fromMe && !isGrp && type === 'text' && content) {
        try {
          const handled = await handleReactivationResponse(supabase, instance, conv, content);
          if (handled) {
            console.log(`[Reactivation 4B] Response handled for conv ${conv.id}, skipping bot`);
            break;
          }
        } catch (err) {
          console.error('[Reactivation 4B error]', err);
        }
      }

      // Process bot qualification - MUST await to ensure bot messages are saved before function terminates
      if (!fromMe && !isGrp && type === 'text' && content) {
        try {
          // Re-read conversation to catch concurrent updates (e.g., human_takeover set by UI or phone-message webhook)
          const { data: freshConv } = await supabase.from('wapi_conversations')
            .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id, updated_at')
            .eq('id', conv.id)
            .single();
          if (freshConv) {
            conv = freshConv;
          }

          // === CAMPAIGN AUTO-REPLY: lead is responding to a campaign that pauses the bot ===
          const campaignPendingId = (conv.bot_data as JsonRecord | null)?.campaign_pending_reply as string | undefined;
          const campaignSoft = (conv.bot_data as JsonRecord | null)?.campaign_soft === true;
          if (campaignPendingId) {
            console.log(`[Campaign Auto-Reply] Lead replied to campaign ${campaignPendingId}, conv ${conv.id}, soft=${campaignSoft}`);
            try {
              const { data: campaign } = await supabase
                .from('campaigns')
                .select('id, name, auto_reply_message')
                .eq('id', campaignPendingId)
                .maybeSingle();

              // Send the auto-reply message (only when not in soft mode)
              if (!campaignSoft && campaign?.auto_reply_message && campaign.auto_reply_message.trim()) {
                const replyText = campaign.auto_reply_message.trim();
                const sentId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, replyText);
                if (sentId) {
                  await supabase.from('wapi_messages').upsert({
                    conversation_id: conv.id,
                    message_id: sentId,
                    from_me: true,
                    message_type: 'text',
                    company_id: instance.company_id,
                    content: replyText,
                    status: 'sent',
                    timestamp: new Date().toISOString(),
                    metadata: { source: 'campaign_auto_reply', campaign_id: campaignPendingId },
                  }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
                }
              }

              // Notify all users of the company that a campaign lead is awaiting human attention
              const { data: companyUsers } = await supabase
                .from('user_companies')
                .select('user_id')
                .eq('company_id', instance.company_id);

              const leadName = ((conv.bot_data as JsonRecord | null)?.campaign_lead_name as string) || 'Lead';
              const notifications = (companyUsers || []).map((u: { user_id: string }) => ({
                user_id: u.user_id,
                company_id: instance.company_id,
                type: 'campaign_reply',
                title: '📣 Resposta de campanha!',
                message: `${leadName} respondeu à campanha "${campaign?.name || 'Promoção'}" e aguarda atendimento.`,
                data: {
                  campaign_id: campaignPendingId,
                  conversation_id: conv.id,
                  lead_id: conv.lead_id,
                  lead_name: leadName,
                },
              }));
              if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
              }

              // Clear the pending flag (one-shot) but KEEP human_takeover so bot stays paused (only in non-soft mode)
              const cleanedBotData = { ...(conv.bot_data as JsonRecord | null || {}) };
              delete (cleanedBotData as JsonRecord).campaign_pending_reply;
              delete (cleanedBotData as JsonRecord).campaign_lead_name;
              delete (cleanedBotData as JsonRecord).campaign_marked_at;
              delete (cleanedBotData as JsonRecord).campaign_soft;
              (cleanedBotData as JsonRecord).campaign_replied_at = new Date().toISOString();
              (cleanedBotData as JsonRecord).campaign_replied_id = campaignPendingId;
              (cleanedBotData as JsonRecord).campaign_replied_name = leadName;

              await supabase.from('wapi_conversations').update({
                bot_data: cleanedBotData,
              }).eq('id', conv.id);

              // Refresh local conv to keep downstream bot processing consistent in soft mode
              if (campaignSoft) {
                conv = { ...conv, bot_data: cleanedBotData };
              }
            } catch (campErr) {
              console.error('[Campaign Auto-Reply] Error:', campErr);
            }
            // In non-soft mode, skip standard bot processing entirely.
            // In soft mode, continue normal bot flow.
            if (!campaignSoft) {
              break;
            }
          }

          // ── BOT LOOP GUARD: detect and silently pause bot↔bot ping-pong ──
          const loopResult = await detectAndPauseBotLoop(supabase, conv.id, content);
          const alreadyPaused = loopResult.paused || await isConversationPaused(supabase, conv.id);
          if (alreadyPaused) {
            console.warn(`[Bot] ⏸ Conversation ${conv.id} is paused (loop guard) — skipping bot reply`);
            break;
          }

          // 🎯 Quarentena pós-reconexão NÃO bloqueia mais o bot de qualificação.
          // Lead novo precisa de resposta imediata — perder lead é pior que risco de ban.
          // A proteção continua valendo para follow-up/reativação/campanhas (via wapi-send).
          // (bloco antigo de quarentena removido intencionalmente)


          const recoveredStep = shouldRecoverAccidentalHumanTakeover(instance.provider, conv);
          if (recoveredStep) {
            console.warn(`[Bot] Recovering accidental human_takeover for conv ${conv.id}; resuming at step ${recoveredStep}`);
            await supabase.from('wapi_conversations').update({
              bot_enabled: true,
              bot_step: recoveredStep,
            }).eq('id', conv.id);
            conv.bot_enabled = true;
            conv.bot_step = recoveredStep;
          }

          // Skip bot if disabled after re-read
          const allowPilotRestart = isMegaMagicPilotPhone(instance.id, phone) && conv.bot_step !== 'human_takeover';
          if ((conv.bot_enabled === false || conv.bot_step === 'human_takeover') && !allowPilotRestart) {
            console.log(`[Bot] Skipping — bot disabled after re-read (step: ${conv.bot_step}, enabled: ${conv.bot_enabled})`);
          } else {
            await processBotQualification(supabase, instance, conv, content, phone, cName as string | null);
          }
        } catch (err) {
          console.error('[Bot qualification error]', err);
        }
      }
      break;
    }
    case 'message-status': case 'message_ack': case 'webhookStatus': case 'webhookDelivery': {
      const sd = data || body, mId = (sd as JsonRecord)?.messageId || body?.messageId, st = (sd as JsonRecord)?.status, ack = (sd as JsonRecord)?.ack;
      const fm = body?.fromMe || (sd as JsonRecord)?.fromMe || false, mcd = body?.msgContent || (sd as JsonRecord)?.msgContent;
      
      // Track whether the message already existed BEFORE we (potentially) insert it from physical-phone payload.
      // Only existing messages should have their status updated — newly inserted ones start at 'sent' and wait
      // for subsequent messageStatus webhooks to evolve, eliminating the ack=4 race on re-delivered payloads.
      let messageAlreadyExisted = false;
      if (mId) {
        const { data: preCheck } = await supabase.from('wapi_messages').select('id, message_type').eq('message_id', mId).maybeSingle();
        messageAlreadyExisted = !!preCheck;
      }
      
      if (fm && mcd && mId) {
        const { data: em } = await supabase.from('wapi_messages').select('id').eq('message_id', mId).single();
        if (!em) {
          const cId = (body?.chat as JsonRecord)?.id || (sd as JsonRecord)?.chat?.id;
          if (cId) {
            let rj = (cId as string).includes('@') ? cId : `${cId}@s.whatsapp.net`;
            if ((rj as string).includes('@c.us')) rj = (rj as string).replace('@c.us', '@s.whatsapp.net');
            let resolvedStatusLidConv: JsonRecord | null = null;
            if ((rj as string).includes('@lid')) {
              resolvedStatusLidConv = await resolveLidConversation(supabase, instance.id, rj as string, mId as string | null, body as JsonRecord);
              if (resolvedStatusLidConv?.remote_jid && !String(resolvedStatusLidConv.remote_jid).includes('@lid')) {
                console.log(`[webhookDelivery] Resolved status @lid ${rj} to ${resolvedStatusLidConv.remote_jid}`);
                rj = resolvedStatusLidConv.remote_jid;
              }
            }
            const p = (rj as string).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
            if (!(rj as string).includes('@g.us')) {
              const { data: ec } = resolvedStatusLidConv && !(rj as string).includes('@lid')
                ? { data: resolvedStatusLidConv }
                : await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', rj).maybeSingle();
              let pv = '';
              if ((mcd as JsonRecord).conversation) pv = (mcd as JsonRecord).conversation as string;
              else if ((mcd as JsonRecord).extendedTextMessage?.text) pv = (mcd as JsonRecord).extendedTextMessage?.text as string;
              else if ((mcd as JsonRecord).imageMessage) pv = '📷 Imagem';
              else if ((mcd as JsonRecord).documentMessage) pv = '📄 ' + ((mcd as JsonRecord).documentMessage?.fileName || 'Documento');
              
              let cv;
              if (ec) {
                // Check if this outgoing message was sent by a human from the phone
                // by checking if message_id already exists in wapi_messages
                const statusMsgId = (sd as JsonRecord)?.key?.id || (body as JsonRecord)?.key?.id;
                let shouldDisableBot = false;
                if (ec.bot_enabled === true && statusMsgId) {
                  // Don't disable bot during active bot steps — the bot's own outgoing messages
                  // may trigger status webhooks before the INSERT into wapi_messages completes,
                  // causing a false "human message" detection that resets bot_step to null.
                  const statusIsFlowStep = (ec.bot_step || '').startsWith('flow_');
                  const statusIsBotActive = isClassicBotStepActive(ec.bot_step) || statusIsFlowStep;
                  
                  if (!statusIsBotActive) {
                    const { data: existingStatusMsg } = await supabase.from('wapi_messages')
                      .select('id')
                      .eq('message_id', statusMsgId)
                      .maybeSingle();
                    if (!existingStatusMsg) {
                      shouldDisableBot = true;
                      console.log(`[Bot] Human phone message detected in status handler (msgId ${statusMsgId}), disabling bot for conv ${ec.id}`);
                    }
                  }
                }
                cv = ec; await supabase.from('wapi_conversations').update({ last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, ...(shouldDisableBot ? { bot_enabled: false, bot_step: null } : {}) }).eq('id', ec.id);
              }
              else { const { data: nc } = await supabase.from('wapi_conversations').insert({ instance_id: instance.id, remote_jid: rj, contact_phone: p, contact_name: (body?.chat as JsonRecord)?.name || p, last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, bot_enabled: false, company_id: instance.company_id }).select().single(); cv = nc; }
              
               if (cv) {
                let ct = '', tp = 'text', mu: string | null = null, mk: string | null = null, dp: string | null = null, mm: string | null = null;
                if ((mcd as JsonRecord).conversation) ct = (mcd as JsonRecord).conversation as string;
                else if ((mcd as JsonRecord).extendedTextMessage?.text) ct = (mcd as JsonRecord).extendedTextMessage?.text as string;
                else if ((mcd as JsonRecord).imageMessage) { 
                  const im = (mcd as JsonRecord).imageMessage as JsonRecord;
                  tp = 'image'; ct = (im.caption as string) || '[Imagem]'; mu = im.url as string || null; mk = im.mediaKey as string || null; dp = im.directPath as string || null; mm = im.mimetype as string || null;
                }
                else if ((mcd as JsonRecord).videoMessage) {
                  const vm = (mcd as JsonRecord).videoMessage as JsonRecord;
                  tp = 'video'; ct = (vm.caption as string) || '[Vídeo]'; mu = vm.url as string || null; mk = vm.mediaKey as string || null; dp = vm.directPath as string || null; mm = vm.mimetype as string || null;
                }
                else if ((mcd as JsonRecord).audioMessage) {
                  const am = (mcd as JsonRecord).audioMessage as JsonRecord;
                  tp = 'audio'; ct = '[Áudio]'; mu = am.url as string || null; mk = am.mediaKey as string || null; dp = am.directPath as string || null; mm = am.mimetype as string || null;
                }
                else if ((mcd as JsonRecord).documentMessage) { 
                  const dm = (mcd as JsonRecord).documentMessage as JsonRecord;
                  tp = 'document'; ct = (dm.fileName as string) || '[Documento]'; mu = dm.url as string || null; mk = dm.mediaKey as string || null; dp = dm.directPath as string || null; mm = dm.mimetype as string || null;
                }
                
                await supabase.from('wapi_messages').upsert({ conversation_id: cv.id, message_id: mId, from_me: true, message_type: tp, content: ct, media_url: mu, media_key: mk, media_direct_path: dp, status: 'sent', timestamp: body.moment ? new Date((body.moment as number) * 1000).toISOString() : new Date().toISOString(), company_id: instance.company_id }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
                
                // Download media to persistent storage if it's a media message
                if ((tp === 'image' || tp === 'video' || tp === 'audio' || tp === 'document') && mId) {
                  const fn = tp === 'document' ? ct : undefined;
                  downloadMedia(supabase, instance.instance_id, instance.instance_token, mId as string, tp, fn, mk, dp, mu, mm)
                    .then(async (res) => {
                      if (res) {
                        await supabase.from('wapi_messages').update({ media_url: res.url, media_key: null, media_direct_path: null }).eq('message_id', mId);
                        console.log(`[webhookDelivery] Media persisted for ${mId}: ${res.url.substring(0, 60)}...`);
                      }
                    })
                    .catch(err => console.error('[webhookDelivery] Media download error:', err));
                }
              }
            }
          }
        }
      }
      
      // Removed 'PLAYED': 'read' from generic map — PLAYED is handled separately below for audio-only messages.
      // Added missing common ACK variants used by W-API/Z-API to avoid silent 'unknown' drops.
      const sm: Record<string | number, string> = {
        0: 'error', 1: 'pending', 2: 'sent', 3: 'delivered', 4: 'read',
        'PENDING': 'pending', 'SENT': 'sent', 'SERVER_ACK': 'sent',
        'DELIVERY': 'delivered', 'DELIVERY_ACK': 'delivered', 'DELIVERED': 'delivered',
        'READ': 'read', 'READ_SELF': 'read',
        'ERROR': 'error', 'FAILED': 'error',
      };
      let ns = sm[st as string | number] || sm[ack as string | number] || 'unknown';
      
      // PLAYED → 'read' only for audio messages. For other types it's ambiguous and was prematurely
      // marking text/image messages as read.
      if (ns === 'unknown' && (st === 'PLAYED' || ack === 'PLAYED') && mId) {
        const { data: msgRow } = await supabase.from('wapi_messages').select('message_type').eq('message_id', mId).maybeSingle();
        if (msgRow?.message_type === 'audio') ns = 'read';
      }
      
      if (ns === 'unknown') {
        console.log(`[Webhook] Unknown status payload — st=${JSON.stringify(st)}, ack=${JSON.stringify(ack)}, mId=${mId}`);
      }
      
      // Race fix: only update status for messages that already existed BEFORE this webhook ran.
      // For brand-new messages just inserted by webhookDelivery (physical phone), skip the update —
      // the initial 'sent' status is correct, and subsequent messageStatus webhooks will evolve it.
      if (mId && ns !== 'unknown' && messageAlreadyExisted) {
        await supabase.from('wapi_messages').update({ status: ns }).eq('message_id', mId);
      }
      break;
    }
    default: {
      // Log full body structure for debugging
      const bodyKeys = Object.keys(body).join(', ');
      console.log(`Unhandled event: ${evt}, body keys: [${bodyKeys}]`);
      if (body.msgContent) console.log(`[Unknown] Has msgContent keys: [${Object.keys(body.msgContent).join(', ')}]`);
      if (body.chat) console.log(`[Unknown] Has chat.id: ${(body.chat as JsonRecord)?.id}`);
      
      // Try to extract message from unknown events - W-API sometimes sends messages with different event names
      const unknownMsg = (data as JsonRecord)?.message || data || body;
      const unknownMc = (unknownMsg as JsonRecord)?.message || (unknownMsg as JsonRecord)?.msgContent || {};
      const unknownFromMe = (unknownMsg as JsonRecord)?.key?.fromMe || (unknownMsg as JsonRecord)?.fromMe || false;
      
      // If this looks like a message we haven't handled, log details
      if (unknownFromMe || (unknownMsg as JsonRecord)?.key?.id || (unknownMsg as JsonRecord)?.messageId) {
        const msgId = (unknownMsg as JsonRecord)?.key?.id || (unknownMsg as JsonRecord)?.messageId;
        const rj = (unknownMsg as JsonRecord)?.key?.remoteJid || (unknownMsg as JsonRecord)?.from || (unknownMsg as JsonRecord)?.remoteJid;
        console.log(`[Unknown event with message data] fromMe: ${unknownFromMe}, msgId: ${msgId}, remoteJid: ${rj}`);
        
        // If it's a fromMe message we haven't seen, process it like a regular message
        if (unknownFromMe && msgId && rj) {
          let jid = rj as string;
          if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`;
          else if (jid.includes('@c.us')) jid = jid.replace('@c.us', '@s.whatsapp.net');
          
          const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
          const isGrp = jid.includes('@g.us');
          
          // Process both individual and group messages (previously groups were skipped)
          const { data: existingConv } = await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', jid).maybeSingle();
          
          if (existingConv) {
            // Check if message already exists
            const { data: existingMsg } = await supabase.from('wapi_messages').select('id').eq('message_id', msgId).maybeSingle();
            
            if (!existingMsg) {
              // Extract content from unknown message
              let content = '';
              let type = 'text';
              let mediaUrl = null;
              
              if ((unknownMc as JsonRecord).conversation) content = (unknownMc as Record<string, string>).conversation;
              else if ((unknownMc as JsonRecord).extendedTextMessage?.text) content = ((unknownMc as JsonRecord).extendedTextMessage as JsonRecord).text as string;
              else if ((unknownMc as JsonRecord).imageMessage) { type = 'image'; content = ((unknownMc as JsonRecord).imageMessage as JsonRecord).caption as string || '[Imagem]'; mediaUrl = ((unknownMc as JsonRecord).imageMessage as JsonRecord).url as string; }
              else if ((unknownMc as JsonRecord).documentMessage) { type = 'document'; content = ((unknownMc as JsonRecord).documentMessage as JsonRecord).fileName as string || '[Documento]'; mediaUrl = ((unknownMc as JsonRecord).documentMessage as JsonRecord).url as string; }
              else if ((unknownMc as JsonRecord).videoMessage) { type = 'video'; content = ((unknownMc as JsonRecord).videoMessage as JsonRecord).caption as string || '[Vídeo]'; mediaUrl = ((unknownMc as JsonRecord).videoMessage as JsonRecord).url as string; }
              else if ((unknownMc as JsonRecord).audioMessage) { type = 'audio'; content = '[Áudio]'; mediaUrl = ((unknownMc as JsonRecord).audioMessage as JsonRecord).url as string; }
              else if ((unknownMsg as Record<string, string>).body) content = (unknownMsg as Record<string, string>).body;
              else if ((unknownMsg as Record<string, string>).text) content = (unknownMsg as Record<string, string>).text;
              
              if (content) {
                console.log(`[Unknown event] Saving fromMe message (isGroup: ${isGrp}): ${content.substring(0, 50)}...`);
                
                const grpMeta = isGrp ? {
                  participant: ((unknownMsg as JsonRecord).key?.participant || (unknownMsg as JsonRecord).participant || '').replace('@s.whatsapp.net',''),
                  sender_name: (unknownMsg as JsonRecord).pushName || null
                } : { source: 'platform' };
                
                await supabase.from('wapi_messages').upsert({
                  conversation_id: existingConv.id,
                  message_id: msgId,
                  from_me: true,
                  message_type: type,
                  content,
                  media_url: mediaUrl,
                  status: 'sent',
                  timestamp: (unknownMsg as JsonRecord).messageTimestamp 
                    ? new Date(((unknownMsg as JsonRecord).messageTimestamp as number) * 1000).toISOString() 
                    : new Date().toISOString(),
                  company_id: instance.company_id,
                  metadata: grpMeta,
                }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
                
                // Update conversation - but don't disable bot during active steps (only for non-groups)
                const unknownActiveBotSteps = ['welcome', 'tipo', 'nome', 'mes', 'dia', 'convidados', 'sending_materials', 'proximo_passo', 'proximo_passo_reminded'];
                const unknownIsFlowStep = (existingConv.bot_step || '').startsWith('flow_');
                const unknownIsBotActive = unknownActiveBotSteps.includes(existingConv.bot_step || '') || unknownIsFlowStep;
                
                await supabase.from('wapi_conversations').update({
                  last_message_at: new Date().toISOString(),
                  last_message_content: content.substring(0, 100),
                  last_message_from_me: true,
                  ...(isGrp ? {} : (existingConv.bot_step && existingConv.bot_step !== 'complete' && !unknownIsBotActive ? { bot_enabled: false } : {}))
                }).eq('id', existingConv.id);
                
                console.log(`[Unknown event] Message saved successfully`);
              }
            }
          }
        }
      }
    }
    }
    await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'completed' });
  } catch (err) {
    await markRawWebhookEvent(supabase, rawWebhookEventId, {
      processing_status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// Extract Z-API interactive response from any known field name
function extractZapiInteractiveResponse(body: JsonRecord): { type: 'button' | 'list'; data: JsonRecord; text: string; replyId: string } | null {
  // Z-API button response - try all known field names
  const btnFields = ['buttonsResponseMessage', 'buttonResponseMessage', 'interactiveResponseMessage', 'buttonReply'];
  for (const field of btnFields) {
    const obj = body[field] as JsonRecord | undefined;
    if (obj) {
      const text = extractZapiInteractiveText(obj);
      const replyId = extractZapiInteractiveId(obj);
      console.log(`[normalizeZapi] Interactive response found in field "${field}": ${JSON.stringify(obj)} → text="${text}", id="${replyId}"`);
      return { type: 'button', data: obj, text, replyId };
    }
  }
  
  // Z-API list response
  const listFields = ['listResponseMessage', 'listMessage', 'listReply'];
  for (const field of listFields) {
    const obj = body[field] as JsonRecord | undefined;
    if (obj) {
      const text = extractZapiInteractiveText(obj);
      const replyId = extractZapiInteractiveId(obj);
      console.log(`[normalizeZapi] List response found in field "${field}": ${JSON.stringify(obj)} → text="${text}", id="${replyId}"`);
      return { type: 'list', data: obj, text, replyId };
    }
  }
  
  return null;
}

// Normalize Z-API webhook payload to W-API format
function normalizeZapiPayload(body: JsonRecord): JsonRecord {
  const phone = body.phone as string || '';
  const remoteJid = normalizeZapiRemoteJid(phone);
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const msgId = (body.messageId as string) || (ids[0] as string | undefined) || `zapi_${Date.now()}`;
  const fromMe = body.fromMe === true;
  const senderName = (body.senderName || body.chatName || phone) as string;

  const hasContentPayload = Boolean(
    body.text || body.image || body.audio || body.video || body.document || body.sticker ||
    body.contact || body.contacts || body.location || body.reaction || body.poll || body.reply ||
    body.message || body.hydratedTemplate || body.templateMessage || body.buttonsResponseMessage ||
    body.buttonResponseMessage || body.interactiveResponseMessage || body.listResponseMessage || body.listMessage
  );

  // Z-API status-only callbacks carry no message content. Route them directly to
  // the status handler so they never become placeholder/chat messages and don't
  // produce noisy "unrecognized content" logs.
  if (body.type === 'MessageStatusCallback' || (body.type === 'SendCallback' && !hasContentPayload)) {
    return {
      event: 'webhookDelivery',
      instanceId: body.instanceId,
      data: {
        key: { remoteJid, fromMe, id: msgId },
        messageId: msgId,
        status: body.status,
        ack: body.ack,
        ids,
        pushName: senderName,
        messageTimestamp: body.momment ? Math.floor((body.momment as number) / 1000) : Math.floor(Date.now() / 1000),
      },
    };
  }

  // Extract content from Z-API nested structure
  const textObj = body.text as JsonRecord | undefined;
  const imageObj = body.image as JsonRecord | undefined;
  const audioObj = body.audio as JsonRecord | undefined;
  const videoObj = body.video as JsonRecord | undefined;
  const documentObj = body.document as JsonRecord | undefined;

  // Z-API interactive responses (button clicks / list selections) - comprehensive check
  const interactive = extractZapiInteractiveResponse(body);

  let message: JsonRecord = {};
  if (interactive) {
    const normalizedText = interactive.text || interactive.replyId;
    // Put interactive response AND set conversation to the extracted text
    if (interactive.type === 'button') {
      message = { buttonsResponseMessage: interactive.data, conversation: normalizedText };
    } else {
      message = { listResponseMessage: interactive.data, conversation: normalizedText };
    }
    console.log(`[normalizeZapi] Interactive ${interactive.type} → conversation="${normalizedText}"`);
  } else if (textObj?.message) {
    message = { conversation: textObj.message };
  } else if (imageObj?.imageUrl) {
    message = { imageMessage: { url: imageObj.imageUrl, caption: imageObj.caption || '' } };
  } else if (audioObj?.audioUrl) {
    message = { audioMessage: { url: audioObj.audioUrl } };
  } else if (videoObj?.videoUrl) {
    message = { videoMessage: { url: videoObj.videoUrl, caption: videoObj.caption || '' } };
  } else if (documentObj?.documentUrl) {
    message = { documentMessage: { url: documentObj.documentUrl, fileName: documentObj.fileName || 'document' } };
  } else {
    // 🛡️ Fallback: handle additional Z-API message shapes that are otherwise
    // dropped (resulting in mensagens that nunca aparecem na plataforma):
    //  - hydratedTemplate / templateMessage (templates enviados pelo celular)
    //  - sticker, contact, contacts, poll, location, reply, reaction
    //  - quotedMessage / referenceMessageId (replies citando outra mensagem)
    const hydrated = (body.hydratedTemplate as JsonRecord | undefined) || (body.templateMessage as JsonRecord | undefined);
    const sticker = body.sticker as JsonRecord | undefined;
    const contact = (body.contact as JsonRecord | undefined) || (body.contacts as JsonRecord | undefined);
    const location = body.location as JsonRecord | undefined;
    const reaction = body.reaction as JsonRecord | undefined;
    const poll = body.poll as JsonRecord | undefined;
    const reply = body.reply as JsonRecord | undefined;

    if (hydrated) {
      const txt = (hydrated.message as string) || (hydrated.text as string) || (hydrated.body as string) || (hydrated.contentText as string) || '[Mensagem]';
      message = { conversation: txt };
      console.log(`[normalizeZapi] hydratedTemplate/templateMessage → "${txt.substring(0, 80)}"`);
    } else if (sticker) {
      const url = (sticker.stickerUrl as string) || (sticker.url as string) || '';
      message = url ? { stickerMessage: { url } } : { conversation: '[Figurinha]' };
    } else if (contact) {
      const name = (contact.displayName as string) || (contact.name as string) || 'Contato';
      message = { conversation: `[Contato] ${name}` };
    } else if (location) {
      const lat = location.latitude;
      const lng = location.longitude;
      message = { conversation: `[Localização] ${lat},${lng}` };
    } else if (reaction) {
      const emoji = (reaction.value as string) || (reaction.reaction as string) || '👍';
      message = { conversation: `[Reação] ${emoji}` };
    } else if (poll) {
      const name = (poll.name as string) || (poll.question as string) || 'Enquete';
      message = { conversation: `[Enquete] ${name}` };
    } else if (reply) {
      const txt = (reply.message as string) || (reply.text as string) || '[Resposta]';
      message = { conversation: txt };
    } else if (typeof body.message === 'string' && body.message) {
      // Some Z-API payloads carry a raw text under body.message
      message = { conversation: body.message as string };
    } else if (body.referenceMessageId) {
      // Reply citation without text — preserve so it's not silently dropped
      message = { conversation: '[Mensagem]' };
      console.log(`[normalizeZapi] reply citation only (referenceMessageId=${body.referenceMessageId}) → placeholder`);
    } else {
      // Last-resort: log unknown payload shape so we can extend later, but
      // still emit a minimal conversation so the message at least appears.
      const knownContentKeys = ['text','image','audio','video','document','sticker','contact','contacts','location','reaction','poll','reply','hydratedTemplate','templateMessage','buttonsResponseMessage','buttonResponseMessage','listResponseMessage','listMessage','interactiveResponseMessage'];
      const presentContentKeys = Object.keys(body).filter(k => knownContentKeys.includes(k));
      console.log(`[normalizeZapi] ⚠️ Unrecognized Z-API content. fromMe=${fromMe}, type=${body.type}, present content keys=[${presentContentKeys.join(',')}], all keys=[${Object.keys(body).join(',')}]`);
      // Only drop completely empty payloads silently for status callbacks
      if (body.type !== 'MessageStatusCallback' && body.type !== 'SendCallback') {
        message = { conversation: '[Mensagem]' };
      }
    }
  }


  // Z-API may include profile picture in the payload
  const profilePic = (body.photo as string) || (body.senderPhoto as string) || (body.chatPhoto as string) || null;
  const referenceMessageId = body.referenceMessageId ? String(body.referenceMessageId) : null;
  const quotedContext = referenceMessageId ? { stanzaId: referenceMessageId, quotedMessageId: referenceMessageId } : null;

  return {
    event: 'messages.upsert',
    instanceId: body.instanceId,
    data: {
      key: { remoteJid, fromMe, id: msgId },
      messageId: msgId,
      status: body.status,
      ack: body.ack,
      ids,
      pushName: senderName,
      message: quotedContext
        ? Object.fromEntries(
          Object.entries(message).map(([key, value]) => [
            key,
            value && typeof value === 'object'
              ? { ...(value as JsonRecord), contextInfo: (value as JsonRecord).contextInfo || quotedContext }
              : value,
          ]),
        )
        : message,
      messageTimestamp: body.momment ? Math.floor((body.momment as number) / 1000) : Math.floor(Date.now() / 1000),
      ...(referenceMessageId ? { contextInfo: quotedContext, referenceMessageId } : {}),
      ...(profilePic ? { sender: { profilePicture: profilePic } } : {}),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let rawWebhookEventId: string | null = null;

  try {
    let body: JsonRecord;
    try {
      body = await req.json();
    } catch (parseErr) {
      rawWebhookEventId = await saveRawWebhookEvent(supabase, {}, req, parseErr instanceof Error ? parseErr.message : 'invalid_json');
      return new Response(JSON.stringify({ error: 'Invalid JSON', raw_event_id: rawWebhookEventId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    rawWebhookEventId = await saveRawWebhookEvent(supabase, body, req);
    const originalRawWebhookEventId = rawWebhookEventId;
    
    // Detect Z-API payload and normalize
    const hasInteractiveResponse = body.buttonsResponseMessage || body.buttonResponseMessage || body.interactiveResponseMessage || body.listResponseMessage || body.listMessage;
    const isZapiSendCallback = body.type === 'SendCallback' || body.type === 'MessageStatusCallback';
    const isZapiPayload = body.type === 'ReceivedCallback' ||
      isZapiSendCallback ||
      (body.phone && body.instanceId && !body.event && (body.text || body.image || body.audio || body.video || body.document || body.sticker || body.location || body.contact || body.contacts || body.reaction || body.poll || body.reply || body.message || body.hydratedTemplate || body.templateMessage || hasInteractiveResponse));
    if (isZapiPayload) {
      // Log raw payload keys for debugging interactive responses
      const payloadKeys = Object.keys(body).join(',');
      console.log(`[Webhook] Z-API payload detected, normalizing. type=${body.type}, phone=${body.phone}, fromMe=${body.fromMe}, keys=[${payloadKeys}]`);
      if (isZapiSendCallback) {
        // Force fromMe=true for send-callbacks (mensagens enviadas pelo celular do buffet)
        if (body.fromMe !== true) body.fromMe = true;
        console.log(`[Webhook] Z-API SendCallback raw payload (first 500 chars): ${JSON.stringify(body).substring(0, 500)}`);
      }
      if (hasInteractiveResponse) {
        console.log(`[Webhook] Z-API interactive raw payload: ${JSON.stringify(body).substring(0, 500)}`);
      }
      body = normalizeZapiPayload(body);
    }

    // Quick validation - check if instance exists
    const instanceId = body.instanceId;
    if (!instanceId) {
      console.log('No instanceId in webhook');
      await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'ignored', processing_note: 'missing_instance_id' });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Log minimal info for debugging
    const evt = body.event || 'unknown';
    console.log(`Webhook: ${evt} from ${instanceId}`);
    
    // Process in background - return response immediately
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      body[RAW_WEBHOOK_EVENT_ID_FIELD] = originalRawWebhookEventId;
      waitUntil(processWebhookEvent(body));
    } else {
      // Fallback for environments without waitUntil - process async but don't await
      body[RAW_WEBHOOK_EVENT_ID_FIELD] = originalRawWebhookEventId;
      processWebhookEvent(body).catch(e => console.error('Background processing error:', e));
    }

    // Return immediately - don't wait for processing
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: unknown) {
    console.error('Webhook error:', e);
    await markRawWebhookEvent(supabase, rawWebhookEventId, { processing_status: 'error', error: e instanceof Error ? e.message : 'Unknown error' });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
