import { Header } from "@/components/Header";
import { TopGainers } from "@/components/TopGainers";
import { PaperTrading } from "@/components/PaperTrading";
import { Backtesting } from "@/components/Backtesting";
import { TradingNotifications } from "@/components/TradingNotifications";
import { AIStockAnalyzer } from "@/components/AIStockAnalyzer";
import { TechnicalAnalysis } from "@/components/TechnicalAnalysis";
import { AlpacaAutoTrading } from "@/components/AlpacaAutoTrading";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { TrendingUp, Bot, LineChart, AlertTriangle, Brain, Activity, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TradingSignal {
  id: string;
  signal_type: string;
  current_price: number;
  price_change_percent: number;
  current_gain_percent: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Index = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoTradingEnabled, setIsAutoTradingEnabled] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(100);

  // Fetch trading signals
  useEffect(() => {
    const fetchSignals = async () => {
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSignals(data);
      }
      setIsLoading(false);
    };

    fetchSignals();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('trading_signals_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals'
        },
        () => fetchSignals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markSignalAsRead = async (signalId: string) => {
    await supabase
      .from('trading_signals')
      .update({ is_read: true })
      .eq('id', signalId);

    setSignals(signals.filter(s => s.id !== signalId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
      <Header />
      
      {/* Hero Section */}
      <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-secondary/10 to-background backdrop-blur-sm">
        <div className="container mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
                AI Trading Bot
              </h1>
              <Badge variant="secondary" className="mt-2">
                Goal: $2,000/month
              </Badge>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Algorithmic trading powered by AI. Backtest strategies, paper trade, and get real-time recommendations.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Trading Alerts */}
        {signals.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <TradingNotifications 
              signals={signals} 
              isLoading={isLoading}
              onDismiss={markSignalAsRead}
            />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{signals.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-secondary/20 hover:border-secondary/40 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <LineChart className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trading Mode</p>
                <p className="text-2xl font-bold">Live</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-accent/20 hover:border-accent/40 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <p className="text-2xl font-bold">Moderate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Features */}
        <Tabs defaultValue="auto-trade" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6 bg-card/50 backdrop-blur">
            <TabsTrigger value="auto-trade" className="data-[state=active]:bg-primary/10">
              <Zap className="h-4 w-4 mr-2" />
              Auto-Trade
            </TabsTrigger>
            <TabsTrigger value="technical" className="data-[state=active]:bg-primary/10">
              <Activity className="h-4 w-4 mr-2" />
              Technical
            </TabsTrigger>
            <TabsTrigger value="ai-analyzer" className="data-[state=active]:bg-primary/10">
              <Brain className="h-4 w-4 mr-2" />
              AI Analyzer
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-primary/10">
              <TrendingUp className="h-4 w-4 mr-2" />
              Daily Picks
            </TabsTrigger>
            <TabsTrigger value="paper" className="data-[state=active]:bg-primary/10">
              <LineChart className="h-4 w-4 mr-2" />
              Paper Trading
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:bg-primary/10">
              <Bot className="h-4 w-4 mr-2" />
              Backtesting
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="auto-trade" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AlpacaAutoTrading 
              onAutoTradingChange={setIsAutoTradingEnabled}
              onMaxPositionSizeChange={setMaxPositionSize}
            />
          </TabsContent>
          
          <TabsContent value="technical" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TechnicalAnalysis />
          </TabsContent>
          
          <TabsContent value="ai-analyzer" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AIStockAnalyzer 
              isAutoTradingEnabled={isAutoTradingEnabled}
              maxPositionSize={maxPositionSize}
            />
          </TabsContent>
          
          <TabsContent value="recommendations" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TopGainers />
          </TabsContent>
          
          <TabsContent value="paper" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PaperTrading />
          </TabsContent>
          
          <TabsContent value="backtest" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Backtesting />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
