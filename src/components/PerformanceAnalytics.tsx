import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Target, Award, AlertTriangle,
  BarChart3, PieChart, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from "recharts";

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
  reasoning: string;
  timestamp: string;
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

  // Extract all trades from logs
  const allTrades: TradeData[] = logs.flatMap(log => 
    Array.isArray(log.trades_data) ? log.trades_data : []
  );

  // Calculate metrics
  const totalScans = logs.length;
  const totalRecommendations = logs.reduce((sum, log) => sum + (log.recommendations || 0), 0);
  const totalExecuted = logs.reduce((sum, log) => sum + (log.trades_executed || 0), 0);
  const executionRate = totalRecommendations > 0 ? (totalExecuted / totalRecommendations * 100).toFixed(1) : '0';

  // Signal effectiveness by AI consensus type
  const signalsByConsensus: Record<string, { count: number; symbols: string[] }> = {};
  allTrades.forEach(trade => {
    const consensus = trade.aiConsensus || 'UNKNOWN';
    if (!signalsByConsensus[consensus]) {
      signalsByConsensus[consensus] = { count: 0, symbols: [] };
    }
    signalsByConsensus[consensus].count++;
    if (!signalsByConsensus[consensus].symbols.includes(trade.symbol)) {
      signalsByConsensus[consensus].symbols.push(trade.symbol);
    }
  });

  // Trades by symbol
  const tradesBySymbol: Record<string, number> = {};
  allTrades.forEach(trade => {
    tradesBySymbol[trade.symbol] = (tradesBySymbol[trade.symbol] || 0) + 1;
  });
  const topSymbols = Object.entries(tradesBySymbol)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Confidence distribution
  const confidenceBuckets = [
    { range: '62-70%', count: 0 },
    { range: '70-80%', count: 0 },
    { range: '80-90%', count: 0 },
    { range: '90-100%', count: 0 },
  ];
  allTrades.forEach(trade => {
    const conf = trade.confidence * 100;
    if (conf >= 90) confidenceBuckets[3].count++;
    else if (conf >= 80) confidenceBuckets[2].count++;
    else if (conf >= 70) confidenceBuckets[1].count++;
    else confidenceBuckets[0].count++;
  });

  // Scan history for chart
  const scanHistory = logs.slice(0, 20).reverse().map((log, idx) => ({
    scan: idx + 1,
    recommendations: log.recommendations || 0,
    executed: log.trades_executed || 0,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const pieData = topSymbols.map(([symbol, count]) => ({ name: symbol, value: count }));

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Loading Analytics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Scans</p>
              <p className="text-2xl font-bold">{totalScans}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Recommendations</p>
              <p className="text-2xl font-bold">{totalRecommendations}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Trades Executed</p>
              <p className="text-2xl font-bold">{totalExecuted}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Execution Rate</p>
              <p className="text-2xl font-bold">{executionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">Signal Effectiveness</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Scan History Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Scan Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scanHistory}>
                    <XAxis dataKey="scan" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="recommendations" fill="#3b82f6" name="Recommendations" />
                    <Bar dataKey="executed" fill="#10b981" name="Executed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Symbols Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Most Traded Symbols
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name }) => name}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No trade data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Confidence Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Confidence Distribution</CardTitle>
              <CardDescription>How confident the AI was in executed trades</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={confidenceBuckets} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Signal Effectiveness by AI Consensus</CardTitle>
              <CardDescription>Which AI signal types are being executed most</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AI Consensus</TableHead>
                    <TableHead className="text-right">Trades</TableHead>
                    <TableHead>Symbols</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(signalsByConsensus).map(([consensus, data]) => (
                    <TableRow key={consensus}>
                      <TableCell>
                        <Badge variant={consensus.includes('CONSENSUS') ? 'default' : 'secondary'}>
                          {consensus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{data.count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {data.symbols.slice(0, 5).join(', ')}
                        {data.symbols.length > 5 && ` +${data.symbols.length - 5} more`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Performing Symbols */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most Active Symbols</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topSymbols.map(([symbol, count]) => (
                  <Badge key={symbol} variant="outline" className="text-sm">
                    {symbol}: {count} trades
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Trades</CardTitle>
              <CardDescription>Last 20 executed trades</CardDescription>
            </CardHeader>
            <CardContent>
              {allTrades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead>AI Consensus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTrades.slice(0, 20).map((trade, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.action === 'buy' ? 'default' : 'destructive'}>
                            {trade.action?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{trade.qty}</TableCell>
                        <TableCell className="text-right">${trade.price?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{(trade.confidence * 100).toFixed(0)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {trade.aiConsensus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trades executed yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
