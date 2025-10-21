import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, AlertCircle, Activity } from "lucide-react";

export const useTradeNotifications = () => {
  const lastLogId = useRef<string | null>(null);

  useEffect(() => {
    // Initialize with the latest log to prevent showing old notifications on mount
    const initializeLastLog = async () => {
      const { data } = await supabase
        .from('auto_trade_logs')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        lastLogId.current = data.id;
      }
    };

    initializeLastLog();

    // Subscribe to new trade logs
    const channel = supabase
      .channel('trade_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auto_trade_logs'
        },
        (payload: any) => {
          const log = payload.new;
          
          // Skip if this is the initialization log
          if (!lastLogId.current) {
            lastLogId.current = log.id;
            return;
          }

          // Show notification based on log content
          if (log.error) {
            toast({
              title: "⚠️ Auto-Trading Alert",
              description: `Scanner encountered an error: ${log.error}`,
              variant: "destructive",
            });
          } else if (log.trades_executed > 0) {
            const tradesData = log.trades_data || [];
            const symbols = tradesData.map((t: any) => t.symbol).join(', ');
            
            toast({
              title: "🎯 Trades Executed!",
              description: `${log.trades_executed} trade${log.trades_executed > 1 ? 's' : ''} executed: ${symbols}`,
              className: "bg-success/10 border-success",
            });
          } else if (log.recommendations > 0) {
            toast({
              title: "📊 Trading Signals Detected",
              description: `${log.recommendations} potential opportunities found, but no trades executed`,
            });
          }

          lastLogId.current = log.id;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
