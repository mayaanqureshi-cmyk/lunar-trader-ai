import { Header } from "@/components/Header";
import { MetricsCard } from "@/components/MetricsCard";
import { TopGainers } from "@/components/TopGainers";
import { WeeklyGainers } from "@/components/WeeklyGainers";
import { SentimentAnalysis } from "@/components/SentimentAnalysis";
import { TradingSignals } from "@/components/TradingSignals";
import { PerformanceChart } from "@/components/PerformanceChart";
import { AddToPortfolio } from "@/components/AddToPortfolio";
import { PortfolioList } from "@/components/PortfolioList";
import { TradingNotifications } from "@/components/TradingNotifications";
import { AIInsights } from "@/components/AIInsights";
import { ProfitTracker } from "@/components/ProfitTracker";
import { PaperTrading } from "@/components/PaperTrading";
import { Backtesting } from "@/components/Backtesting";
import { StockNews } from "@/components/StockNews";
import { usePortfolio } from "@/hooks/usePortfolio";
import { DollarSign, TrendingUp, Target, Activity } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { portfolio, signals, isLoading, addToPortfolio, removeFromPortfolio, markSignalAsRead } = usePortfolio();

  // Monitor portfolio every 5 minutes
  useEffect(() => {
    const monitorPortfolio = async () => {
      if (portfolio.length > 0) {
        await supabase.functions.invoke('monitor-portfolio');
      }
    };

    monitorPortfolio();
    const interval = setInterval(monitorPortfolio, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [portfolio.length]);

  const totalValue = portfolio.reduce((sum, stock) => 
    sum + (stock.purchase_price * stock.quantity), 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="border-b border-border bg-gradient-to-b from-secondary/30 to-background">
        <div className="container mx-auto px-6 py-20">
          <h1 className="text-5xl md:text-6xl font-semibold text-foreground mb-4 tracking-tight">
            Trading Intelligence
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl font-light">
            Track market performers and receive intelligent trading signals.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="Portfolio Value"
            value={`$${totalValue.toFixed(2)}`}
            change="31.0%"
            isPositive={true}
            icon={DollarSign}
          />
          <MetricsCard
            title="Active Alerts"
            value={signals.length.toString()}
            change={`${signals.length} new`}
            isPositive={signals.length === 0}
            icon={Target}
          />
          <MetricsCard
            title="Stocks Tracked"
            value={portfolio.length.toString()}
            change={`${portfolio.length} total`}
            isPositive={true}
            icon={Activity}
          />
          <MetricsCard
            title="Today's Gain"
            value="$425"
            change="3.35%"
            isPositive={true}
            icon={TrendingUp}
          />
        </div>

        {/* Portfolio Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AddToPortfolio onAdd={addToPortfolio} />
          <TradingNotifications 
            signals={signals} 
            isLoading={isLoading}
            onDismiss={markSignalAsRead}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PortfolioList
              portfolio={portfolio}
              isLoading={isLoading}
              onRemove={removeFromPortfolio}
            />
          </div>
          <div>
            <AIInsights />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="daily">Daily Gainers</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Opportunities</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily">
                <TopGainers />
              </TabsContent>
              
              <TabsContent value="weekly">
                <WeeklyGainers />
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <ProfitTracker />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SentimentAnalysis />
          <TradingSignals />
        </div>

        {/* Advanced Features */}
        <div className="mt-8">
          <Tabs defaultValue="news" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="paper">Paper Trading</TabsTrigger>
              <TabsTrigger value="backtest">Backtesting</TabsTrigger>
            </TabsList>
            
            <TabsContent value="news">
              <StockNews symbols={portfolio.map(s => s.symbol)} />
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
    </div>
  );
};

export default Index;
