import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, Target, 
  Activity, RefreshCw, ArrowUpRight, ArrowDownRight,
  Clock, Zap, BarChart3, AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const STARTING_CAPITAL = 10000;

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
  description: string;
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

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('paperBalance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('paperPositions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('paperTradeHistory', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  // Calculate metrics
  const totalPositionValue = positions.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0);
  const totalCostBasis = positions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
  const unrealizedPnL = totalPositionValue - totalCostBasis;
  const portfolioValue = balance + totalPositionValue;
  const totalPnL = portfolioValue - STARTING_CAPITAL;
  const pnlPercent = ((totalPnL / STARTING_CAPITAL) * 100).toFixed(2);

  // Generate mock ICT signals
  useEffect(() => {
    const generateICTSignals = () => {
      const currentHour = new Date().getHours();
      let killZone = 'Off-Hours';
      
      // ICT Kill Zones (ET)
      if (currentHour >= 2 && currentHour < 5) killZone = 'London Open';
      else if (currentHour >= 8 && currentHour < 11) killZone = 'NY Open';
      else if (currentHour >= 13 && currentHour < 16) killZone = 'NY PM Session';
      
      const signals: ICTSignal[] = [
        {
          symbol: 'SPY',
          type: 'order_block',
          direction: 'bullish',
          level: 598.50,
          confidence: 0.85,
          description: 'Bullish Order Block at previous session low with institutional buying',
          killZone
        },
        {
          symbol: 'QQQ',
          type: 'fvg',
          direction: 'bullish',
          level: 520.25,
          confidence: 0.78,
          description: 'Fair Value Gap created during Asian session needs filling',
          killZone
        },
        {
          symbol: 'NVDA',
          type: 'liquidity_sweep',
          direction: 'bearish',
          level: 145.00,
          confidence: 0.72,
          description: 'Stop hunt above previous high, expecting reversal',
          killZone
        },
        {
          symbol: 'AAPL',
          type: 'market_structure',
          direction: 'bullish',
          level: 235.50,
          confidence: 0.82,
          description: 'Break of Structure (BOS) confirmed with higher high',
          killZone
        }
      ];
      
      setIctSignals(signals);
    };

    generateICTSignals();
    const interval = setInterval(generateICTSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current prices for positions
  const updatePrices = async () => {
    if (positions.length === 0) return;
    
    setIsLoading(true);
    try {
      // Simulate price updates with small random changes
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

  const executePaperTrade = async (action: 'buy' | 'sell', tradeSymbol: string, qty: number, strategy: string = 'Manual') => {
    setIsLoading(true);
    try {
      // Fetch current price
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${tradeSymbol.toUpperCase()}?interval=1d&range=1d`);
      const data = await response.json();
      const price = data.chart.result?.[0]?.meta?.regularMarketPrice || 100;

      if (action === 'buy') {
        const totalCost = price * qty;
        if (totalCost > balance) {
          toast({
            title: "Insufficient Balance",
            description: `You need $${totalCost.toFixed(2)} but only have $${balance.toFixed(2)}`,
            variant: "destructive"
          });
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
          stopLoss: price * 0.97, // 3% stop loss
          takeProfit: price * 1.08 // 8% take profit
        };

        setPositions(prev => [...prev, newPosition]);
        setBalance(prev => prev - totalCost);
        
        const trade: TradeHistory = {
          id: Date.now().toString(),
          symbol: tradeSymbol.toUpperCase(),
          action: 'buy',
          quantity: qty,
          price,
          timestamp: new Date(),
          strategy
        };
        setTradeHistory(prev => [trade, ...prev]);

        toast({
          title: "Position Opened",
          description: `Bought ${qty} shares of ${tradeSymbol.toUpperCase()} at $${price.toFixed(2)}`
        });
      } else {
        const position = positions.find(p => p.symbol === tradeSymbol.toUpperCase());
        if (!position) {
          toast({
            title: "No Position Found",
            description: `You don't have a position in ${tradeSymbol}`,
            variant: "destructive"
          });
          return;
        }

        const sellQty = Math.min(qty, position.quantity);
        const proceeds = position.currentPrice * sellQty;
        const pnl = (position.currentPrice - position.entryPrice) * sellQty;

        if (sellQty >= position.quantity) {
          setPositions(prev => prev.filter(p => p.id !== position.id));
        } else {
          setPositions(prev => prev.map(p => 
            p.id === position.id ? { ...p, quantity: p.quantity - sellQty } : p
          ));
        }

        setBalance(prev => prev + proceeds);

        const trade: TradeHistory = {
          id: Date.now().toString(),
          symbol: tradeSymbol.toUpperCase(),
          action: 'sell',
          quantity: sellQty,
          price: position.currentPrice,
          timestamp: new Date(),
          pnl,
          strategy: position.strategy
        };
        setTradeHistory(prev => [trade, ...prev]);

        toast({
          title: pnl >= 0 ? "Profitable Trade!" : "Trade Closed",
          description: `Sold ${sellQty} shares of ${tradeSymbol.toUpperCase()} for ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
          variant: pnl >= 0 ? "default" : "destructive"
        });
      }
    } catch (error) {
      console.error('Trade error:', error);
      toast({
        title: "Trade Failed",
        description: "Could not execute trade",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAccount = () => {
    setBalance(STARTING_CAPITAL);
    setPositions([]);
    setTradeHistory([]);
    toast({
      title: "Account Reset",
      description: `Paper trading account reset to $${STARTING_CAPITAL.toLocaleString()}`
    });
  };

  const executeICTTrade = (signal: ICTSignal) => {
    const qty = Math.floor((balance * 0.1) / signal.level); // Use 10% of balance
    if (qty > 0 && signal.direction === 'bullish') {
      executePaperTrade('buy', signal.symbol, qty, `ICT ${signal.type.replace('_', ' ')}`);
    }
  };

  // Portfolio history chart data
  const chartData = tradeHistory.slice(0, 20).reverse().map((trade, index) => ({
    time: index + 1,
    value: STARTING_CAPITAL + tradeHistory.slice(0, tradeHistory.length - index).reduce((sum, t) => sum + (t.pnl || 0), 0)
  }));

  if (chartData.length === 0) {
    chartData.push({ time: 0, value: STARTING_CAPITAL });
  }

  const getSignalTypeColor = (type: ICTSignal['type']) => {
    switch (type) {
      case 'order_block': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'fvg': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'liquidity_sweep': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'market_structure': return 'bg-green-500/10 text-green-500 border-green-500/30';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-xl font-bold">${portfolioValue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cash Balance</p>
              <p className="text-xl font-bold">${balance.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Positions Value</p>
              <p className="text-xl font-bold">${totalPositionValue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 ${unrealizedPnL >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${unrealizedPnL >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
              {unrealizedPnL >= 0 ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unrealized P/L</p>
              <p className={`text-xl font-bold ${unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 ${totalPnL >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalPnL >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total P/L</p>
              <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({pnlPercent}%)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card/50">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="ict-signals">ICT Signals</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
          <TabsTrigger value="test">Test Strategy</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Open Positions</CardTitle>
                <CardDescription>Starting Capital: ${STARTING_CAPITAL.toLocaleString()}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={updatePrices} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="destructive" size="sm" onClick={resetAccount}>
                  Reset Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions. Use ICT signals or manual trading to open positions.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead className="text-right">SL / TP</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map(pos => {
                      const pnl = (pos.currentPrice - pos.entryPrice) * pos.quantity;
                      const pnlPct = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice * 100);
                      return (
                        <TableRow key={pos.id}>
                          <TableCell className="font-bold">{pos.symbol}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{pos.strategy}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{pos.quantity}</TableCell>
                          <TableCell className="text-right">${pos.entryPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${pos.currentPrice.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-semibold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct.toFixed(1)}%)
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            ${pos.stopLoss.toFixed(2)} / ${pos.takeProfit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => executePaperTrade('sell', pos.symbol, pos.quantity)}
                            >
                              Close
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Portfolio Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={['dataMin - 500', 'dataMax + 500']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorValue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ICT Signals Tab */}
        <TabsContent value="ict-signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                ICT Trading Signals
              </CardTitle>
              <CardDescription>
                Inner Circle Trader concepts: Order Blocks, Fair Value Gaps, Liquidity Sweeps, Market Structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Kill Zone Indicator */}
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Current Session:</span>
                <Badge>{ictSignals[0]?.killZone || 'Off-Hours'}</Badge>
                <span className="text-sm text-muted-foreground ml-auto">
                  Best entries during NY Open (8-11 AM ET) and London Open (2-5 AM ET)
                </span>
              </div>

              {/* ICT Concepts Legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span>Order Block</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-purple-500" />
                  <span>Fair Value Gap</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span>Liquidity Sweep</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Market Structure</span>
                </div>
              </div>

              {/* Signals */}
              <div className="space-y-3">
                {ictSignals.map((signal, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getSignalTypeColor(signal.type)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-lg">{signal.symbol}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {signal.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant={signal.direction === 'bullish' ? 'default' : 'destructive'}>
                            {signal.direction === 'bullish' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {signal.direction}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{signal.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Level: <strong>${signal.level.toFixed(2)}</strong></span>
                          <span>Confidence: <strong>{(signal.confidence * 100).toFixed(0)}%</strong></span>
                        </div>
                      </div>
                      {signal.direction === 'bullish' && (
                        <Button size="sm" onClick={() => executeICTTrade(signal)} disabled={isLoading}>
                          <Zap className="h-4 w-4 mr-1" />
                          Trade
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ICT Education */}
          <Card>
            <CardHeader>
              <CardTitle>ICT Trading Concepts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <h4 className="font-semibold text-blue-500 mb-1">Order Blocks (OB)</h4>
                  <p className="text-muted-foreground">Last bullish/bearish candle before a significant move. Institutions place large orders at these levels.</p>
                </div>
                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <h4 className="font-semibold text-purple-500 mb-1">Fair Value Gaps (FVG)</h4>
                  <p className="text-muted-foreground">Price inefficiencies where price gaps through quickly. Price often returns to fill these gaps.</p>
                </div>
                <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                  <h4 className="font-semibold text-orange-500 mb-1">Liquidity Sweeps</h4>
                  <p className="text-muted-foreground">Price breaks above/below key levels to grab stop losses before reversing. Look for reversals after sweeps.</p>
                </div>
                <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                  <h4 className="font-semibold text-green-500 mb-1">Market Structure</h4>
                  <p className="text-muted-foreground">Higher highs/lows (bullish) or lower highs/lows (bearish). BOS = Break of Structure signals trend change.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Trade Tab */}
        <TabsContent value="trade">
          <Card>
            <CardHeader>
              <CardTitle>Manual Paper Trade</CardTitle>
              <CardDescription>Execute paper trades manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input 
                    placeholder="e.g., AAPL, NVDA" 
                    value={symbol}
                    onChange={e => setSymbol(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => executePaperTrade('buy', symbol, quantity)}
                      disabled={!symbol || isLoading}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      Buy
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1" 
                      onClick={() => executePaperTrade('sell', symbol, quantity)}
                      disabled={!symbol || isLoading}
                    >
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                      Sell
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Strategy Tab */}
        <TabsContent value="test" className="space-y-4">
          {/* Backtest Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Historical Backtest
              </CardTitle>
              <CardDescription>
                Test strategy against historical data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input 
                    placeholder="SPY" 
                    id="backtest-symbol"
                    defaultValue="SPY"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Days Back</Label>
                  <Input 
                    type="number" 
                    id="backtest-days"
                    defaultValue="30"
                    min="7"
                    max="365"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buy Threshold %</Label>
                  <Input 
                    type="number" 
                    id="backtest-buy"
                    defaultValue="2"
                    step="0.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sell Threshold %</Label>
                  <Input 
                    type="number" 
                    id="backtest-sell"
                    defaultValue="3"
                    step="0.5"
                  />
                </div>
              </div>
              <Button 
                className="w-full" 
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

                    // First create a strategy
                    const { data: strategy, error: strategyError } = await supabase
                      .from('backtest_strategies')
                      .insert({
                        name: `Test-${symbolInput}-${Date.now()}`,
                        description: 'Manual backtest',
                        buy_condition: buyThreshold,
                        sell_condition: sellThreshold,
                        initial_capital: STARTING_CAPITAL
                      })
                      .select()
                      .single();

                    if (strategyError) throw strategyError;

                    const { data, error } = await supabase.functions.invoke('run-backtest', {
                      body: {
                        strategyId: strategy.id,
                        symbol: symbolInput,
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0]
                      }
                    });

                    if (error) throw error;

                    const result = data.result;
                    toast({
                      title: `Backtest Complete: ${symbolInput}`,
                      description: `Return: ${result.return_percentage?.toFixed(2) || 0}% | Win Rate: ${result.win_rate?.toFixed(1) || 0}% | Trades: ${result.total_trades || 0}`
                    });
                    console.log('Backtest results:', result);
                  } catch (err) {
                    toast({
                      title: "Backtest Error",
                      description: err instanceof Error ? err.message : "Failed to run backtest",
                      variant: "destructive"
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Run Backtest
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Backtest Tips</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Buy Threshold</strong>: Price dip % that triggers a buy (e.g., 2% = buy when price drops 2%).</li>
                    <li>• <strong>Sell Threshold</strong>: Price gain % that triggers a sell (e.g., 3% = sell when price rises 3%).</li>
                    <li>• Win rate above 50% with positive returns indicates a potentially profitable strategy.</li>
                    <li>• Test multiple symbols (SPY, QQQ, NVDA) to validate strategy across markets.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>{tradeHistory.length} trades executed</CardDescription>
            </CardHeader>
            <CardContent>
              {tradeHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trades yet. Start trading to see history.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradeHistory.slice(0, 50).map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(trade.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-bold">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.action === 'buy' ? 'default' : 'destructive'}>
                            {trade.action.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{trade.strategy}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{trade.quantity}</TableCell>
                        <TableCell className="text-right">${trade.price.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-semibold ${trade.pnl && trade.pnl >= 0 ? 'text-success' : trade.pnl ? 'text-destructive' : ''}`}>
                          {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};