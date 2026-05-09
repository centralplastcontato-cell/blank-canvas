update public.wapi_bot_settings
set bot_inactive_followup_enabled = true
where instance_id = 'ba0a2a17-110e-447d-a22a-f481e21c7894';

update public.wapi_conversations
set lead_id = 'e8dce1c4-2571-495e-b689-dc956256519a'
where id = '752d7854-ff25-4be7-b6a0-8e54ce1529c5'
  and lead_id is null;