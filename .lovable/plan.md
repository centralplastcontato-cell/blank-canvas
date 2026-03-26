

## Plan: Fix Bot Not Deactivating After Human Takeover

### Problem
When a human agent takes over a conversation (e.g., client chose "Falar com atendente"), the bot reactivates when the client replies to the human. Two root causes:

1. **Flow Builder skips `human_takeover` check**: `processFlowBuilderMessage()` is called before the guard that checks for `human_takeover` in `processBotQualification()`. The Flow Builder has no equivalent guard.

2. **Race condition with stale data**: The webhook reads the conversation once, then passes that stale object to bot processing. If the UI's `human_takeover` update hasn't committed yet, or the conversation update from the outgoing message webhook is fire-and-forget, the bot sees `bot_enabled: true`.

### Solution

**File: `supabase/functions/wapi-webhook/index.ts`**

**Fix 1 — Re-read conversation before bot processing (line ~4231)**
Before calling `processBotQualification`, re-fetch the conversation from DB to get the latest `bot_enabled` and `bot_step`. This eliminates the race condition where the UI or outgoing-message webhook updated the conversation after the initial fetch.

```typescript
// Before bot processing, re-read conversation to catch any concurrent updates
// (e.g., human_takeover set by UI or phone-message webhook)
if (!fromMe && !isGrp && type === 'text' && content) {
  const { data: freshConv } = await supabase.from('wapi_conversations')
    .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id')
    .eq('id', conv.id)
    .single();
  if (freshConv) conv = freshConv;
  
  // Skip bot if disabled after re-read
  if (conv.bot_enabled === false && ['human_takeover', ...].includes(conv.bot_step)) {
    // don't process bot
  } else {
    await processBotQualification(...);
  }
}
```

**Fix 2 — Add `human_takeover` guard to Flow Builder (line ~606)**
At the top of `processFlowBuilderMessage()`, add a check:
```typescript
if (conv.bot_step === 'human_takeover' || conv.bot_enabled === false) {
  console.log(`[FlowBuilder] Bot disabled (step: ${conv.bot_step}), skipping`);
  return;
}
```

**Fix 3 — Make outgoing message conversation update awaited (line ~4072)**
Change the fire-and-forget update to `await` so the `human_takeover` flag is committed before the response returns, reducing the race window for the client's next message.

### Technical Details
- The fix adds ~1 extra DB read per incoming text message (the re-fetch), which is acceptable given it prevents incorrect bot activations
- The Flow Builder guard is a simple early-return check
- Awaiting the conversation update adds minimal latency but ensures consistency

### Impact
- Bot will no longer reactivate after human takeover
- Both legacy bot and Flow Builder paths are protected
- The re-read approach handles all race conditions (UI update, phone message, concurrent webhooks)

