import { Header } from "@/components/Header";
import { TopGainers } from "@/components/TopGainers";
import { PaperTrading } from "@/components/PaperTrading";
import { Backtesting } from "@/components/Backtesting";
import { TradingNotifications } from "@/components/TradingNotifications";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="border-b border-border bg-gradient-to-b from-secondary/30 to-background">
        <div className="container mx-auto px-6 py-20">
          <h1 className="text-5xl md:text-6xl font-semibold text-foreground mb-4 tracking-tight">
            AI Trading Bot
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl font-light">
            Backtest strategies, paper trade, and get AI-powered stock recommendations.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 space-y-8">
        {/* Trading Alerts */}
        <TradingNotifications 
          signals={signals} 
          isLoading={isLoading}
          onDismiss={markSignalAsRead}
        />

        {/* Main Features */}
        <Tabs defaultValue="recommendations" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="recommendations">Stock Recommendations</TabsTrigger>
            <TabsTrigger value="paper">Paper Trading</TabsTrigger>
            <TabsTrigger value="backtest">Backtesting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recommendations">
            <TopGainers />
          </TabsContent>
          
          <TabsContent value="paper">
            <PaperTrading />
          </TabsContent>
          
          <TabsContent value="backtest">
            <Backtesting />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
