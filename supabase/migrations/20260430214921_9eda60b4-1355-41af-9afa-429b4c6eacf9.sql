UPDATE public.wapi_conversations
SET bot_paused_until = now() + interval '12 hours',
    bot_paused_reason = 'manual_loop_planeta_vanessa',
    bot_paused_at = now()
WHERE id = 'd2198bda-31cc-4384-8b42-dae92b4421ae';

UPDATE public.wapi_conversations
SET bot_paused_until = now() + interval '12 hours',
    bot_paused_reason = 'manual_loop_planeta_kelly',
    bot_paused_at = now()
WHERE id = 'e73462bd-8567-4ec9-ac0c-f2bdba5bc8d7';

UPDATE public.wapi_conversations
SET bot_paused_until = now() + interval '365 days',
    bot_paused_reason = 'broadcast_not_real_contact',
    bot_paused_at = now(),
    bot_enabled = false
WHERE remote_jid ILIKE '%@broadcast%' OR remote_jid ILIKE 'status@%';
