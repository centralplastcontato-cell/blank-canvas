
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to run follow-up-check every 5 minutes
SELECT cron.schedule(
  'follow-up-check-every-5min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/follow-up-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZXpnbmtmaG9kbHRyc2V3bGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Nzc2NjcsImV4cCI6MjA4NjE1MzY2N30.FIgluyyGXUIbwfYMxUeyQHHnH-_EgmqpVGXZByjVkMw"}'::jsonb,
        body:='{"time": "scheduled"}'::jsonb
    ) as request_id;
  $$
);
