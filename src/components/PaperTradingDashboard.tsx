import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const STARTING_CAPITAL = 100000;

interface PaperPosition {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  entryTime: Date;
  strategy: string;
  stopLoss: number;
  takeProfit: number;
}

interface TradeHistory {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  pnl?: number;
  strategy: string;
}

interface ICTSignal {
  symbol: string;
  type: 'order_block' | 'fvg' | 'liquidity_sweep' | 'market_structure';
  direction: 'bullish' | 'bearish';
  level: number;
  confidence: number;
  killZone: string;
}

export const PaperTradingDashboard = () => {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('paperBalance');
    return saved ? parseFloat(saved) : STARTING_CAPITAL;
  });
  const [positions, setPositions] = useState<PaperPosition[]>(() => {
    const saved = localStorage.getItem('paperPositions');
    return saved ? JSON.parse(saved) : [];
  });
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>(() => {
    const saved = localStorage.getItem('paperTradeHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [ictSignals, setIctSignals] = useState<ICTSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    localStorage.setItem('paperBalance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('paperPositions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('paperTradeHistory', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  const totalPositionValue = positions.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0);
  const totalCostBasis = positions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
  const unrealizedPnL = totalPositionValue - totalCostBasis;
  const portfolioValue = balance + totalPositionValue;
  const totalPnL = portfolioValue - STARTING_CAPITAL;
  const pnlPercent = ((totalPnL / STARTING_CAPITAL) * 100).toFixed(2);

  useEffect(() => {
    const generateICTSignals = () => {
      const currentHour = new Date().getHours();
      let killZone = 'OFF';
      if (currentHour >= 2 && currentHour < 5) killZone = 'LONDON';
      else if (currentHour >= 8 && currentHour < 11) killZone = 'NY OPEN';
      else if (currentHour >= 13 && currentHour < 16) killZone = 'NY PM';

      setIctSignals([
        { symbol: 'SPY', type: 'order_block', direction: 'bullish', level: 598.50, confidence: 0.85, killZone },
        { symbol: 'QQQ', type: 'fvg', direction: 'bullish', level: 520.25, confidence: 0.78, killZone },
        { symbol: 'NVDA', type: 'liquidity_sweep', direction: 'bearish', level: 145.00, confidence: 0.72, killZone },
        { symbol: 'AAPL', type: 'market_structure', direction: 'bullish', level: 235.50, confidence: 0.82, killZone },
      ]);
    };
    generateICTSignals();
    const interval = setInterval(generateICTSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  const updatePrices = async () => {
    if (positions.length === 0) return;
    setIsLoading(true);
    try {
      const updatedPositions = positions.map(pos => ({
        ...pos,
        currentPrice: pos.currentPrice * (1 + (Math.random() - 0.5) * 0.02)
      }));
      setPositions(updatedPositions);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(updatePrices, 30000);
    return () => clearInterval(interval);
  }, [positions]);

  const executePaperTrade = async (action: 'buy' | 'sell', tradeSymbol: string, qty: number, strategy: string = 'MANUAL') => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${tradeSymbol.toUpperCase()}?interval=1d&range=1d`);
      const data = await response.json();
      const price = data.chart.result?.[0]?.meta?.regularMarketPrice || 100;

      if (action === 'buy') {
        const totalCost = price * qty;
        if (totalCost > balance) {
          toast({ title: "INSUFFICIENT BALANCE", variant: "destructive" });
          return;
        }

        const newPosition: PaperPosition = {
          id: Date.now().toString(),
          symbol: tradeSymbol.toUpperCase(),
          quantity: qty,
          entryPrice: price,
          currentPrice: price,
          entryTime: new Date(),
          strategy,
          stopLoss: price * 0.97,
          takeProfit: price * 1.08
        };

        setPositions(prev => [...prev, newPosition]);
        setBalance(prev => prev - totalCost);
        setTradeHistory(prev => [{
          id: Date.now().toString(),
          symbol: tradeSymbol.toUpperCase(),
          action: 'buy',
          quantity: qty,
          price,
          timestamp: new Date(),
          strategy
        }, ...prev]);

        toast({ title: `BOUGHT ${qty} ${tradeSymbol.toUpperCase()} @ $${price.toFixed(2)}` });
      } else {
        const position = positions.find(p => p.symbol === tradeSymbol.toUpperCase());
        if (!position) {
          toast({ title: "NO POSITION FOUND", variant: "destructive" });
          return;
        }

        const sellQty = Math.min(qty, position.quantity);
        const proceeds = position.currentPrice * sellQty;
        const pnl = (position.currentPrice - position.entryPrice) * sellQty;

        if (sellQty >= position.quantity) {
          setPositions(prev => prev.filter(p => p.id !== position.id));
        } else {
          setPositions(prev => prev.map(p => p.id === position.id ? { ...p, quantity: p.quantity - sellQty } : p));
        }

        setBalance(prev => prev + proceeds);
        setTradeHistory(prev => [{
          id: Date.now().toString(),
          symbol: tradeSymbol.toUpperCase(),
          action: 'sell',
          quantity: sellQty,
          price: position.currentPrice,
          timestamp: new Date(),
          pnl,
          strategy: position.strategy
        }, ...prev]);

        toast({
          title: `SOLD ${sellQty} ${tradeSymbol.toUpperCase()} | ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
          variant: pnl >= 0 ? "default" : "destructive"
        });
      }
    } catch {
      toast({ title: "TRADE FAILED", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAccount = () => {
    setBalance(STARTING_CAPITAL);
    setPositions([]);
    setTradeHistory([]);
    toast({ title: "ACCOUNT RESET" });
  };

  const executeICTTrade = (signal: ICTSignal) => {
    const qty = Math.floor((balance * 0.1) / signal.level);
    if (qty > 0 && signal.direction === 'bullish') {
      executePaperTrade('buy', signal.symbol, qty, `ICT_${signal.type.toUpperCase()}`);
    }
  };

  const chartData = tradeHistory.slice(0, 20).reverse().map((trade, index) => ({
    time: index + 1,
    value: STARTING_CAPITAL + tradeHistory.slice(0, tradeHistory.length - index).reduce((sum, t) => sum + (t.pnl || 0), 0)
  }));
  if (chartData.length === 0) chartData.push({ time: 0, value: STARTING_CAPITAL });

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="data-grid grid-cols-5">
        <div>
          <p className="text-label">PORTFOLIO</p>
          <p className="text-value text-primary">${portfolioValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-label">CASH</p>
          <p className="text-value">${balance.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-label">POSITIONS</p>
          <p className="text-value">${totalPositionValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-label">UNREALIZED</p>
          <p className={`text-value ${unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-label">TOTAL P/L</p>
          <p className={`text-value ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({pnlPercent}%)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5 bg-card border-2 border-border p-0 h-auto">
          {['POSITIONS', 'ICT', 'TRADE', 'BACKTEST', 'HISTORY'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="py-2 text-xxs font-bold tracking-wider border-r-2 border-border last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Positions */}
        <TabsContent value="positions" className="space-y-4">
          <div className="border-2 border-border">
            <div className="flex items-center justify-between p-4 border-b-2 border-border">
              <p className="text-label">OPEN POSITIONS</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={updatePrices} disabled={isLoading} className="text-xxs h-7 border-2">
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  REFRESH
                </Button>
                <Button variant="destructive" size="sm" onClick={resetAccount} className="text-xxs h-7">
                  RESET
                </Button>
              </div>
            </div>
            {positions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">NO OPEN POSITIONS</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border hover:bg-transparent">
                    <TableHead className="text-label">SYMBOL</TableHead>
                    <TableHead className="text-label">STRATEGY</TableHead>
                    <TableHead className="text-label text-right">QTY</TableHead>
                    <TableHead className="text-label text-right">ENTRY</TableHead>
                    <TableHead className="text-label text-right">CURRENT</TableHead>
                    <TableHead className="text-label text-right">P/L</TableHead>
                    <TableHead className="text-label text-right">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(pos => {
                    const pnl = (pos.currentPrice - pos.entryPrice) * pos.quantity;
                    const pnlPct = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice * 100);
                    return (
                      <TableRow key={pos.id} className="border-b border-border hover:bg-secondary/50">
                        <TableCell className="font-bold">{pos.symbol}</TableCell>
                        <TableCell className="text-xxs text-muted-foreground">{pos.strategy}</TableCell>
                        <TableCell className="text-right mono-display">{pos.quantity}</TableCell>
                        <TableCell className="text-right mono-display">${pos.entryPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right mono-display">${pos.currentPrice.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-bold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct.toFixed(1)}%)
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" className="h-6 text-xxs" onClick={() => executePaperTrade('sell', pos.symbol, pos.quantity)}>
                            CLOSE
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {chartData.length > 1 && (
            <div className="border-2 border-border p-4">
              <p className="text-label mb-4">EQUITY CURVE</p>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} domain={['dataMin - 500', 'dataMax + 500']} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '2px solid hsl(var(--border))', borderRadius: 0, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>

        {/* ICT Signals */}
        <TabsContent value="ict" className="space-y-4">
          <div className="border-2 border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-label">ICT SIGNALS</p>
              <span className={`px-3 py-1 text-xxs font-bold border-2 ${ictSignals[0]?.killZone !== 'OFF' ? 'border-success text-success' : 'border-border text-muted-foreground'}`}>
                {ictSignals[0]?.killZone || 'OFF'}
              </span>
            </div>
            <div className="space-y-2">
              {ictSignals.map((signal, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border-2 border-border bg-secondary/30">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">{signal.symbol}</span>
                    <span className="text-xxs text-muted-foreground uppercase">{signal.type.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.5 text-xxs font-bold ${signal.direction === 'bullish' ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground'}`}>
                      {signal.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="mono-display text-sm">${signal.level.toFixed(2)}</span>
                    <span className="text-xxs text-muted-foreground">{(signal.confidence * 100).toFixed(0)}%</span>
                    {signal.direction === 'bullish' && (
                      <Button size="sm" onClick={() => executeICTTrade(signal)} disabled={isLoading} className="h-6 text-xxs">
                        TRADE
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Manual Trade */}
        <TabsContent value="trade">
          <div className="border-2 border-border p-6">
            <p className="text-label mb-4">MANUAL TRADE</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-label">SYMBOL</Label>
                <Input placeholder="AAPL" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-label">QUANTITY</Label>
                <Input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-label">&nbsp;</Label>
                <div className="flex gap-2">
                  <Button className="flex-1 h-10 font-bold" onClick={() => executePaperTrade('buy', symbol, quantity)} disabled={!symbol || isLoading}>
                    BUY
                  </Button>
                  <Button variant="destructive" className="flex-1 h-10 font-bold" onClick={() => executePaperTrade('sell', symbol, quantity)} disabled={!symbol || isLoading}>
                    SELL
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Backtest */}
        <TabsContent value="backtest">
          <div className="border-2 border-border p-6">
            <p className="text-label mb-4">HISTORICAL BACKTEST</p>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label className="text-label">SYMBOL</Label>
                <Input id="backtest-symbol" defaultValue="SPY" className="border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-label">DAYS</Label>
                <Input type="number" id="backtest-days" defaultValue="30" className="border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-label">BUY %</Label>
                <Input type="number" id="backtest-buy" defaultValue="2" step="0.5" className="border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-label">SELL %</Label>
                <Input type="number" id="backtest-sell" defaultValue="3" step="0.5" className="border-2 font-bold" />
              </div>
            </div>
            <Button 
              className="w-full h-10 font-bold"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                try {
                  const symbolInput = (document.getElementById('backtest-symbol') as HTMLInputElement)?.value || 'SPY';
                  const daysInput = parseInt((document.getElementById('backtest-days') as HTMLInputElement)?.value || '30');
                  const buyThreshold = (document.getElementById('backtest-buy') as HTMLInputElement)?.value || '2';
                  const sellThreshold = (document.getElementById('backtest-sell') as HTMLInputElement)?.value || '3';
                  const endDate = new Date();
                  const startDate = new Date();
                  startDate.setDate(startDate.getDate() - daysInput);
                  const { data, error } = await supabase.functions.invoke('run-backtest', {
                    body: { symbol: symbolInput, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], buyThreshold, sellThreshold, initialCapital: STARTING_CAPITAL }
                  });
                  if (error) throw error;
                  const result = data.result;
                  toast({ title: `BACKTEST: ${symbolInput} | ${result.return_percentage?.toFixed(2) || 0}% | WIN: ${result.win_rate?.toFixed(1) || 0}%` });
                } catch (err) {
                  toast({ title: "BACKTEST ERROR", variant: "destructive" });
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {isLoading ? 'RUNNING...' : 'RUN BACKTEST'}
            </Button>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="border-2 border-border">
            <div className="p-4 border-b-2 border-border">
              <p className="text-label">{tradeHistory.length} TRADES</p>
            </div>
            {tradeHistory.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">NO TRADES YET</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border hover:bg-transparent">
                    <TableHead className="text-label">TIME</TableHead>
                    <TableHead className="text-label">SYMBOL</TableHead>
                    <TableHead className="text-label">ACTION</TableHead>
                    <TableHead className="text-label text-right">QTY</TableHead>
                    <TableHead className="text-label text-right">PRICE</TableHead>
                    <TableHead className="text-label text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeHistory.slice(0, 30).map(trade => (
                    <TableRow key={trade.id} className="border-b border-border hover:bg-secondary/50">
                      <TableCell className="text-xxs text-muted-foreground">{new Date(trade.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-bold">{trade.symbol}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xxs font-bold ${trade.action === 'buy' ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground'}`}>
                          {trade.action.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right mono-display">{trade.quantity}</TableCell>
                      <TableCell className="text-right mono-display">${trade.price.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${trade.pnl && trade.pnl >= 0 ? 'text-success' : trade.pnl ? 'text-danger' : ''}`}>
                        {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
