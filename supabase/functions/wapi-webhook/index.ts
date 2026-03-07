import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

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
  const attempts: Array<{ name: string; body: Record<string, unknown> }> = [
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

async function sendBotMessage(instanceId: string, instanceToken: string, remoteJid: string, message: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
    console.log(`[Bot] Sending message to ${phone} via instance ${instanceId}`);

    const { messageId, attempt } = await sendTextViaWapiWithFallback(instanceId, instanceToken, remoteJid, message, 1);
    console.log(`[Bot] send-text response: msgId=${messageId}, attempt=${attempt}`);

    return messageId;
  } catch (e) {
    console.error(`[Bot] send-text exception:`, e);
    return null;
  }
}

async function sendBotImage(instanceId: string, instanceToken: string, remoteJid: string, imageUrl: string, caption: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    // Download image and convert to base64
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
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
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
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const ext = docUrl.split('.').pop()?.split('?')[0] || 'pdf';
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

// ============= FLOW BUILDER PROCESSOR =============

async function processFlowBuilderMessage(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  content: string,
  contactPhone: string,
  contactName: string | null
) {
  const companyId = instance.company_id;
  
  console.log(`[FlowBuilder] ========== PROCESSING MESSAGE ==========`);
  console.log(`[FlowBuilder] Company: ${companyId}, Conv: ${conv.id}, Phone: ${contactPhone}`);
  console.log(`[FlowBuilder] Content: "${content}", BotStep: ${conv.bot_step}, BotEnabled: ${conv.bot_enabled}`);
  
  // ── SANDBOX: número-piloto usa o Fluxo Comercial V2 ────────────
  const PILOT_PHONE = '15981121710';
  const cleanPhone = contactPhone.replace(/\D/g, '').replace(/^55/, '');
  const isPilot = cleanPhone === PILOT_PHONE || contactPhone.replace(/\D/g, '').endsWith(PILOT_PHONE);

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
      const qualifyContext = (currentNode.action_config as Record<string, unknown>)?.qualify_context as string || '';
      
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
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id,
            message_id: retryMsgId,
            content: retryMsg,
            message_type: 'text',
            from_me: true,
            timestamp: new Date().toISOString(),
            status: 'sent',
          });
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
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id,
            message_id: retryMsgId,
            content: retryMsg,
            message_type: 'text',
            from_me: true,
            timestamp: new Date().toISOString(),
            status: 'sent',
          });
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
      const numMatch = userChoice.match(/^\d+$/);
      
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
      // Try AI interpretation if enabled
        if (currentNode.allow_ai_interpretation) {
          // Use real LLM classification (same logic as qualify node)
          const optionsList = nodeOptions.map((o: any, i: number) => `${i + 1}. value="${o.value}" label="${o.label}"`).join('\n');
          const qualifyContext = (currentNode.action_config as Record<string, unknown>)?.qualify_context as string || '';

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
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id, message_id: retryMsgId, from_me: true,
              message_type: 'text', content: retryMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: companyId,
            });
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
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
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
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          });
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
        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: 'text', content: msg, status: 'sent',
          timestamp: new Date().toISOString(), company_id: instance.company_id,
        });
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
      const actionConfig = (currentNode.action_config || {}) as Record<string, unknown>;
      
      console.log(`[FlowBuilder] Executing action: ${actionType}`);
      
      // Helper to send optional message and save it
      const sendActionMessage = async () => {
        if (currentNode.message_template) {
          const msg = replaceVars(currentNode.message_template);
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
          if (msgId) {
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id, message_id: msgId, from_me: true,
              message_type: 'text', content: msg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: instance.company_id,
            });
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
        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: type, content, media_url: mediaUrl || null,
          status: 'sent', timestamp: new Date().toISOString(), company_id: instance.company_id,
        });
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
                const fileExt = pdf.file_url.split('?')[0].split('.').pop()?.toLowerCase() || '';
                const isPkgImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);
                if (isPkgImage) {
                  const caption = pdf.name || 'Pacote';
                  const msgId = await sendBotImage(instance.instance_id, instance.instance_token, conv.remote_jid, pdf.file_url, caption);
                  if (msgId) await saveMediaMsg(msgId, 'image', caption, pdf.file_url);
                } else {
                  const fileName = (pdf.name?.replace(/[^a-zA-Z0-9\s\-]/g, '').trim() || 'Pacote') + '.pdf';
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
          
          // Update lead status
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({ status: 'em_contato' }).eq('id', conv.lead_id);
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
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          });
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
      const delaySec = ((currentNode.action_config as Record<string, unknown>)?.delay_seconds as number) || 5;
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
      console.log(`[FlowBuilder] ⏱️ Timer node: waiting for reply (timeout: ${((currentNode.action_config as Record<string, unknown>)?.timeout_minutes as number) || 10}min)`);
      
      if (currentNode.message_template) {
        const msg = replaceVars(currentNode.message_template);
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
        if (msgId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          });
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
        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: 'text', content: msg, status: 'sent',
          timestamp: new Date().toISOString(), company_id: instance.company_id,
        });
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
  const leadData: Record<string, unknown> = {};
  
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
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  content: string, contactPhone: string, contactName: string | null
) {
  // ── SANDBOX: número-piloto sempre vai para o Flow Builder V2 ─────
  const PILOT_PHONE = '15981121710';
  const cleanPhoneCheck = contactPhone.replace(/\D/g, '').replace(/^55/, '');
  const isPilotPhone = cleanPhoneCheck === PILOT_PHONE || contactPhone.replace(/\D/g, '').endsWith(PILOT_PHONE);
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

  // ── Test mode guard (applies to ALL bot modes including Flow Builder) ──
  const n = normalizePhone(contactPhone);
  const isTest = Boolean(settings.test_mode_number) && isSameTestPhone(contactPhone, settings.test_mode_number);

  // If test mode is on, only allow the test number through
  if (settings.test_mode_enabled && !isTest) {
    console.log(`[Bot] Test mode ON — phone ${contactPhone} is NOT test number, skipping`);
    return;
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
    const vars = [n, n.replace(/^55/, ''), `55${n}`];
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
        .select('id, name, month, day_of_month, guests, campaign_id')
        .or(vars.map(p => `whatsapp.ilike.%${p}%`).join(','))
        .eq('company_id', instance.company_id)
        .not('campaign_id', 'like', 'whatsapp%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (found) lpLead = found;
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
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true, message_type: 'text',
            company_id: instance.company_id, content: transferMsg, status: 'sent', timestamp: new Date().toISOString()
          });
        }
        return;
      }
      
      // Option 1 or any other response — re-enable bot and send materials
      console.log(`[Bot] LP lead chose option 1 or responded, re-enabling bot for conversation ${conv.id}`);
      await supabase.from('wapi_conversations').update({
        bot_enabled: true,
        bot_step: 'welcome',
        lead_id: lpLead.id,
      }).eq('id', conv.id);
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
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              company_id: instance.company_id,
              content: welcomeMsg,
              status: 'sent',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update step to sending_materials (same as direct flow)
          await supabase.from('wapi_conversations').update({
            bot_step: 'sending_materials',
            bot_data: leadData,
            last_message_at: new Date().toISOString(),
            last_message_content: welcomeMsg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          console.log(`[Bot] Sent qualified lead welcome message to ${contactPhone}, now sending materials...`);
          
          // Send materials + next step question in background (same as direct flow after qualification)
          const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
          const nextStepQuestion = settings.next_step_question || defaultNextStepQuestion;
          
          EdgeRuntime.waitUntil(
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
  delete (updated as Record<string, unknown>)._inactive_reminded;
  delete (updated as Record<string, unknown>)._claimed_step;
  delete (updated as Record<string, unknown>)._claimed_at;

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
    const wasInactiveReminded = (conv.bot_data as Record<string, unknown>)?._inactive_reminded === true;
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
      if (step === 'nome' && (validation.value || content.trim())) {
        const realName = validation.value || content.trim();
        await supabase.from('wapi_conversations').update({
          contact_name: realName,
        }).eq('id', conv.id);
        console.log(`[Bot] Updated contact_name to "${realName}" for conv ${conv.id}`);
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
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              content: msg,
              status: 'sent',
              timestamp: new Date().toISOString(),
              company_id: instance.company_id,
            });
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
              // Link lead to conversation
              await supabase.from('wapi_conversations').update({
                lead_id: newLead.id,
                contact_name: leadName,
              }).eq('id', conv.id);
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
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              content: msg,
              status: 'sent',
              timestamp: new Date().toISOString(),
              company_id: instance.company_id,
            });
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
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id, message_id: redirectMsgId, from_me: true,
              message_type: 'text', content: redirectMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: instance.company_id,
            });
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
          // User wants time to think
          newLeadStatus = 'aguardando_resposta';
          responseMsg = settings.next_step_analyze_response || defaultAnalyzeResponse;
          notificationType = 'lead_analyzing';
          notificationTitle = '📋 Lead analisando materiais';
          notificationMessage = `${leadName} está analisando os materiais. Aguarde ou faça follow-up em breve.`;
          notificationPriority = false;
          console.log(`[Bot] User ${contactPhone} wants time to analyze - updating status to aguardando_resposta`);
        } else {
          // Invalid choice, re-ask
          nextStep = 'proximo_passo';
          const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
          msg = `Por favor, responda apenas com o *número* da opção desejada (1, 2 ou 3) 👇\n\n${settings.next_step_question || defaultNextStepQuestion}`;
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
  const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
  
  // Always save bot message to DB so it appears in chat, even if W-API delivery failed
  await supabase.from('wapi_messages').insert({
    conversation_id: conv.id,
    message_id: msgId || `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from_me: true,
    message_type: 'text',
    content: msg,
    status: msgId ? 'sent' : 'failed',
    timestamp: new Date().toISOString(),
    company_id: instance.company_id,
  });
  
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
    EdgeRuntime.waitUntil(
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

async function sendQualificationMaterials(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null },
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
) {
  // Check if auto-send is enabled
  if (settings?.auto_send_materials === false) {
    console.log('[Bot Materials] Auto-send is disabled in settings');
    return;
  }

  const unit = instance.unit;
  const month = botData.mes || '';
  const guestsStr = botData.convidados || '';
  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  
  console.log(`[Bot Materials] Starting auto-send for ${phone}, unit: ${unit}, month: ${month}, guests: ${guestsStr}`);
  
  if (!unit) {
    console.log('[Bot Materials] No unit configured, skipping');
    return;
  }
  
  // Settings for which materials to send (default to true if not set)
  const sendPhotos = settings?.auto_send_photos !== false;
  const sendPresentationVideo = settings?.auto_send_presentation_video !== false;
  const sendPromoVideo = settings?.auto_send_promo_video !== false;
  const sendPdf = settings?.auto_send_pdf !== false;
  
  // Configurable delay between messages (default 5 seconds, convert to milliseconds)
  const messageDelay = (settings?.message_delay_seconds || 5) * 1000;
  
  // Custom intro messages
  const photosIntro = settings?.auto_send_photos_intro || '✨ Conheça nosso espaço incrível! 🏰🎉';
  const pdfIntro = settings?.auto_send_pdf_intro || '📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. Qualquer dúvida é só chamar! 💜';
  
  // Delay to ensure completion message is delivered first (uses configured delay)
  await new Promise(r => setTimeout(r, messageDelay));
  
  // Fetch captions for different material types
  const { data: captions } = await supabase
    .from('sales_material_captions')
    .select('caption_type, caption_text')
    .eq('is_active', true);
  
  const captionMap: Record<string, string> = {};
  captions?.forEach(c => { captionMap[c.caption_type] = c.caption_text; });
  
  // Fetch all active materials for this unit
  const { data: materials, error: matError } = await supabase
    .from('sales_materials')
    .select('*')
    .eq('unit', unit)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  
  if (matError || !materials?.length) {
    console.log(`[Bot Materials] No materials found for unit ${unit}`);
    return;
  }
  
  console.log(`[Bot Materials] Found ${materials.length} materials for ${unit}`);
  
  // Group materials by type
  const photoCollections = materials.filter(m => m.type === 'photo_collection');
  const allVideos = materials.filter(m => m.type === 'video');
  const promoVideos = allVideos.filter(m => m.name?.toLowerCase().includes('promo') || m.name?.toLowerCase().includes('carnaval'));
  const presentationVideos = allVideos.filter(m => !promoVideos.includes(m));
  const pdfPackages = materials.filter(m => m.type === 'pdf_package');
  
  // Extract guest count from string (e.g., "50 pessoas" -> 50)
  const guestMatch = guestsStr.match(/(\d+)/);
  const guestCount = guestMatch ? parseInt(guestMatch[1]) : null;
  
  // Promo video is now controlled solely by the auto_send_promo_video flag
  
  // Send original URLs directly — no image transformation needed

  // Helper to send via W-API
  const sendImage = async (url: string, caption: string) => {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-image?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, image: url, caption }),
      });
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending image:', e);
      return null;
    }
  };
  
  const sendVideo = async (url: string, caption: string) => {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-video?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, video: url, caption })
      });
      
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending video:', e);
      return null;
    }
  };
  
  const sendDocument = async (url: string, fileName: string) => {
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
      const res = await fetch(`${WAPI_BASE_URL}/message/send-document?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, document: url, fileName, extension: ext })
      });
      
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending document:', e);
      return null;
    }
  };
  
  const sendText = async (message: string) => {
    try {
      const { messageId, attempt } = await sendTextViaWapiWithFallback(
        instance.instance_id,
        instance.instance_token,
        conv.remote_jid,
        message,
        1
      );

      console.log(`[Bot Materials] send-text attempt=${attempt} msgId=${messageId}`);
      return messageId;
    } catch (e) {
      console.error('[Bot Materials] Error sending text:', e);
      return null;
    }
  };
  
  const saveMessage = async (msgId: string, type: string, content: string, mediaUrl?: string) => {
    await supabase.from('wapi_messages').insert({
      conversation_id: conv.id,
      message_id: msgId,
      from_me: true,
      message_type: type,
      content,
      media_url: mediaUrl || null,
      status: 'sent',
      timestamp: new Date().toISOString(),
      company_id: instance.company_id,
    });
  };
  
  // 1. SEND PHOTO COLLECTION (with intro text)
  if (sendPhotos && photoCollections.length > 0) {
    const collection = photoCollections[0];
    const photos = collection.photo_urls || [];
    
    if (photos.length > 0) {
      console.log(`[Bot Materials] Sending ${photos.length} photos from collection`);
      
      // Send intro text (use custom or default caption)
      const introText = photosIntro.replace(/\{unidade\}/gi, unit);
      const introMsgId = await sendText(introText);
      if (introMsgId) await saveMessage(introMsgId, 'text', introText);
      
      await new Promise(r => setTimeout(r, messageDelay / 2)); // Half delay for intro before photos
      
      // Send photos sequentially with delay to avoid W-API rate limits
      for (let i = 0; i < photos.length; i++) {
        const msgId = await sendImage(photos[i], '');
        if (msgId) await saveMessage(msgId, 'image', '📷', photos[i]);
        if (i < photos.length - 1) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
      
      console.log(`[Bot Materials] Photos sent`);
      await new Promise(r => setTimeout(r, messageDelay));
    }
  }
  
  // 2. SEND PRESENTATION VIDEO
  if (sendPresentationVideo && presentationVideos.length > 0) {
    const video = presentationVideos[0];
    console.log(`[Bot Materials] Sending presentation video: ${video.name}`);
    
    const videoCaption = captionMap['video'] || `🎬 Conheça a unidade ${unit}! ✨`;
    const caption = videoCaption.replace(/\{unidade\}/gi, unit);
    
    const msgId = await sendVideo(video.file_url, caption);
    if (msgId) await saveMessage(msgId, 'video', caption, video.file_url);
    
    await new Promise(r => setTimeout(r, messageDelay));
  }
  
  // 3. SEND PROMO VIDEO
  if (sendPromoVideo && promoVideos.length > 0) {
    const promoVideo = promoVideos[0];
    console.log(`[Bot Materials] Sending promo video: ${promoVideo.name}`);
    
    const promoCaption = captionMap['video_promo'] || captionMap['video'] || `🎬 Confira nosso vídeo! ✨`;
    const caption = promoCaption.replace(/\{unidade\}/gi, unit);
    
    const msgId = await sendVideo(promoVideo.file_url, caption);
    if (msgId) await saveMessage(msgId, 'video', caption, promoVideo.file_url);
    
    await new Promise(r => setTimeout(r, messageDelay * 1.5));
  }
  
  // 4. SEND PDF PACKAGE (matching guest count or universal) - ALWAYS LAST material
  if (sendPdf && pdfPackages.length > 0) {
    // Separate universal (guest_count=null) from specific PDFs
    const universalPdfs = pdfPackages.filter(p => p.guest_count === null);
    const specificPdfs = pdfPackages.filter(p => p.guest_count !== null);
    
    let pdfsToSend: typeof pdfPackages = [];
    
    if (universalPdfs.length > 0) {
      pdfsToSend = universalPdfs;
      console.log(`[Bot Materials] Found ${universalPdfs.length} universal PDFs`);
    } else if (guestCount && specificPdfs.length > 0) {
      let matchingPdf = specificPdfs.find(p => p.guest_count === guestCount);
      if (!matchingPdf) {
        const sortedPackages = specificPdfs.sort((a, b) => (a.guest_count || 0) - (b.guest_count || 0));
        matchingPdf = sortedPackages.find(p => (p.guest_count || 0) >= guestCount) || sortedPackages[sortedPackages.length - 1];
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
        .replace(/\{unidade\}/gi, unit);
      const introMsgId = await sendText(pdfIntroText);
      if (introMsgId) await saveMessage(introMsgId, 'text', pdfIntroText);
      
      await new Promise(r => setTimeout(r, messageDelay / 4));
      
      for (const pdf of pdfsToSend) {
        const fileExt = pdf.file_url.split('?')[0].split('.').pop()?.toLowerCase() || '';
        const isPkgImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);
        if (isPkgImage) {
          const caption = pdf.name || 'Pacote';
          const msgId = await sendImage(pdf.file_url, caption);
          if (msgId) await saveMessage(msgId, 'image', caption, pdf.file_url);
        } else {
          const fileName = pdf.name?.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim() + '.pdf' || 'Pacote.pdf';
          const msgId = await sendDocument(pdf.file_url, fileName);
          if (msgId) await saveMessage(msgId, 'document', fileName, pdf.file_url);
        }
        if (pdfsToSend.length > 1) await new Promise(r => setTimeout(r, 2000));
      }
      
      await new Promise(r => setTimeout(r, messageDelay));
    }
  }
  
  // Update conversation last message
  await supabase.from('wapi_conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_content: '📄 Materiais enviados',
    last_message_from_me: true
  }).eq('id', conv.id);
  
  console.log(`[Bot Materials] Auto-send complete for ${phone}`);
}

// Wrapper function that sends materials AND THEN the next step question
async function sendQualificationMaterialsThenQuestion(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null },
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
    // First, send all materials
    await sendQualificationMaterials(supabase, instance, conv, botData, settings);
    
    // Delay after materials (uses configured delay)
    await new Promise(r => setTimeout(r, messageDelay));
    
    // Now send the next step question
    console.log(`[Bot] Sending next step question to ${phone}`);
    
    const { messageId: msgId, attempt } = await sendTextViaWapiWithFallback(
      instance.instance_id,
      instance.instance_token,
      conv.remote_jid,
      nextStepQuestion,
      2
    );

    console.log(`[Bot] Next step send attempt=${attempt} msgId=${msgId}`);
    
    if (msgId) {
      await supabase.from('wapi_messages').insert({
        conversation_id: conv.id,
        message_id: msgId,
        from_me: true,
        message_type: 'text',
        content: nextStepQuestion,
        status: 'sent',
        timestamp: new Date().toISOString(),
        company_id: instance.company_id,
      });
    }
    
    // Update conversation to proximo_passo step
    await supabase.from('wapi_conversations').update({
      bot_step: 'proximo_passo',
      last_message_at: new Date().toISOString(),
      last_message_content: nextStepQuestion.substring(0, 100),
      last_message_from_me: true
    }).eq('id', conv.id);
    
    console.log(`[Bot] Next step question sent to ${phone}`);
    
  } catch (err) {
    console.error(`[Bot] Error in sendQualificationMaterialsThenQuestion:`, err);
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

// Fetch profile picture from W-API and update conversation (fire-and-forget)
async function fetchAndUpdateProfilePicture(
  supabase: SupabaseClient,
  instanceId: string,
  instanceToken: string,
  conversationId: string,
  remoteJid: string
): Promise<void> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
    
    // Try W-API profile picture endpoint
    const res = await fetch(
      `${WAPI_BASE_URL}/misc/profile-picture?instanceId=${instanceId}&phone=${phone}`,
      { headers: { 'Authorization': `Bearer ${instanceToken}` } }
    );
    
    if (!res.ok) {
      // Try alternative endpoint format
      const res2 = await fetch(
        `${WAPI_BASE_URL}/contact/profile-picture?instanceId=${instanceId}&phone=${phone}`,
        { headers: { 'Authorization': `Bearer ${instanceToken}` } }
      );
      if (!res2.ok) return;
      const data2 = await res2.json();
      const picUrl = data2?.profilePicture || data2?.profilePictureUrl || data2?.imgUrl || data2?.url || data2?.picture;
      if (picUrl) {
        await supabase.from('wapi_conversations').update({ contact_picture: picUrl }).eq('id', conversationId);
        console.log(`[ProfilePic] Updated profile picture for conversation ${conversationId}`);
      }
      return;
    }
    
    const data = await res.json();
    const picUrl = data?.profilePicture || data?.profilePictureUrl || data?.imgUrl || data?.url || data?.picture;
    if (picUrl) {
      await supabase.from('wapi_conversations').update({ contact_picture: picUrl }).eq('id', conversationId);
      console.log(`[ProfilePic] Updated profile picture for conversation ${conversationId}`);
    }
  } catch (err) {
    // Silent fail - profile picture is not critical
    console.warn(`[ProfilePic] Failed to fetch profile picture:`, err instanceof Error ? err.message : String(err));
  }
}

function extractMsgContent(mc: Record<string, unknown>, msg: Record<string, unknown>) {
  let type = 'text', content = '', url: string | null = null, key: string | null = null, path: string | null = null, fn: string | undefined, download = false, mime: string | null = null;
  
  if (mc.locationMessage) { type = 'location'; const l = mc.locationMessage as Record<string, unknown>; content = `📍 Localização: ${(l.degreesLatitude as number)?.toFixed(6) || '?'}, ${(l.degreesLongitude as number)?.toFixed(6) || '?'}`; }
  else if (mc.liveLocationMessage) { type = 'location'; content = '📍 Localização ao vivo'; }
  else if (mc.contactMessage || mc.contactsArrayMessage) { type = 'contact'; content = `👤 ${(mc.contactMessage as Record<string, unknown>)?.displayName || 'Contato'}`; }
  else if (mc.stickerMessage) { type = 'sticker'; content = '🎭 Figurinha'; }
  else if (mc.reactionMessage) return null;
  else if (mc.pollCreationMessage || mc.pollUpdateMessage) { type = 'poll'; content = '📊 Enquete'; }
  else if ((mc as Record<string, unknown>).conversation) content = (mc as Record<string, string>).conversation;
  else if ((mc.extendedTextMessage as Record<string, unknown>)?.text) content = ((mc.extendedTextMessage as Record<string, unknown>).text as string);
  else if (mc.imageMessage) { const m = mc.imageMessage as Record<string, unknown>; type = 'image'; content = (m.caption as string) || '[Imagem]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.videoMessage) { const m = mc.videoMessage as Record<string, unknown>; type = 'video'; content = (m.caption as string) || '[Vídeo]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.audioMessage) { const m = mc.audioMessage as Record<string, unknown>; type = 'audio'; content = '[Áudio]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentMessage) { const m = mc.documentMessage as Record<string, unknown>; type = 'document'; content = (m.fileName as string) || '[Documento]'; fn = m.fileName as string; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentWithCaptionMessage) { const d = ((mc.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown>)?.documentMessage as Record<string, unknown>; if (d) { type = 'document'; content = (d.caption as string) || (d.fileName as string) || '[Documento]'; fn = d.fileName as string; url = d.url as string || null; key = d.mediaKey as string || null; path = d.directPath as string || null; download = true; mime = d.mimetype as string || null; } }
  else if ((msg as Record<string, string>).body || (msg as Record<string, string>).text) content = (msg as Record<string, string>).body || (msg as Record<string, string>).text;
  
  return { type, content, url, key, path, fn, download, mime };
}

function getPreview(mc: Record<string, unknown>, msg: Record<string, unknown>): string {
  if ((mc as Record<string, unknown>).conversation) return (mc as Record<string, string>).conversation;
  if ((mc.extendedTextMessage as Record<string, unknown>)?.text) return ((mc.extendedTextMessage as Record<string, unknown>).text as string);
  if (mc.imageMessage) return '📷 Imagem';
  if (mc.videoMessage) return '🎥 Vídeo';
  if (mc.audioMessage) return '🎤 Áudio';
  if (mc.documentMessage) return '📄 ' + ((mc.documentMessage as Record<string, unknown>).fileName || 'Documento');
  if (mc.documentWithCaptionMessage) return '📄 ' + (((mc.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown>)?.documentMessage as Record<string, unknown>)?.fileName || 'Documento';
  if (mc.locationMessage) return '📍 Localização';
  if (mc.contactMessage || mc.contactsArrayMessage) return '👤 Contato';
  if (mc.stickerMessage) return '🎭 Figurinha';
  return (msg as Record<string, string>).body || (msg as Record<string, string>).text || '';
}

// Background processor - runs after response is sent
async function processWebhookEvent(body: Record<string, unknown>) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  
  const { event, instanceId, data } = body;
  const { data: instance, error: iErr } = await supabase.from('wapi_instances').select('*').eq('instance_id', instanceId).single();
  if (iErr || !instance) {
    console.log('Instance not found:', instanceId);
    return;
  }

  // === AUTO-RECOVERY: If webhook arrives but DB says disconnected/degraded, the instance IS connected ===
  if (instance.status === 'disconnected' || instance.status === 'degraded') {
    console.warn(`[Webhook] ⚡ Message received for instance ${instanceId} but DB status is "${instance.status}". Auto-recovering status to connected...`);
    await supabase.from('wapi_instances').update({ 
      status: 'connected', 
      connected_at: new Date().toISOString() 
    }).eq('id', instance.id);
    // Update local reference so rest of handler uses correct status
    instance.status = 'connected';
  }

  let evt = event || body.event;

  // If event is undefined but body contains message-like data, treat as message
  if (!evt) {
    const rawD = data as Record<string, unknown> | undefined;
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

  switch (evt) {
    case 'connection': case 'webhookConnected': {
      const c = (data as Record<string, unknown>)?.connected ?? body.connected ?? false;
      const connPhone = (data as Record<string, unknown>)?.phone || body.connectedPhone || null;
      
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
      const rawData = data as Record<string, unknown>;
      console.log(`[Debug-0] evt=${evt}, rawData keys: [${rawData ? Object.keys(rawData).join(',') : 'null'}], body keys: [${Object.keys(body).join(',')}]`);
      const msg = rawData?.key ? rawData : (rawData?.message as Record<string, unknown>) || rawData || body;
      if (!msg) { console.log('[Debug-0] msg is null, breaking'); break; }
      const mc = (msg as Record<string, unknown>).message || (msg as Record<string, unknown>).msgContent || {};
      console.log(`[Debug-0] msg keys: [${Object.keys(msg as object).join(',')}], mc keys: [${Object.keys(mc as object).join(',')}], mc type: ${typeof mc}`);
      if ((mc as Record<string, unknown>).protocolMessage) break;
      
      let rj = (msg as Record<string, unknown>).key?.remoteJid || (msg as Record<string, unknown>).from || (msg as Record<string, unknown>).remoteJid || ((msg as Record<string, unknown>).chat?.id ? `${(msg as Record<string, unknown>).chat?.id}` : null) || ((msg as Record<string, unknown>).sender?.id ? `${(msg as Record<string, unknown>).sender?.id}@s.whatsapp.net` : null);
      if (!rj) break;
      const isGrp = (rj as string).includes('@g.us');
      if (!isGrp && !(rj as string).includes('@')) rj = `${rj}@s.whatsapp.net`;
      else if ((rj as string).includes('@c.us')) rj = (rj as string).replace('@c.us', '@s.whatsapp.net');

      // Ignore Meta Linked IDs (@lid) - they duplicate real messages
      if ((rj as string).includes('@lid')) {
        console.log(`[Webhook] Ignoring @lid message: ${rj}`);
        break;
      }
      
      const fromMe = (msg as Record<string, unknown>).key?.fromMe || (msg as Record<string, unknown>).fromMe || false;
      const msgId = (msg as Record<string, unknown>).key?.id || (msg as Record<string, unknown>).id || (msg as Record<string, unknown>).messageId;
      const phone = (rj as string).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
      
      let cName = isGrp ? ((msg as Record<string, unknown>).chat?.name || (msg as Record<string, unknown>).groupName || (msg as Record<string, unknown>).subject || null) : ((msg as Record<string, unknown>).pushName || (msg as Record<string, unknown>).verifiedBizName || (msg as Record<string, unknown>).sender?.pushName || phone);
      const cPic = (msg as Record<string, unknown>).chat?.profilePicture || (msg as Record<string, unknown>).sender?.profilePicture || null;

      if (Object.keys(mc as object).length === 0 && !(msg as Record<string, unknown>).body && !(msg as Record<string, unknown>).text) { console.log(`[Debug-0] mc empty + no body/text, breaking. msg sample: ${JSON.stringify(msg).substring(0, 400)}`); break; }
      if ((mc as Record<string, unknown>).call || (mc as Record<string, unknown>).callLogMessage || (mc as Record<string, unknown>).bcallMessage || (mc as Record<string, unknown>).missedCallMessage || (msg as Record<string, unknown>).type === 'call' || (msg as Record<string, unknown>).callId) break;

       // Extract message content early (no DB call)
      const mcKeys = Object.keys(mc as object);
      const msgKeys = Object.keys(msg as object);
      console.log(`[Debug] msg keys: [${msgKeys.join(',')}], mc keys: [${mcKeys.join(',')}], mc empty: ${mcKeys.length === 0}`);
      if (mcKeys.length === 0) {
        console.log(`[Debug] msg.body: ${(msg as Record<string,unknown>).body}, msg.text: ${(msg as Record<string,unknown>).text}, msg.type: ${(msg as Record<string,unknown>).type}`);
        console.log(`[Debug] Full msg sample: ${JSON.stringify(msg).substring(0, 500)}`);
      }
      const ext = extractMsgContent(mc as Record<string, unknown>, msg as Record<string, unknown>);
      if (!ext) break;
      let { type, content, url, key, path, fn, download, mime } = ext;

      // Reject text messages with empty content (common in history sync events)
      if (type === 'text' && !content.trim()) {
        console.log(`[Webhook] Skipping empty text message, msgId=${msgId}, phone=${phone}`);
        break;
      }

      console.log(`[Debug] Extracted: type=${type}, download=${download}, hasUrl=${!!url}, hasKey=${!!key}, hasPath=${!!path}, msgId=${msgId}`);
      
      const preview = getPreview(mc as Record<string, unknown>, msg as Record<string, unknown>);
      const messageTimestamp = (msg as Record<string, unknown>).messageTimestamp 
        ? new Date(((msg as Record<string, unknown>).messageTimestamp as number) * 1000).toISOString() 
        : (msg as Record<string, unknown>).moment 
          ? new Date(((msg as Record<string, unknown>).moment as number) * 1000).toISOString() 
          : new Date().toISOString();
      
      // ⏱️ LATENCY: Log after parsing, before DB operations
      console.log(`[Latency] parsing_complete: ${Date.now() - processingStartAt}ms`);
      
      // Fetch existing conversation (single DB call) - use maybeSingle to handle 0 or 1 rows
      const { data: ex, error: exErr } = await supabase.from('wapi_conversations')
        .select('id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, lead_id')
        .eq('instance_id', instance.id)
        .eq('remote_jid', rj)
        .maybeSingle();
      
      if (exErr) {
        console.error(`[Webhook] Error fetching conversation: ${exErr.message}`);
      }
      
      console.log(`[Latency] conversation_fetch: ${Date.now() - processingStartAt}ms, found: ${!!ex}`);
      
      let conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null };
      
      if (ex) {
        conv = ex;
        // Build update object
        const upd: Record<string, unknown> = { 
          last_message_at: new Date().toISOString(), 
          unread_count: fromMe ? ex.unread_count : (ex.unread_count || 0) + 1, 
          last_message_content: preview.substring(0, 100), 
          last_message_from_me: fromMe 
        };
        if (!fromMe && ex.is_closed) upd.is_closed = false;
        // Disable bot when a HUMAN sends a message from the phone directly.
        // Bot-sent and UI-sent messages are already saved in wapi_messages before the webhook fires.
        // Phone-sent messages are NOT in the DB yet → if msgId is absent from wapi_messages, it's human.
        if (fromMe && ex.bot_enabled === true && msgId) {
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
        }
        if (isGrp) { 
          const gn = (msg as Record<string, unknown>).chat?.name || (msg as Record<string, unknown>).groupName || (msg as Record<string, unknown>).subject; 
          if (gn && gn !== ex.contact_name) upd.contact_name = gn; 
        } else if (cName && cName !== ex.contact_name) {
          upd.contact_name = cName;
        }
        if (cPic) upd.contact_picture = cPic;
        
        // Don't await - fire and forget for conversation update
        supabase.from('wapi_conversations').update(upd).eq('id', ex.id).then(() => {});
        
        // If no profile picture, fetch it in background
        if (!cPic && !ex.contact_picture) {
          fetchAndUpdateProfilePicture(supabase, instance.instance_id, instance.instance_token, ex.id, rj as string)
            .catch(() => {});
        }
      } else {
        // New conversation - need to check for existing lead
        // First, do a final check to prevent race conditions (upsert-like behavior)
        const { data: raceCheck } = await supabase.from('wapi_conversations')
          .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id')
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
          const shouldStartBot = !isGroupJid && !hasCompleteLead;
          
          const { data: nc, error: ce } = await supabase.from('wapi_conversations').insert({
            instance_id: instance.id, remote_jid: rj, contact_phone: phone, 
            contact_name: cName || (isGrp ? `Grupo ${phone}` : phone), contact_picture: cPic,
            last_message_at: new Date().toISOString(), unread_count: fromMe ? 0 : 1, 
            last_message_content: preview.substring(0, 100), last_message_from_me: fromMe,
            lead_id: lead?.id || null, bot_enabled: shouldStartBot, 
            bot_step: shouldStartBot ? 'welcome' : null, bot_data: {},
            company_id: instance.company_id,
          }).select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id').single();
          
          if (ce) {
            // If insert fails due to unique constraint, fetch existing
            console.log(`[Webhook] Insert failed (likely duplicate): ${ce.message}`);
            const { data: fallback } = await supabase.from('wapi_conversations')
              .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id')
              .eq('instance_id', instance.id)
              .eq('remote_jid', rj)
              .single();
            if (!fallback) break;
            conv = fallback;
          } else {
            conv = nc;
            // Fetch profile picture in background for new conversations
            if (!cPic && nc?.id) {
              fetchAndUpdateProfilePicture(supabase, instance.instance_id, instance.instance_token, nc.id, rj as string)
                .catch(() => {});
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
            participant: ((msg as Record<string, unknown>).key?.participant || (msg as Record<string, unknown>).participant || '').replace('@s.whatsapp.net',''),
            sender_name: (msg as Record<string, unknown>).pushName || (msg as Record<string, unknown>).sender?.pushName || null
          } : null;
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: fromMe, message_type: type, content,
            media_url: url, media_key: key, media_direct_path: path, status: 'sent',
            timestamp: messageTimestamp,
            company_id: instance.company_id,
            metadata: grpMeta1,
          });
        }
      } else {
        const grpMeta2 = isGrp ? {
          participant: ((msg as Record<string, unknown>).key?.participant || (msg as Record<string, unknown>).participant || '').replace('@s.whatsapp.net',''),
          sender_name: (msg as Record<string, unknown>).pushName || (msg as Record<string, unknown>).sender?.pushName || null
        } : null;
        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: fromMe, message_type: type, content,
          media_url: url, media_key: key, media_direct_path: path, status: fromMe ? 'sent' : 'received',
          timestamp: messageTimestamp,
          company_id: instance.company_id,
          metadata: grpMeta2,
        });
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

      // Process bot qualification - MUST await to ensure bot messages are saved before function terminates
      if (!fromMe && !isGrp && type === 'text' && content) {
        try {
          await processBotQualification(supabase, instance, conv, content, phone, cName as string | null);
        } catch (err) {
          console.error('[Bot qualification error]', err);
        }
      }
      break;
    }
    case 'message-status': case 'message_ack': case 'webhookStatus': case 'webhookDelivery': {
      const sd = data || body, mId = (sd as Record<string, unknown>)?.messageId || body?.messageId, st = (sd as Record<string, unknown>)?.status, ack = (sd as Record<string, unknown>)?.ack;
      const fm = body?.fromMe || (sd as Record<string, unknown>)?.fromMe || false, mcd = body?.msgContent || (sd as Record<string, unknown>)?.msgContent;
      
      if (fm && mcd && mId) {
        const { data: em } = await supabase.from('wapi_messages').select('id').eq('message_id', mId).single();
        if (!em) {
          const cId = (body?.chat as Record<string, unknown>)?.id || (sd as Record<string, unknown>)?.chat?.id;
          if (cId) {
            let rj = (cId as string).includes('@') ? cId : `${cId}@s.whatsapp.net`;
            const p = (rj as string).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
            if (!(rj as string).includes('@g.us')) {
              const { data: ec } = await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', rj).maybeSingle();
              let pv = '';
              if ((mcd as Record<string, unknown>).conversation) pv = (mcd as Record<string, unknown>).conversation as string;
              else if ((mcd as Record<string, unknown>).extendedTextMessage?.text) pv = (mcd as Record<string, unknown>).extendedTextMessage?.text as string;
              else if ((mcd as Record<string, unknown>).imageMessage) pv = '📷 Imagem';
              else if ((mcd as Record<string, unknown>).documentMessage) pv = '📄 ' + ((mcd as Record<string, unknown>).documentMessage?.fileName || 'Documento');
              
              let cv;
              if (ec) {
                // Check if this outgoing message was sent by a human from the phone
                // by checking if message_id already exists in wapi_messages
                const statusMsgId = (sd as Record<string, unknown>)?.key?.id || (body as Record<string, unknown>)?.key?.id;
                let shouldDisableBot = false;
                if (ec.bot_enabled === true && statusMsgId) {
                  const { data: existingStatusMsg } = await supabase.from('wapi_messages')
                    .select('id')
                    .eq('message_id', statusMsgId)
                    .maybeSingle();
                  if (!existingStatusMsg) {
                    shouldDisableBot = true;
                    console.log(`[Bot] Human phone message detected in status handler (msgId ${statusMsgId}), disabling bot for conv ${ec.id}`);
                  }
                }
                cv = ec; await supabase.from('wapi_conversations').update({ last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, ...(shouldDisableBot ? { bot_enabled: false, bot_step: null } : {}) }).eq('id', ec.id);
              }
              else { const { data: nc } = await supabase.from('wapi_conversations').insert({ instance_id: instance.id, remote_jid: rj, contact_phone: p, contact_name: (body?.chat as Record<string, unknown>)?.name || p, last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, bot_enabled: false, company_id: instance.company_id }).select().single(); cv = nc; }
              
               if (cv) {
                let ct = '', tp = 'text', mu: string | null = null, mk: string | null = null, dp: string | null = null, mm: string | null = null;
                if ((mcd as Record<string, unknown>).conversation) ct = (mcd as Record<string, unknown>).conversation as string;
                else if ((mcd as Record<string, unknown>).extendedTextMessage?.text) ct = (mcd as Record<string, unknown>).extendedTextMessage?.text as string;
                else if ((mcd as Record<string, unknown>).imageMessage) { 
                  const im = (mcd as Record<string, unknown>).imageMessage as Record<string, unknown>;
                  tp = 'image'; ct = (im.caption as string) || '[Imagem]'; mu = im.url as string || null; mk = im.mediaKey as string || null; dp = im.directPath as string || null; mm = im.mimetype as string || null;
                }
                else if ((mcd as Record<string, unknown>).videoMessage) {
                  const vm = (mcd as Record<string, unknown>).videoMessage as Record<string, unknown>;
                  tp = 'video'; ct = (vm.caption as string) || '[Vídeo]'; mu = vm.url as string || null; mk = vm.mediaKey as string || null; dp = vm.directPath as string || null; mm = vm.mimetype as string || null;
                }
                else if ((mcd as Record<string, unknown>).audioMessage) {
                  const am = (mcd as Record<string, unknown>).audioMessage as Record<string, unknown>;
                  tp = 'audio'; ct = '[Áudio]'; mu = am.url as string || null; mk = am.mediaKey as string || null; dp = am.directPath as string || null; mm = am.mimetype as string || null;
                }
                else if ((mcd as Record<string, unknown>).documentMessage) { 
                  const dm = (mcd as Record<string, unknown>).documentMessage as Record<string, unknown>;
                  tp = 'document'; ct = (dm.fileName as string) || '[Documento]'; mu = dm.url as string || null; mk = dm.mediaKey as string || null; dp = dm.directPath as string || null; mm = dm.mimetype as string || null;
                }
                
                await supabase.from('wapi_messages').insert({ conversation_id: cv.id, message_id: mId, from_me: true, message_type: tp, content: ct, media_url: mu, media_key: mk, media_direct_path: dp, status: 'sent', timestamp: body.moment ? new Date((body.moment as number) * 1000).toISOString() : new Date().toISOString(), company_id: instance.company_id });
                
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
      
      const sm: Record<string | number, string> = { 0: 'error', 1: 'pending', 2: 'sent', 3: 'delivered', 4: 'read', 'PENDING': 'pending', 'SENT': 'sent', 'DELIVERY': 'delivered', 'READ': 'read', 'PLAYED': 'read', 'ERROR': 'error' };
      const ns = sm[st as string | number] || sm[ack as string | number] || 'unknown';
      if (mId && ns !== 'unknown') await supabase.from('wapi_messages').update({ status: ns }).eq('message_id', mId);
      break;
    }
    default: {
      // Log full body structure for debugging
      const bodyKeys = Object.keys(body).join(', ');
      console.log(`Unhandled event: ${evt}, body keys: [${bodyKeys}]`);
      if (body.msgContent) console.log(`[Unknown] Has msgContent keys: [${Object.keys(body.msgContent).join(', ')}]`);
      if (body.chat) console.log(`[Unknown] Has chat.id: ${(body.chat as Record<string, unknown>)?.id}`);
      
      // Try to extract message from unknown events - W-API sometimes sends messages with different event names
      const unknownMsg = (data as Record<string, unknown>)?.message || data || body;
      const unknownMc = (unknownMsg as Record<string, unknown>)?.message || (unknownMsg as Record<string, unknown>)?.msgContent || {};
      const unknownFromMe = (unknownMsg as Record<string, unknown>)?.key?.fromMe || (unknownMsg as Record<string, unknown>)?.fromMe || false;
      
      // If this looks like a message we haven't handled, log details
      if (unknownFromMe || (unknownMsg as Record<string, unknown>)?.key?.id || (unknownMsg as Record<string, unknown>)?.messageId) {
        const msgId = (unknownMsg as Record<string, unknown>)?.key?.id || (unknownMsg as Record<string, unknown>)?.messageId;
        const rj = (unknownMsg as Record<string, unknown>)?.key?.remoteJid || (unknownMsg as Record<string, unknown>)?.from || (unknownMsg as Record<string, unknown>)?.remoteJid;
        console.log(`[Unknown event with message data] fromMe: ${unknownFromMe}, msgId: ${msgId}, remoteJid: ${rj}`);
        
        // If it's a fromMe message we haven't seen, process it like a regular message
        if (unknownFromMe && msgId && rj) {
          let jid = rj as string;
          if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`;
          else if (jid.includes('@c.us')) jid = jid.replace('@c.us', '@s.whatsapp.net');
          
          const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
          const isGrp = jid.includes('@g.us');
          
          // Skip group messages
          if (!isGrp) {
            const { data: existingConv } = await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', jid).single();
            
            if (existingConv) {
              // Check if message already exists
              const { data: existingMsg } = await supabase.from('wapi_messages').select('id').eq('message_id', msgId).single();
              
              if (!existingMsg) {
                // Extract content from unknown message
                let content = '';
                let type = 'text';
                let mediaUrl = null;
                
                if ((unknownMc as Record<string, unknown>).conversation) content = (unknownMc as Record<string, string>).conversation;
                else if ((unknownMc as Record<string, unknown>).extendedTextMessage?.text) content = ((unknownMc as Record<string, unknown>).extendedTextMessage as Record<string, unknown>).text as string;
                else if ((unknownMc as Record<string, unknown>).imageMessage) { type = 'image'; content = ((unknownMc as Record<string, unknown>).imageMessage as Record<string, unknown>).caption as string || '[Imagem]'; mediaUrl = ((unknownMc as Record<string, unknown>).imageMessage as Record<string, unknown>).url as string; }
                else if ((unknownMc as Record<string, unknown>).documentMessage) { type = 'document'; content = ((unknownMc as Record<string, unknown>).documentMessage as Record<string, unknown>).fileName as string || '[Documento]'; mediaUrl = ((unknownMc as Record<string, unknown>).documentMessage as Record<string, unknown>).url as string; }
                else if ((unknownMc as Record<string, unknown>).videoMessage) { type = 'video'; content = ((unknownMc as Record<string, unknown>).videoMessage as Record<string, unknown>).caption as string || '[Vídeo]'; mediaUrl = ((unknownMc as Record<string, unknown>).videoMessage as Record<string, unknown>).url as string; }
                else if ((unknownMc as Record<string, unknown>).audioMessage) { type = 'audio'; content = '[Áudio]'; mediaUrl = ((unknownMc as Record<string, unknown>).audioMessage as Record<string, unknown>).url as string; }
                else if ((unknownMsg as Record<string, string>).body) content = (unknownMsg as Record<string, string>).body;
                else if ((unknownMsg as Record<string, string>).text) content = (unknownMsg as Record<string, string>).text;
                
                if (content) {
                  console.log(`[Unknown event] Saving fromMe message: ${content.substring(0, 50)}...`);
                  
                  await supabase.from('wapi_messages').insert({
                    conversation_id: existingConv.id,
                    message_id: msgId,
                    from_me: true,
                    message_type: type,
                    content,
                    media_url: mediaUrl,
                    status: 'sent',
                    timestamp: (unknownMsg as Record<string, unknown>).messageTimestamp 
                      ? new Date(((unknownMsg as Record<string, unknown>).messageTimestamp as number) * 1000).toISOString() 
                      : new Date().toISOString(),
                    company_id: instance.company_id,
                  });
                  
                  // Update conversation - but don't disable bot during active steps
                  const unknownActiveBotSteps = ['welcome', 'tipo', 'nome', 'mes', 'dia', 'convidados', 'sending_materials', 'proximo_passo', 'proximo_passo_reminded'];
                  const unknownIsFlowStep = (existingConv.bot_step || '').startsWith('flow_');
                  const unknownIsBotActive = unknownActiveBotSteps.includes(existingConv.bot_step || '') || unknownIsFlowStep;
                  
                  await supabase.from('wapi_conversations').update({
                    last_message_at: new Date().toISOString(),
                    last_message_content: content.substring(0, 100),
                    last_message_from_me: true,
                    ...(existingConv.bot_step && existingConv.bot_step !== 'complete' && !unknownIsBotActive ? { bot_enabled: false } : {})
                  }).eq('id', existingConv.id);
                  
                  console.log(`[Unknown event] Message saved successfully`);
                }
              }
            }
          }
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    
    // Quick validation - check if instance exists
    const instanceId = body.instanceId;
    if (!instanceId) {
      console.log('No instanceId in webhook');
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Log minimal info for debugging
    const evt = body.event || 'unknown';
    console.log(`Webhook: ${evt} from ${instanceId}`);
    
    // Process in background - return response immediately
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processWebhookEvent(body));
    } else {
      // Fallback for environments without waitUntil - process async but don't await
      processWebhookEvent(body).catch(e => console.error('Background processing error:', e));
    }

    // Return immediately - don't wait for processing
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: unknown) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
