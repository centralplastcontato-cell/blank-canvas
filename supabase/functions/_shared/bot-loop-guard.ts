// Bot loop / circuit breaker shared helper.
// Detects when an external automation (another bot, autoresponder, etc.)
// is replying to our bot in a loop and pauses outbound automation
// silently for that conversation.
//
// Two signals trigger pause:
//   (a) FREQUENCY: >= 6 inbound messages in the last 60 seconds
//   (b) REPETITION: same normalized inbound content >= 3 times in last 5 inbound msgs
//
// When triggered, sets wapi_conversations.bot_paused_until = now()+24h.
// Pause is silent: no notification, no auto-reply. Manual chat from
// platform UI continues to work (we only block calls that opt-in via
// `automation: true` body flag in wapi-send).

// deno-lint-ignore no-explicit-any
type SB = any;

const FREQ_WINDOW_SECONDS = 60;
const FREQ_THRESHOLD = 6;
const REPEAT_WINDOW = 5;
const REPEAT_THRESHOLD = 3;
const PAUSE_HOURS = 24;

function normalizeContent(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export interface LoopGuardResult {
  paused: boolean;
  reason?: 'frequency' | 'repetition';
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
    const sinceFreq = new Date(Date.now() - FREQ_WINDOW_SECONDS * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('wapi_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('from_me', false)
      .gte('timestamp', sinceFreq);

    let reason: 'frequency' | 'repetition' | null = null;
    if ((recentCount ?? 0) >= FREQ_THRESHOLD) reason = 'frequency';

    if (!reason) {
      const { data: recent } = await supabase
        .from('wapi_messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('from_me', false)
        .order('timestamp', { ascending: false })
        .limit(REPEAT_WINDOW);
      if (recent && recent.length >= REPEAT_THRESHOLD) {
        const target = normalizeContent(newContent);
        if (target) {
          const matches = recent.filter((m: { content: string | null }) => normalizeContent(m.content) === target).length;
          if (matches >= REPEAT_THRESHOLD) reason = 'repetition';
        }
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
