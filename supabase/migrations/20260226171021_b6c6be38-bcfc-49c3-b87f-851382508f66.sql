ALTER TABLE company_onboarding ADD COLUMN has_automation_system boolean DEFAULT false;
ALTER TABLE company_onboarding ADD COLUMN automation_system_name text;
ALTER TABLE company_onboarding ADD COLUMN budget_format text;
ALTER TABLE company_onboarding ADD COLUMN budget_file_urls text[] DEFAULT '{}';
ALTER TABLE company_onboarding ADD COLUMN service_screenshots text[] DEFAULT '{}';