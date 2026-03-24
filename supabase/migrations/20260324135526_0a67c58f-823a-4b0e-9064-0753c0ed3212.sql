
-- Add lead routing columns to lp_bot_settings
ALTER TABLE lp_bot_settings 
  ADD COLUMN IF NOT EXISTS lead_routing_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS lead_routing_counter integer NOT NULL DEFAULT 0;

-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS public.get_lp_bot_settings_public(uuid);

CREATE OR REPLACE FUNCTION public.get_lp_bot_settings_public(_company_id uuid)
 RETURNS TABLE(welcome_message text, month_question text, guest_question text, name_question text, whatsapp_question text, completion_message text, month_options jsonb, guest_options jsonb, guest_limit integer, guest_limit_message text, guest_limit_redirect_name text, redirect_completion_message text, whatsapp_welcome_template text, lead_routing_mode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT lbs.welcome_message, lbs.month_question, lbs.guest_question,
         lbs.name_question, lbs.whatsapp_question, lbs.completion_message,
         lbs.month_options, lbs.guest_options, lbs.guest_limit,
         lbs.guest_limit_message, lbs.guest_limit_redirect_name,
         lbs.redirect_completion_message, lbs.whatsapp_welcome_template,
         lbs.lead_routing_mode
  FROM public.lp_bot_settings lbs
  WHERE lbs.company_id = _company_id
  LIMIT 1;
$function$;
