import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TradeLog {
  id: string;
  created_at: string;
  scanned: number;
  recommendations: number;
  trades_executed: number;
  trades_data: any;
  error: string | null;
}

interface TradeData {
  symbol: string;
  action: string;
  qty: number;
  price: number;
  confidence: number;
  aiConsensus: string;
}

export const PerformanceAnalytics = () => {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_trade_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const allTrades: TradeData[] = logs.flatMap(log => 
    Array.isArray(log.trades_data) ? log.trades_data : []
  );

  const totalScans = logs.length;
  const totalRecommendations = logs.reduce((sum, log) => sum + (log.recommendations || 0), 0);
  const totalExecuted = logs.reduce((sum, log) => sum + (log.trades_executed || 0), 0);
  const executionRate = totalRecommendations > 0 ? (totalExecuted / totalRecommendations * 100).toFixed(1) : '0';

  // Trades by symbol
  const tradesBySymbol: Record<string, number> = {};
  allTrades.forEach(trade => {
    tradesBySymbol[trade.symbol] = (tradesBySymbol[trade.symbol] || 0) + 1;
  });
  const topSymbols = Object.entries(tradesBySymbol)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Scan history
  const scanHistory = logs.slice(0, 15).reverse().map((log, idx) => ({
    scan: idx + 1,
    rec: log.recommendations || 0,
    exec: log.trades_executed || 0,
  }));

  if (isLoading) {
    return (
      <div className="border-2 border-border p-8">
        <p className="text-label animate-pulse">LOADING DATA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="data-grid grid-cols-4">
        <div>
          <p className="text-label">TOTAL SCANS</p>
          <p className="text-value">{totalScans}</p>
        </div>
        <div>
          <p className="text-label">RECOMMENDATIONS</p>
          <p className="text-value">{totalRecommendations}</p>
        </div>
        <div>
          <p className="text-label">EXECUTED</p>
          <p className="text-value text-success">{totalExecuted}</p>
        </div>
        <div>
          <p className="text-label">EXEC RATE</p>
          <p className="text-value text-primary">{executionRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="border-2 border-border p-4">
          <p className="text-label mb-4">SCAN ACTIVITY</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scanHistory}>
              <XAxis dataKey="scan" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'hsl(var(--card))', 
                  border: '2px solid hsl(var(--border))',
                  borderRadius: 0,
                  fontSize: 12
                }} 
              />
              <Bar dataKey="rec" fill="hsl(var(--chart-4))" name="Recommendations" />
              <Bar dataKey="exec" fill="hsl(var(--success))" name="Executed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Symbols */}
        <div className="border-2 border-border p-4">
          <p className="text-label mb-4">TOP SYMBOLS</p>
          {topSymbols.length > 0 ? (
            <div className="space-y-2">
              {topSymbols.map(([symbol, count]) => (
                <div key={symbol} className="flex items-center justify-between">
                  <span className="text-sm font-bold">{symbol}</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 bg-primary" 
                      style={{ width: `${(count / topSymbols[0][1]) * 100}px` }}
                    />
                    <span className="text-xs text-muted-foreground w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">NO DATA</p>
          )}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="border-2 border-border">
        <div className="border-b-2 border-border p-4">
          <p className="text-label">RECENT TRADES</p>
        </div>
        {allTrades.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-border hover:bg-transparent">
                <TableHead className="text-label">SYMBOL</TableHead>
                <TableHead className="text-label">ACTION</TableHead>
                <TableHead className="text-label text-right">QTY</TableHead>
                <TableHead className="text-label text-right">PRICE</TableHead>
                <TableHead className="text-label text-right">CONF</TableHead>
                <TableHead className="text-label">SIGNAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTrades.slice(0, 15).map((trade, idx) => (
                <TableRow key={idx} className="border-b border-border hover:bg-secondary/50">
                  <TableCell className="font-bold">{trade.symbol}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 text-xxs font-bold ${
                      trade.action === 'buy' 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-danger text-danger-foreground'
                    }`}>
                      {trade.action?.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right mono-display">{trade.qty}</TableCell>
                  <TableCell className="text-right mono-display">${trade.price?.toFixed(2)}</TableCell>
                  <TableCell className="text-right mono-display">{(trade.confidence * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <span className="text-xxs text-muted-foreground">{trade.aiConsensus}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">NO TRADES EXECUTED YET</p>
          </div>
        )}
      </div>
    </div>
  );
};
