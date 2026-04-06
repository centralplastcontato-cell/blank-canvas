
UPDATE wapi_conversations 
SET bot_step = 'welcome', bot_enabled = true
WHERE id IN ('907cf20b-81f2-439d-8db4-c4534dafcfd4', 'beff335d-42c7-488f-aefd-804a3e636bba')
AND bot_step = 'lp_sent';
