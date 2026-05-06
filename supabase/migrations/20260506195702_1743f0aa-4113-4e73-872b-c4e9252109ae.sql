update wapi_conversations
set bot_data = (bot_data - '_recovery_attempted' - 'mes' - 'dia'),
    bot_step = 'mes'
where id = 'fb2d5906-ca44-4194-94d5-153e57a95f57';