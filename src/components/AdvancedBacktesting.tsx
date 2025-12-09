import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Target, AlertTriangle, Shuffle, BarChart3 } from "lucide-react";

interface BacktestResult {
  strategy: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  trades: any[];
  equityCurve: { date: string; value: number }[];
}

interface MonteCarloResult {
  percentile5: number;
  percentile25: number;
  median: number;
  percentile75: number;
  percentile95: number;
  mean: number;
  worstCase: number;
  bestCase: number;
  probabilityOfProfit: number;
  probabilityOf10Percent: number;
  probabilityOfLoss10Percent: number;
  simulations: number[];
}

const STRATEGIES = [
  { value: 'MOMENTUM_RSI', label: 'Momentum + RSI', desc: 'Oversold bounces with MACD confirmation' },
  { value: 'MEAN_REVERSION', label: 'Mean Reversion', desc: 'Bollinger Band extremes, price stretch' },
  { value: 'TREND_FOLLOWING', label: 'Trend Following', desc: 'SMA crossovers, higher highs/lows' },
  { value: 'VOLATILITY_BREAKOUT', label: 'Volatility Breakout', desc: 'ATR breakouts with volume surge' },
  { value: 'HYBRID_AI', label: 'Hybrid AI', desc: 'Combined signals from all strategies' }
];

export const AdvancedBacktesting = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'compare_strategies' | 'compare_symbols'>('single');
  const [symbol, setSymbol] = useState('SPY');
  const [symbols, setSymbols] = useState('AAPL,MSFT,NVDA');
  const [strategies, setStrategies] = useState<string[]>(['HYBRID_AI']);
  const [days, setDays] = useState(365);
  const [stopLoss, setStopLoss] = useState(3);
  const [takeProfit, setTakeProfit] = useState(12);
  const [trailingStop, setTrailingStop] = useState(8);
  const [positionSize, setPositionSize] = useState(25);
  const [runMonteCarlo, setRunMonteCarlo] = useState(true);
  
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [monteCarloResults, setMonteCarloResults] = useState<Record<string, MonteCarloResult>>({});
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase.functions.invoke('advanced-backtest', {
        body: {
          mode,
          symbol: symbol.toUpperCase(),
          symbols: mode === 'compare_symbols' ? symbols.split(',').map(s => s.trim().toUpperCase()) : undefined,
          strategies: mode === 'compare_strategies' ? strategies : [strategies[0]],
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          initialCapital: 100000,
          stopLossPercent: stopLoss,
          takeProfitPercent: takeProfit,
          trailingStopPercent: trailingStop,
          positionSizePercent: positionSize,
          runMonteCarlo,
          monteCarloSimulations: 1000
        }
      });
      
      if (error) throw error;
      
      setResults(data.results || []);
      setMonteCarloResults(data.monteCarlo || {});
      if (data.results?.length > 0) {
        setSelectedResult(data.results[0]);
      }
      
      toast({
        title: "BACKTEST COMPLETE",
        description: `${data.results?.length || 0} strategies tested. Best: ${data.bestStrategy || 'N/A'}`
      });
    } catch (err) {
      console.error('Backtest error:', err);
      toast({ 
        title: "BACKTEST FAILED", 
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStrategy = (strat: string) => {
    setStrategies(prev => 
      prev.includes(strat) 
        ? prev.filter(s => s !== strat) 
        : [...prev, strat]
    );
  };

  const getMonteCarloKey = (result: BacktestResult) => `${result.symbol}_${result.strategy}`;

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="border-2 border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-wider">ADVANCED BACKTESTING</span>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="w-full grid grid-cols-3 bg-card border-2 border-border p-0 h-auto mb-6">
            <TabsTrigger value="single" className="py-2 text-xxs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              SINGLE TEST
            </TabsTrigger>
            <TabsTrigger value="compare_strategies" className="py-2 text-xxs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              COMPARE STRATEGIES
            </TabsTrigger>
            <TabsTrigger value="compare_symbols" className="py-2 text-xxs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              COMPARE SYMBOLS
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-label">SYMBOL{mode === 'compare_symbols' ? 'S' : ''}</Label>
              {mode === 'compare_symbols' ? (
                <Input 
                  placeholder="AAPL,MSFT,NVDA" 
                  value={symbols} 
                  onChange={e => setSymbols(e.target.value.toUpperCase())} 
                  className="border-2 font-bold" 
                />
              ) : (
                <Input 
                  placeholder="SPY" 
                  value={symbol} 
                  onChange={e => setSymbol(e.target.value.toUpperCase())} 
                  className="border-2 font-bold" 
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-label">PERIOD (DAYS)</Label>
              <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">180 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                  <SelectItem value="730">2 Years</SelectItem>
                  <SelectItem value="1825">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-label">POSITION SIZE %</Label>
              <Input 
                type="number" 
                value={positionSize} 
                onChange={e => setPositionSize(Number(e.target.value))} 
                className="border-2 font-bold" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label">MONTE CARLO</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={runMonteCarlo} onCheckedChange={setRunMonteCarlo} />
                <span className="text-xxs text-muted-foreground">{runMonteCarlo ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-label">STOP LOSS %</Label>
              <Input 
                type="number" 
                value={stopLoss} 
                onChange={e => setStopLoss(Number(e.target.value))} 
                className="border-2" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label">TAKE PROFIT %</Label>
              <Input 
                type="number" 
                value={takeProfit} 
                onChange={e => setTakeProfit(Number(e.target.value))} 
                className="border-2" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label">TRAILING TRIGGER %</Label>
              <Input 
                type="number" 
                value={trailingStop} 
                onChange={e => setTrailingStop(Number(e.target.value))} 
                className="border-2" 
              />
            </div>
          </div>

          {mode !== 'compare_symbols' && (
            <div className="mb-4">
              <Label className="text-label mb-2 block">STRATEGIES</Label>
              <div className="flex flex-wrap gap-2">
                {STRATEGIES.map(strat => (
                  <button
                    key={strat.value}
                    onClick={() => toggleStrategy(strat.value)}
                    className={`px-3 py-2 border-2 text-xxs font-bold transition-colors ${
                      strategies.includes(strat.value)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {strat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={runBacktest} 
            disabled={isLoading || strategies.length === 0}
            className="w-full h-12 font-bold text-sm"
          >
            {isLoading ? 'RUNNING BACKTEST...' : 'RUN BACKTEST'}
          </Button>
        </Tabs>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Strategy Comparison Table */}
          <div className="border-2 border-border">
            <div className="p-4 border-b-2 border-border">
              <p className="text-label">STRATEGY COMPARISON</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-label">
                    <th className="p-3 text-left">STRATEGY</th>
                    <th className="p-3 text-left">SYMBOL</th>
                    <th className="p-3 text-right">RETURN</th>
                    <th className="p-3 text-right">WIN RATE</th>
                    <th className="p-3 text-right">TRADES</th>
                    <th className="p-3 text-right">MAX DD</th>
                    <th className="p-3 text-right">SHARPE</th>
                    <th className="p-3 text-right">PROFIT FACTOR</th>
                    <th className="p-3 text-right">AVG WIN</th>
                    <th className="p-3 text-right">AVG LOSS</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr 
                      key={idx} 
                      className={`border-b border-border cursor-pointer hover:bg-secondary/50 ${selectedResult === result ? 'bg-secondary' : ''}`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <td className="p-3 font-bold">{result.strategy}</td>
                      <td className="p-3">{result.symbol}</td>
                      <td className={`p-3 text-right font-bold ${result.totalReturn >= 0 ? 'text-success' : 'text-danger'}`}>
                        {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                      </td>
                      <td className={`p-3 text-right ${result.winRate >= 50 ? 'text-success' : 'text-danger'}`}>
                        {result.winRate.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right">{result.totalTrades}</td>
                      <td className="p-3 text-right text-danger">-{result.maxDrawdown.toFixed(1)}%</td>
                      <td className={`p-3 text-right ${result.sharpeRatio >= 1 ? 'text-success' : result.sharpeRatio >= 0 ? 'text-foreground' : 'text-danger'}`}>
                        {result.sharpeRatio.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${result.profitFactor >= 1.5 ? 'text-success' : 'text-foreground'}`}>
                        {result.profitFactor.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-success">${result.avgWin.toFixed(0)}</td>
                      <td className="p-3 text-right text-danger">${result.avgLoss.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Result View */}
          {selectedResult && (
            <div className="grid grid-cols-2 gap-4">
              {/* Equity Curve */}
              <div className="border-2 border-border p-4">
                <p className="text-label mb-4">EQUITY CURVE - {selectedResult.strategy}</p>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={selectedResult.equityCurve}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '2px solid hsl(var(--border))', borderRadius: 0 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, 'Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#equityGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Monte Carlo Distribution */}
              {runMonteCarlo && monteCarloResults[getMonteCarloKey(selectedResult)] && (
                <div className="border-2 border-border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shuffle className="h-4 w-4 text-primary" />
                    <p className="text-label">MONTE CARLO SIMULATION (1000 runs)</p>
                  </div>
                  
                  {(() => {
                    const mc = monteCarloResults[getMonteCarloKey(selectedResult)];
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div>
                            <p className="text-xxs text-muted-foreground">5th %ile</p>
                            <p className={`font-bold ${mc.percentile5 >= 0 ? 'text-success' : 'text-danger'}`}>
                              {mc.percentile5.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xxs text-muted-foreground">25th %ile</p>
                            <p className={`font-bold ${mc.percentile25 >= 0 ? 'text-success' : 'text-danger'}`}>
                              {mc.percentile25.toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-secondary p-1">
                            <p className="text-xxs text-muted-foreground">MEDIAN</p>
                            <p className={`font-bold ${mc.median >= 0 ? 'text-success' : 'text-danger'}`}>
                              {mc.median.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xxs text-muted-foreground">75th %ile</p>
                            <p className={`font-bold ${mc.percentile75 >= 0 ? 'text-success' : 'text-danger'}`}>
                              {mc.percentile75.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xxs text-muted-foreground">95th %ile</p>
                            <p className={`font-bold ${mc.percentile95 >= 0 ? 'text-success' : 'text-danger'}`}>
                              {mc.percentile95.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                          <div className="text-center">
                            <p className="text-xxs text-muted-foreground">P(PROFIT)</p>
                            <p className={`text-lg font-bold ${mc.probabilityOfProfit >= 50 ? 'text-success' : 'text-danger'}`}>
                              {mc.probabilityOfProfit.toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xxs text-muted-foreground">P(+10%)</p>
                            <p className="text-lg font-bold text-success">
                              {mc.probabilityOf10Percent.toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xxs text-muted-foreground">P(-10%)</p>
                            <p className="text-lg font-bold text-danger">
                              {mc.probabilityOfLoss10Percent.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center pt-2 border-t border-border">
                          <div>
                            <p className="text-xxs text-muted-foreground">WORST CASE</p>
                            <p className="font-bold text-danger">{mc.worstCase.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xxs text-muted-foreground">BEST CASE</p>
                            <p className="font-bold text-success">{mc.bestCase.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Trade Log */}
          {selectedResult && selectedResult.trades.length > 0 && (
            <div className="border-2 border-border">
              <div className="p-4 border-b-2 border-border">
                <p className="text-label">TRADE LOG ({selectedResult.trades.length} trades)</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-label">
                      <th className="p-2 text-left">DATE</th>
                      <th className="p-2 text-left">ACTION</th>
                      <th className="p-2 text-right">PRICE</th>
                      <th className="p-2 text-right">SHARES</th>
                      <th className="p-2 text-right">P/L</th>
                      <th className="p-2 text-left">REASON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.trades.map((trade, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/30">
                        <td className="p-2 text-xxs text-muted-foreground">{trade.date}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 text-xxs font-bold ${trade.action === 'BUY' ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground'}`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="p-2 text-right mono-display">${trade.price?.toFixed(2)}</td>
                        <td className="p-2 text-right">{trade.shares}</td>
                        <td className={`p-2 text-right font-bold ${(trade.profitLoss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {trade.profitLoss !== undefined ? `${trade.profitLoss >= 0 ? '+' : ''}$${trade.profitLoss.toFixed(0)}` : '-'}
                        </td>
                        <td className="p-2 text-xxs text-muted-foreground max-w-xs truncate">{trade.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
