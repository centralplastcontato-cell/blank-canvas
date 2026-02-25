SELECT cron.schedule(
  'rotate-months-monthly',
  '0 3 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/rotate-months',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZXpnbmtmaG9kbHRyc2V3bGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Nzc2NjcsImV4cCI6MjA4NjE1MzY2N30.FIgluyyGXUIbwfYMxUeyQHHnH-_EgmqpVGXZByjVkMw"}'::jsonb,
        body:='{"time": "scheduled"}'::jsonb
    ) as request_id;
  $$
);
