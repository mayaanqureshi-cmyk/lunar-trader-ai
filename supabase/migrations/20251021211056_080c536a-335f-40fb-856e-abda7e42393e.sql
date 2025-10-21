-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-trade scanner to run every 5 minutes
SELECT cron.schedule(
  'auto-trade-scanner-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://ysixqjvungxjrnpqbdzd.supabase.co/functions/v1/auto-trade-scanner',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXhxanZ1bmd4anJucHFiZHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjYxNTQsImV4cCI6MjA3NjI0MjE1NH0.WvynMSoCY8vzXjOfOsIsvAjOrU6oIjJkWl2C4hFOBow"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);