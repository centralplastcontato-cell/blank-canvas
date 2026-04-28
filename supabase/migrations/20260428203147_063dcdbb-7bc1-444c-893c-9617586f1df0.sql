-- 1) Copy wapi_bot_settings from old W-API (ac42...) to new Z-API (408b...)
-- Preserve target's id, instance_id, company_id, created_at, updated_at, and bot_enabled=false
UPDATE public.wapi_bot_settings tgt SET
  test_mode_enabled = src.test_mode_enabled,
  test_mode_number = src.test_mode_number,
  message_delay_seconds = src.message_delay_seconds,
  welcome_message = src.welcome_message,
  completion_message = src.completion_message,
  transfer_message = src.transfer_message,
  qualified_lead_message = src.qualified_lead_message,
  next_step_question = src.next_step_question,
  next_step_visit_response = src.next_step_visit_response,
  next_step_questions_response = src.next_step_questions_response,
  next_step_analyze_response = src.next_step_analyze_response,
  follow_up_enabled = src.follow_up_enabled,
  follow_up_delay_hours = src.follow_up_delay_hours,
  follow_up_message = src.follow_up_message,
  follow_up_2_enabled = src.follow_up_2_enabled,
  follow_up_2_delay_hours = src.follow_up_2_delay_hours,
  follow_up_2_message = src.follow_up_2_message,
  follow_up_3_enabled = src.follow_up_3_enabled,
  follow_up_3_delay_hours = src.follow_up_3_delay_hours,
  follow_up_3_message = src.follow_up_3_message,
  follow_up_4_enabled = src.follow_up_4_enabled,
  follow_up_4_delay_hours = src.follow_up_4_delay_hours,
  follow_up_4_message = src.follow_up_4_message,
  follow_up_min_hour = src.follow_up_min_hour,
  follow_up_max_hour = src.follow_up_max_hour,
  follow_up_send_min_delay = src.follow_up_send_min_delay,
  follow_up_send_max_delay = src.follow_up_send_max_delay,
  auto_send_materials = src.auto_send_materials,
  auto_send_pdf = src.auto_send_pdf,
  auto_send_pdf_intro = src.auto_send_pdf_intro,
  auto_send_photos = src.auto_send_photos,
  auto_send_photos_intro = src.auto_send_photos_intro,
  auto_send_presentation_video = src.auto_send_presentation_video,
  auto_send_promo_video = src.auto_send_promo_video,
  next_step_reminder_enabled = src.next_step_reminder_enabled,
  next_step_reminder_delay_minutes = src.next_step_reminder_delay_minutes,
  next_step_reminder_message = src.next_step_reminder_message,
  work_here_response = src.work_here_response,
  use_flow_builder = src.use_flow_builder,
  bot_inactive_followup_enabled = src.bot_inactive_followup_enabled,
  bot_inactive_followup_delay_minutes = src.bot_inactive_followup_delay_minutes,
  bot_inactive_followup_message = src.bot_inactive_followup_message,
  guest_limit = src.guest_limit,
  guest_limit_message = src.guest_limit_message,
  guest_limit_redirect_name = src.guest_limit_redirect_name,
  ai_context = src.ai_context,
  auto_lost_enabled = src.auto_lost_enabled,
  auto_lost_delay_hours = src.auto_lost_delay_hours,
  redirect_completion_message = src.redirect_completion_message,
  -- explicitly keep bot disabled per user choice
  bot_enabled = false,
  updated_at = now()
FROM public.wapi_bot_settings src
WHERE tgt.instance_id = '408bd5f5-81cd-4266-a487-652457633c95'
  AND src.instance_id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64';

-- 2) Replace wapi_bot_questions for the new instance with copies from the old one
DELETE FROM public.wapi_bot_questions
WHERE instance_id = '408bd5f5-81cd-4266-a487-652457633c95';

INSERT INTO public.wapi_bot_questions (
  instance_id, company_id, step, question_text, confirmation_text, sort_order, is_active
)
SELECT
  '408bd5f5-81cd-4266-a487-652457633c95'::uuid,
  (SELECT company_id FROM public.wapi_bot_settings WHERE instance_id = '408bd5f5-81cd-4266-a487-652457633c95'),
  step, question_text, confirmation_text, sort_order, is_active
FROM public.wapi_bot_questions
WHERE instance_id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64';