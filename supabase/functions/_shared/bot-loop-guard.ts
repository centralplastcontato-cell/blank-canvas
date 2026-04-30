// Bot loop / circuit breaker shared helper.
// Detects when an external automation (another bot, autoresponder, etc.)
// is replying to our bot in a loop and pauses outbound automation
// silently for that conversation.
//
// Detection signals (any one trips a 24h pause):
//   (a) FREQUENCY: >= 6 inbound messages in last 60 seconds
//   (b) ACUTE VOLUME: >= 10 inbound messages in last 120 seconds
//   (c) REPETITION: same normalized inbound content >= 3 times in last 5 inbound msgs
//   (d) ALTERNATING: last 6 inbound messages reduce to <= 2 distinct contents (A,B,A,B,…)
//   (e) BOT-LIKE BURST: inbound contains bot-marker phrases AND >= 3 inbound in 60s
//
// Pause is silent: no notification, no auto-reply. Manual chat from
// platform UI continues to work (we only block calls flagged via
// `automation: true` in wapi-send).

// deno-lint-ignore no-explicit-any
type SB = any;

const FREQ_WINDOW_SECONDS = 60;
const FREQ_THRESHOLD = 6;
const ACUTE_WINDOW_SECONDS = 120;
const ACUTE_THRESHOLD = 10;
const REPEAT_WINDOW = 5;
const REPEAT_THRESHOLD = 3;
const ALT_WINDOW = 6;
const ALT_DISTINCT_MAX = 2;
const BOT_HINT_FREQ_THRESHOLD = 3;
const PAUSE_HOURS = 24;

// Marker phrases that strongly suggest the sender is itself an automation/bot.
const BOT_HINT_PATTERNS: RegExp[] = [
  /\bpor favor,?\s+(responda|digite|escolha|envie)\b/i,
  /\bdigite\s+(apenas|somente|só)\b/i,
  /\bresponda\s+(apenas|somente|só)\s+com\b/i,
  /\b(ol[áa]!?\s+eu\s+sou|sou\s+(o|a)\s+(robo|robô|atendente\s+virtual|assistente))\b/i,
  /[1-9]\s*[️⃣]/, // 1️⃣ 2️⃣ keycap emoji
  /\*\s*n[úu]mero\s*\*/i,
  /\b(menu|op[çc][ãa]o)\s+\d\b/i,
];

function normalizeContent(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function looksLikeBotMessage(s: string | null | undefined): boolean {
  const v = String(s || '');
  if (!v) return false;
  return BOT_HINT_PATTERNS.some((re) => re.test(v));
}

export type LoopReason =
  | 'frequency'
  | 'acute_volume'
  | 'repetition'
  | 'alternating'
  | 'bot_marker_burst';

export interface LoopGuardResult {
  paused: boolean;
  reason?: LoopReason;
  pausedUntil?: string;
}

/**
 * Call AFTER inserting an inbound (from_me=false) message.
 * Returns paused=true if circuit breaker tripped (caller should skip bot reply).
 */
export async function detectAndPauseBotLoop(
  supabase: SB,
  conversationId: string,
  newContent: string | null | undefined,
): Promise<LoopGuardResult> {
  try {
    // (a) frequency in 60s
    const sinceFreq = new Date(Date.now() - FREQ_WINDOW_SECONDS * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('wapi_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('from_me', false)
      .gte('timestamp', sinceFreq);

    let reason: LoopReason | null = null;
    if ((recentCount ?? 0) >= FREQ_THRESHOLD) reason = 'frequency';

    // (b) acute volume in 120s
    if (!reason) {
      const sinceAcute = new Date(Date.now() - ACUTE_WINDOW_SECONDS * 1000).toISOString();
      const { count: acuteCount } = await supabase
        .from('wapi_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('from_me', false)
        .gte('timestamp', sinceAcute);
      if ((acuteCount ?? 0) >= ACUTE_THRESHOLD) reason = 'acute_volume';
    }

    // (c) (d) need recent inbound contents
    if (!reason) {
      const { data: recent } = await supabase
        .from('wapi_messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('from_me', false)
        .order('timestamp', { ascending: false })
        .limit(ALT_WINDOW);

      if (recent && recent.length >= REPEAT_THRESHOLD) {
        // (c) repetition of newContent
        const target = normalizeContent(newContent);
        if (target) {
          const matches = recent.filter(
            (m: { content: string | null }) => normalizeContent(m.content) === target,
          ).length;
          if (matches >= REPEAT_THRESHOLD) reason = 'repetition';
        }
      }

      // (d) alternating: last ALT_WINDOW inbound reduce to <= 2 distinct
      if (!reason && recent && recent.length >= ALT_WINDOW) {
        const distinct = new Set(
          recent
            .map((m: { content: string | null }) => normalizeContent(m.content))
            .filter((c: string) => c.length > 0),
        );
        if (distinct.size > 0 && distinct.size <= ALT_DISTINCT_MAX) {
          reason = 'alternating';
        }
      }
    }

    // (e) bot-marker burst: lower frequency threshold when content looks bot-like
    if (!reason && looksLikeBotMessage(newContent)) {
      if ((recentCount ?? 0) >= BOT_HINT_FREQ_THRESHOLD) {
        reason = 'bot_marker_burst';
      }
    }

    if (!reason) return { paused: false };

    const pausedUntil = new Date(Date.now() + PAUSE_HOURS * 3600 * 1000).toISOString();
    await supabase.from('wapi_conversations')
      .update({
        bot_paused_until: pausedUntil,
        bot_paused_reason: `loop_${reason}`,
        bot_paused_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    console.warn(`[BotLoopGuard] 🛑 Conversation ${conversationId} paused (reason=${reason}) until ${pausedUntil}`);
    return { paused: true, reason, pausedUntil };
  } catch (err) {
    console.error('[BotLoopGuard] error', err);
    return { paused: false };
  }
}

/**
 * Returns true if conversation currently has an active automation pause.
 */
export async function isConversationPaused(
  supabase: SB,
  conversationId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('wapi_conversations')
      .select('bot_paused_until')
      .eq('id', conversationId)
      .maybeSingle();
    if (!data?.bot_paused_until) return false;
    return new Date(data.bot_paused_until).getTime() > Date.now();
  } catch {
    return false;
  }
}
