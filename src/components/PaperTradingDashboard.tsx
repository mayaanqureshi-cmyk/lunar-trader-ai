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

interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

interface AlpacaOrder {
  id: string;
  symbol: string;
  side: string;
  qty: string;
  status: string;
  filled_avg_price: string | null;
  filled_at: string | null;
  created_at: string;
}

interface AlpacaAccount {
  status: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  daytrade_count: number;
}

export const PaperTradingDashboard = () => {
  const [account, setAccount] = useState<AlpacaAccount | null>(null);
  const [positions, setPositions] = useState<AlpacaPosition[]>([]);
  const [orders, setOrders] = useState<AlpacaOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(1);

  const fetchAlpacaData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-alpaca-account');
      
      if (error) throw error;
      
      if (data.success) {
        setAccount(data.account);
        setPositions(data.positions || []);
        setOrders(data.recent_orders || []);
      } else {
        throw new Error(data.error || 'Failed to fetch account');
      }
    } catch (err) {
      console.error('Error fetching Alpaca data:', err);
      toast({ title: "FAILED TO FETCH ACCOUNT", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlpacaData();
    const interval = setInterval(fetchAlpacaData, 30000);
    return () => clearInterval(interval);
  }, []);

  const portfolioValue = parseFloat(account?.portfolio_value || '0');
  const cash = parseFloat(account?.cash || '0');
  const equity = parseFloat(account?.equity || '0');
  const lastEquity = parseFloat(account?.last_equity || '0');
  const dayChange = equity - lastEquity;
  const dayChangePercent = lastEquity > 0 ? ((dayChange / lastEquity) * 100).toFixed(2) : '0.00';
  const totalPnL = portfolioValue - STARTING_CAPITAL;
  const totalPnLPercent = ((totalPnL / STARTING_CAPITAL) * 100).toFixed(2);

  const unrealizedPnL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl || '0'), 0);
  const positionsValue = positions.reduce((sum, pos) => sum + parseFloat(pos.market_value || '0'), 0);

  const executeTrade = async (action: 'buy' | 'sell', tradeSymbol: string, qty: number) => {
    if (!tradeSymbol) {
      toast({ title: "ENTER SYMBOL", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-alpaca-trade', {
        body: {
          symbol: tradeSymbol.toUpperCase(),
          action,
          quantity: qty,
          orderType: 'market'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({ 
          title: `${action.toUpperCase()} ORDER PLACED`,
          description: `${qty} ${tradeSymbol.toUpperCase()} - ${data.order.status}`
        });
        setTimeout(fetchAlpacaData, 2000);
      } else {
        throw new Error(data.error || 'Trade failed');
      }
    } catch (err) {
      console.error('Trade error:', err);
      toast({ 
        title: "TRADE FAILED", 
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closePosition = async (pos: AlpacaPosition) => {
    await executeTrade('sell', pos.symbol, parseInt(pos.qty));
  };

  const chartData = orders
    .filter(o => o.status === 'filled' && o.filled_avg_price)
    .slice(0, 15)
    .reverse()
    .map((order, idx) => ({
      trade: idx + 1,
      price: parseFloat(order.filled_avg_price || '0'),
    }));

  return (
    <div className="space-y-6">
      {/* Account Overview - Alpaca Paper */}
      <div className="border-2 border-primary p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-label">ALPACA PAPER</span>
            <span className={`px-2 py-0.5 text-xxs font-bold ${account?.status === 'ACTIVE' ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground'}`}>
              {account?.status || 'LOADING'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlpacaData} disabled={isLoading} className="text-xxs h-7 border-2">
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </Button>
        </div>
      </div>

      <div className="data-grid grid-cols-5">
        <div>
          <p className="text-label">PORTFOLIO</p>
          <p className="text-value text-primary">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-label">CASH</p>
          <p className="text-value">${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-label">POSITIONS</p>
          <p className="text-value">${positionsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-label">TODAY</p>
          <p className={`text-value ${dayChange >= 0 ? 'text-success' : 'text-danger'}`}>
            {dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} ({dayChangePercent}%)
          </p>
        </div>
        <div>
          <p className="text-label">TOTAL P/L</p>
          <p className={`text-value ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalPnLPercent}%)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4 bg-card border-2 border-border p-0 h-auto">
          {['POSITIONS', 'TRADE', 'ORDERS', 'BACKTEST'].map((tab) => (
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
              <p className="text-label">{positions.length} POSITIONS</p>
              <p className={`text-sm font-bold ${unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                UNREALIZED: {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
              </p>
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
                    <TableHead className="text-label text-right">QTY</TableHead>
                    <TableHead className="text-label text-right">AVG ENTRY</TableHead>
                    <TableHead className="text-label text-right">CURRENT</TableHead>
                    <TableHead className="text-label text-right">MKT VALUE</TableHead>
                    <TableHead className="text-label text-right">P/L</TableHead>
                    <TableHead className="text-label text-right">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(pos => {
                    const pnl = parseFloat(pos.unrealized_pl);
                    const pnlPercent = (parseFloat(pos.unrealized_plpc) * 100).toFixed(2);
                    return (
                      <TableRow key={pos.symbol} className="border-b border-border hover:bg-secondary/50">
                        <TableCell className="font-bold">{pos.symbol}</TableCell>
                        <TableCell className="text-right mono-display">{pos.qty}</TableCell>
                        <TableCell className="text-right mono-display">${parseFloat(pos.avg_entry_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right mono-display">${parseFloat(pos.current_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right mono-display">${parseFloat(pos.market_value).toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-bold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent}%)
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" className="h-6 text-xxs" onClick={() => closePosition(pos)} disabled={isLoading}>
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
              <p className="text-label mb-4">RECENT FILLS</p>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="trade" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '2px solid hsl(var(--border))', borderRadius: 0, fontSize: 12 }} />
                  <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#colorPrice)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>

        {/* Trade */}
        <TabsContent value="trade">
          <div className="border-2 border-border p-6">
            <p className="text-label mb-4">EXECUTE TRADE (ALPACA PAPER)</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-label">SYMBOL</Label>
                <Input 
                  placeholder="AAPL" 
                  value={symbol} 
                  onChange={e => setSymbol(e.target.value.toUpperCase())} 
                  className="border-2 font-bold" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-label">QUANTITY</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={quantity} 
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                  className="border-2 font-bold" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-label">&nbsp;</Label>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 h-10 font-bold" 
                    onClick={() => executeTrade('buy', symbol, quantity)} 
                    disabled={!symbol || isLoading}
                  >
                    BUY
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1 h-10 font-bold" 
                    onClick={() => executeTrade('sell', symbol, quantity)} 
                    disabled={!symbol || isLoading}
                  >
                    SELL
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xxs text-muted-foreground mt-4">
              BUYING POWER: ${parseFloat(account?.buying_power || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders">
          <div className="border-2 border-border">
            <div className="p-4 border-b-2 border-border">
              <p className="text-label">RECENT ORDERS</p>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">NO ORDERS</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border hover:bg-transparent">
                    <TableHead className="text-label">TIME</TableHead>
                    <TableHead className="text-label">SYMBOL</TableHead>
                    <TableHead className="text-label">SIDE</TableHead>
                    <TableHead className="text-label text-right">QTY</TableHead>
                    <TableHead className="text-label text-right">FILL PRICE</TableHead>
                    <TableHead className="text-label">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id} className="border-b border-border hover:bg-secondary/50">
                      <TableCell className="text-xxs text-muted-foreground">
                        {order.filled_at ? new Date(order.filled_at).toLocaleString() : new Date(order.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold">{order.symbol}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xxs font-bold ${order.side === 'buy' ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground'}`}>
                          {order.side.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right mono-display">{order.qty}</TableCell>
                      <TableCell className="text-right mono-display">
                        {order.filled_avg_price ? `$${parseFloat(order.filled_avg_price).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xxs font-bold ${order.status === 'filled' ? 'text-success' : order.status === 'canceled' ? 'text-danger' : 'text-warning'}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
      </Tabs>
    </div>
  );
};
