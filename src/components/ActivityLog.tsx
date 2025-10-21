import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, CheckCircle2, XCircle, TrendingUp, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AutoTradeLog {
  id: string;
  created_at: string;
  scanned: number;
  recommendations: number;
  trades_executed: number;
  trades_data: any;
  error: string | null;
}

export const ActivityLog = () => {
  const [logs, setLogs] = useState<AutoTradeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('auto_trade_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_trade_logs'
        },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_trade_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Activity Log</CardTitle>
            <CardDescription>
              Real-time monitoring of auto-trading scanner runs
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No activity yet. Auto-trading scanner runs every 5 minutes during market hours.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="p-4 bg-secondary/5 border border-border hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {log.trades_executed > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : log.error ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Activity className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        Scanned: {log.scanned}
                      </Badge>
                      {log.recommendations > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Signals: {log.recommendations}
                        </Badge>
                      )}
                      {log.trades_executed > 0 && (
                        <Badge variant="default" className="text-xs">
                          Executed: {log.trades_executed}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {log.error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive mb-3">
                      Error: {log.error}
                    </div>
                  )}

                  {log.trades_data && Array.isArray(log.trades_data) && log.trades_data.length > 0 && (
                    <div className="space-y-2">
                      {log.trades_data.map((trade: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-success" />
                            <div>
                              <p className="font-bold text-foreground">{trade.symbol}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {trade.quantity} | Order: {trade.orderId?.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                          <Badge variant="default">
                            {(trade.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {!log.error && log.trades_executed === 0 && log.recommendations === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No trading opportunities found in this scan.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
