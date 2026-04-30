UPDATE public.wapi_conversations
SET bot_paused_until = now() + interval '24 hours',
    bot_paused_reason = 'manual_loop_planeta_megamagic',
    bot_paused_at = now()
WHERE id IN (
  '421f7e75-d7a9-4b9c-b032-22b76d52845d',
  '7fb5daaf-1ab1-4d9c-a89f-b53405a74396'
);