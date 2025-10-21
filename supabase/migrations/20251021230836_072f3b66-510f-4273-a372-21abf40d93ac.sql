-- Enable realtime for auto_trade_logs table
ALTER TABLE auto_trade_logs REPLICA IDENTITY FULL;

-- Add auto_trade_logs to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE auto_trade_logs;