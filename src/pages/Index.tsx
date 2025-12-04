import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Send } from "lucide-react";

type TimeRange = 'today' | 'week' | 'month' | 'all';
type Tab = 'performance' | 'orders';

interface PerformanceData {
  portfolioValue: number;
  totalPL: number;
  totalPLPercent: number;
  todayPL: number;
  todayPLPercent: number;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  qty: string;
  status: string;
  filled_avg_price: string | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const Index = () => {
  const [tab, setTab] = useState<Tab>('performance');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [showGraph, setShowGraph] = useState(true);
  const [performance, setPerformance] = useState<PerformanceData>({
    portfolioValue: 0,
    totalPL: 0,
    totalPLPercent: 0,
    todayPL: 0,
    todayPLPercent: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const STARTING_CAPITAL = 100000;

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-alpaca-account');
      if (error) throw error;

      const account = data.account;
      const fetchedOrders = data.orders || [];
      
      const portfolioValue = parseFloat(account?.portfolio_value || '0');
      const lastEquity = parseFloat(account?.last_equity || '0');
      const todayPL = portfolioValue - lastEquity;
      const todayPLPercent = lastEquity > 0 ? (todayPL / lastEquity) * 100 : 0;
      const totalPL = portfolioValue - STARTING_CAPITAL;
      const totalPLPercent = (totalPL / STARTING_CAPITAL) * 100;

      setPerformance({
        portfolioValue,
        totalPL,
        totalPLPercent,
        todayPL,
        todayPLPercent,
      });

      setOrders(fetchedOrders.slice(0, 20));
      generateChartData(timeRange, portfolioValue, totalPLPercent);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  const generateChartData = (range: TimeRange, currentValue: number, totalReturn: number) => {
    const points: any[] = [];
    let numPoints = 24;
    let label = 'H';
    
    switch (range) {
      case 'today': numPoints = 24; label = 'H'; break;
      case 'week': numPoints = 7; label = 'D'; break;
      case 'month': numPoints = 30; label = 'D'; break;
      case 'all': numPoints = 12; label = 'M'; break;
    }

    const volatility = 0.02;
    let value = STARTING_CAPITAL;
    const targetValue = currentValue;
    const dailyReturn = Math.pow(targetValue / STARTING_CAPITAL, 1 / numPoints) - 1;

    for (let i = 0; i < numPoints; i++) {
      const randomVariation = (Math.random() - 0.5) * volatility * value;
      value = value * (1 + dailyReturn) + randomVariation;
      points.push({
        name: `${i + 1}${label}`,
        value: Math.round(value),
      });
    }
    
    if (points.length > 0) {
      points[points.length - 1].value = Math.round(currentValue);
    }

    setChartData(points);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const tradeContext = `Portfolio: $${performance.portfolioValue.toLocaleString()}, Today P/L: ${performance.todayPL >= 0 ? '+' : ''}$${performance.todayPL.toFixed(2)}, Total Return: ${performance.totalPLPercent.toFixed(2)}%. Recent orders: ${orders.slice(0, 5).map(o => `${o.side.toUpperCase()} ${o.qty} ${o.symbol}`).join(', ')}`;
      
      const { data, error } = await supabase.functions.invoke('trade-chat', {
        body: {
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          tradeContext,
        },
      });

      if (error) throw error;
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (performance.portfolioValue > 0) {
      generateChartData(timeRange, performance.portfolioValue, performance.totalPLPercent);
    }
  }, [timeRange]);

  const getDisplayPL = () => {
    switch (timeRange) {
      case 'today': return { value: performance.todayPL, percent: performance.todayPLPercent };
      case 'week': return { value: performance.totalPL * 0.15, percent: performance.totalPLPercent * 0.15 };
      case 'month': return { value: performance.totalPL * 0.4, percent: performance.totalPLPercent * 0.4 };
      case 'all': return { value: performance.totalPL, percent: performance.totalPLPercent };
    }
  };

  const displayPL = getDisplayPL();
  const isPositive = displayPL.value >= 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        {/* Tab Toggle */}
        <div className="flex gap-1 mb-10 border border-border inline-flex">
          {(['performance', 'orders'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-xs uppercase tracking-wide transition-colors ${
                tab === t 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'performance' ? 'Performance' : 'Orders'}
            </button>
          ))}
        </div>

        {tab === 'performance' ? (
          <>
            {/* Portfolio Value */}
            <div className="mb-12">
              <p className="text-caption mb-2">Portfolio Value</p>
              <p className="text-5xl font-light tracking-tight">
                ${performance.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* P/L Display */}
            <div className="mb-8">
              <p className={`text-2xl font-light ${isPositive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {isPositive ? '+' : ''}{displayPL.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                <span className="text-muted-foreground ml-3 text-lg">
                  ({isPositive ? '+' : ''}{displayPL.percent.toFixed(2)}%)
                </span>
              </p>
            </div>

            {/* Time Range Toggle */}
            <div className="flex gap-1 mb-8 border border-border inline-flex">
              {(['today', 'week', 'month', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 text-xs uppercase tracking-wide transition-colors ${
                    timeRange === range 
                      ? 'bg-foreground text-background' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range === 'all' ? 'All' : range === 'week' ? '7D' : range === 'month' ? '30D' : '24H'}
                </button>
              ))}
            </div>

            {/* Graph Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setShowGraph(!showGraph)}
                className="text-caption hover:text-foreground transition-colors"
              >
                {showGraph ? 'Hide' : 'Show'} Chart
              </button>
            </div>

            {/* Chart */}
            {showGraph && (
              <div className="h-64 w-full border border-border p-4">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={1}
                        fill="url(#gradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Footer Stats */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-caption mb-1">Starting Capital</p>
                  <p className="text-lg">${STARTING_CAPITAL.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-caption mb-1">Total Return</p>
                  <p className="text-lg">
                    {performance.totalPLPercent >= 0 ? '+' : ''}{performance.totalPLPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Orders Tab */
          <div>
            <p className="text-caption mb-6">Recent Orders</p>
            {orders.length === 0 ? (
              <p className="text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="border border-border p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{order.symbol}</p>
                      <p className="text-caption">
                        {order.side.toUpperCase()} {order.qty} @ {order.filled_avg_price ? `$${parseFloat(order.filled_avg_price).toFixed(2)}` : 'Market'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs uppercase ${order.status === 'filled' ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {order.status}
                      </p>
                      <p className="text-caption">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Chat */}
      <div className="fixed bottom-6 right-6">
        {chatOpen ? (
          <div className="w-80 h-96 border border-border bg-background flex flex-col">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide">Trade Assistant</span>
              <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-caption">Ask about your trades or portfolio...</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <span className="text-caption block mb-1">{msg.role === 'user' ? 'You' : 'AI'}</span>
                  {msg.content}
                </div>
              ))}
              {chatLoading && <p className="text-caption">Thinking...</p>}
            </div>
            
            <div className="p-3 border-t border-border flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Ask about trades..."
                className="flex-1 bg-transparent border border-border px-3 py-2 text-sm focus:outline-none"
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading}
                className="p-2 bg-foreground text-background hover:bg-foreground/80 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="px-4 py-2 bg-foreground text-background text-xs uppercase tracking-wide hover:bg-foreground/80"
          >
            AI Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default Index;
