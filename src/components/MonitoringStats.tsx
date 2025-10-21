import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Activity, Zap, DollarSign, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

    // Subscribe to real-time updates
    const channel = supabase
      .channel('stats_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_trade_logs'
        },
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
      
      // Get logs from last 24 hours
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

  const statCards = [
    {
      title: "Trades Today",
      value: stats.totalTrades,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Success Rate",
      value: `${winRate}%`,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Signals Generated",
      value: stats.totalSignals,
      icon: Activity,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Scanner Runs",
      value: stats.totalScans,
      icon: Zap,
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-secondary rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card 
          key={stat.title} 
          className="hover:shadow-elevated transition-all duration-300 hover:scale-105 animate-in fade-in-from-bottom-4"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {stats.recentErrors > 0 && (
        <Card className="md:col-span-2 lg:col-span-4 bg-destructive/5 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              <span className="font-medium">
                {stats.recentErrors} error{stats.recentErrors > 1 ? 's' : ''} in the last 24 hours
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
