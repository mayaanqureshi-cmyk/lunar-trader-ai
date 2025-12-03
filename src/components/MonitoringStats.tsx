import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalTrades: number;
  successfulTrades: number;
  totalScans: number;
  totalSignals: number;
  recentErrors: number;
}

export const MonitoringStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    successfulTrades: 0,
    totalScans: 0,
    totalSignals: 0,
    recentErrors: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('stats_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auto_trade_logs' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_trade_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const logs = data || [];
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = logs.filter(log => new Date(log.created_at) > oneDayAgo);

      setStats({
        totalTrades: recentLogs.reduce((sum, log) => sum + (log.trades_executed || 0), 0),
        successfulTrades: recentLogs.filter(log => log.trades_executed > 0).length,
        totalScans: recentLogs.length,
        totalSignals: recentLogs.reduce((sum, log) => sum + (log.recommendations || 0), 0),
        recentErrors: recentLogs.filter(log => log.error).length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const winRate = stats.totalScans > 0 
    ? ((stats.successfulTrades / stats.totalScans) * 100).toFixed(1)
    : '0.0';

  const statItems = [
    { label: "TRADES/24H", value: stats.totalTrades },
    { label: "WIN RATE", value: `${winRate}%` },
    { label: "SIGNALS", value: stats.totalSignals },
    { label: "SCANS", value: stats.totalScans },
  ];

  if (isLoading) {
    return (
      <div className="data-grid grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="data-grid grid-cols-4">
        {statItems.map((stat) => (
          <div key={stat.label} className="animate-in-up">
            <p className="text-label">{stat.label}</p>
            <p className="text-value text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      
      {stats.recentErrors > 0 && (
        <div className="border-2 border-danger bg-danger/10 p-3">
          <p className="text-danger text-xs font-bold">
            ⚠ {stats.recentErrors} ERROR{stats.recentErrors > 1 ? 'S' : ''} IN LAST 24H
          </p>
        </div>
      )}
    </div>
  );
};
