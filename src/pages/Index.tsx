import { Header } from "@/components/Header";
import { TechnicalAnalysis } from "@/components/TechnicalAnalysis";
import { AlpacaAutoTrading } from "@/components/AlpacaAutoTrading";
import { ActivityLog } from "@/components/ActivityLog";
import { AutoTradePortfolio } from "@/components/AutoTradePortfolio";
import { MonitoringStats } from "@/components/MonitoringStats";
import { PaperTradingDashboard } from "@/components/PaperTradingDashboard";
import { PerformanceAnalytics } from "@/components/PerformanceAnalytics";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradeNotifications } from "@/hooks/useTradeNotifications";

const Index = () => {
  const [isAutoTradingEnabled, setIsAutoTradingEnabled] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(100);

  useTradeNotifications();

  return (
    <div className="min-h-screen bg-background scanlines">
      <Header />
      
      {/* Hero */}
      <div className="border-b-2 border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-end gap-6">
            <div>
              <p className="text-label mb-2">SYSTEM//ACTIVE</p>
              <h1 className="text-display text-foreground">
                TRADE<span className="text-primary">BOT</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="status-dot active" />
              <span className="text-label">LIVE</span>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm">
            AI-POWERED ALGORITHMIC TRADING // BACKTEST // PAPER TRADE // EXECUTE
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <MonitoringStats />

        {/* Main Tabs */}
        <Tabs defaultValue="paper-trading" className="w-full">
          <TabsList className="w-full grid grid-cols-6 bg-card border-2 border-border p-0 h-auto">
            {[
              { value: "paper-trading", label: "PAPER" },
              { value: "analytics", label: "ANALYTICS" },
              { value: "portfolio", label: "PORTFOLIO" },
              { value: "auto-trade", label: "AUTO" },
              { value: "technical", label: "TECHNICAL" },
              { value: "activity", label: "LOG" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="py-3 text-xs font-bold tracking-wider border-r-2 border-border last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="paper-trading">
              <PaperTradingDashboard />
            </TabsContent>

            <TabsContent value="analytics">
              <PerformanceAnalytics />
            </TabsContent>

            <TabsContent value="portfolio">
              <AutoTradePortfolio />
            </TabsContent>

            <TabsContent value="auto-trade">
              <AlpacaAutoTrading 
                onAutoTradingChange={setIsAutoTradingEnabled}
                onMaxPositionSizeChange={setMaxPositionSize}
              />
            </TabsContent>

            <TabsContent value="technical">
              <TechnicalAnalysis />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityLog />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-border mt-12">
        <div className="container mx-auto px-4 py-4">
          <p className="text-label text-center">
            TRADEBOT V2.0 // {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
