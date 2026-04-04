UPDATE visit_confirmation_settings
SET second_message_text = REPLACE(second_message_text, 'sua visita hoje', 'sua visita {{dia_visita}}')
WHERE second_message_text LIKE '%sua visita hoje%';