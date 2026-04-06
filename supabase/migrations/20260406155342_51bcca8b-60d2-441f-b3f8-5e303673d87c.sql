
INSERT INTO wapi_bot_settings (
  instance_id, company_id, bot_enabled, test_mode_enabled, test_mode_number,
  message_delay_seconds, welcome_message, completion_message, transfer_message,
  qualified_lead_message, next_step_question, next_step_visit_response,
  next_step_questions_response, next_step_analyze_response,
  follow_up_enabled, follow_up_delay_hours, follow_up_message,
  follow_up_2_enabled, follow_up_2_delay_hours, follow_up_2_message,
  follow_up_3_enabled, follow_up_3_delay_hours, follow_up_3_message,
  follow_up_4_enabled, follow_up_4_delay_hours, follow_up_4_message,
  auto_send_materials, auto_send_pdf, auto_send_pdf_intro,
  auto_send_photos, auto_send_photos_intro,
  auto_send_presentation_video, auto_send_promo_video,
  next_step_reminder_enabled, next_step_reminder_delay_minutes, next_step_reminder_message,
  use_flow_builder, bot_inactive_followup_enabled, bot_inactive_followup_delay_minutes,
  bot_inactive_followup_message, ai_context,
  auto_lost_enabled, auto_lost_delay_hours,
  follow_up_min_hour, follow_up_max_hour, follow_up_send_min_delay, follow_up_send_max_delay,
  work_here_response, redirect_completion_message,
  guest_limit, guest_limit_message, guest_limit_redirect_name
)
SELECT
  '75feab3b-eb12-44f0-8ada-463e5540c869',
  company_id, bot_enabled, test_mode_enabled, test_mode_number,
  message_delay_seconds, welcome_message, completion_message, transfer_message,
  qualified_lead_message, next_step_question, next_step_visit_response,
  next_step_questions_response, next_step_analyze_response,
  follow_up_enabled, follow_up_delay_hours, follow_up_message,
  follow_up_2_enabled, follow_up_2_delay_hours, follow_up_2_message,
  follow_up_3_enabled, follow_up_3_delay_hours, follow_up_3_message,
  follow_up_4_enabled, follow_up_4_delay_hours, follow_up_4_message,
  auto_send_materials, auto_send_pdf, auto_send_pdf_intro,
  auto_send_photos, auto_send_photos_intro,
  auto_send_presentation_video, auto_send_promo_video,
  next_step_reminder_enabled, next_step_reminder_delay_minutes, next_step_reminder_message,
  use_flow_builder, bot_inactive_followup_enabled, bot_inactive_followup_delay_minutes,
  bot_inactive_followup_message, ai_context,
  auto_lost_enabled, auto_lost_delay_hours,
  follow_up_min_hour, follow_up_max_hour, follow_up_send_min_delay, follow_up_send_max_delay,
  work_here_response, redirect_completion_message,
  guest_limit, guest_limit_message, guest_limit_redirect_name
FROM wapi_bot_settings
WHERE instance_id = '9b846163-9580-436b-a33e-1e0eca106514';
