UPDATE companies
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{enabled_modules,inteligencia}',
  'true'::jsonb
)
WHERE id = 'a0000000-0000-0000-0000-000000000001';