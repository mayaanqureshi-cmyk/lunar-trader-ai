-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-trade scanner to run every 5 minutes during market hours
SELECT cron.schedule(
  'auto-trade-scanner-5min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ysixqjvungxjrnpqbdzd.supabase.co/functions/v1/auto-trade-scanner',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXhxanZ1bmd4anJucHFiZHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjYxNTQsImV4cCI6MjA3NjI0MjE1NH0.WvynMSoCY8vzXjOfOsIsvAjOrU6oIjJkWl2C4hFOBow"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a table to log auto-trade activity
CREATE TABLE IF NOT EXISTS public.auto_trade_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned INTEGER,
  recommendations INTEGER,
  trades_executed INTEGER,
  trades_data JSONB,
  error TEXT
);

-- Enable RLS
ALTER TABLE public.auto_trade_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to insert
CREATE POLICY "Service can insert logs" ON public.auto_trade_logs
FOR INSERT WITH CHECK (true);

-- Policy to allow all users to view logs
CREATE POLICY "Anyone can view logs" ON public.auto_trade_logs
FOR SELECT USING (true);