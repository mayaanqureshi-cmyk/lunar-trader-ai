import { Header } from "@/components/Header";
import { TechnicalAnalysis } from "@/components/TechnicalAnalysis";
import { AlpacaAutoTrading } from "@/components/AlpacaAutoTrading";
import { ActivityLog } from "@/components/ActivityLog";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, Activity } from "lucide-react";


const Index = () => {
  const [isAutoTradingEnabled, setIsAutoTradingEnabled] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(100);


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
        {/* Focused layout: Auto-Trade + Technical Analysis only */}

        {/* Main Features */}
        <Tabs defaultValue="auto-trade" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/50 backdrop-blur">
            <TabsTrigger value="auto-trade" className="data-[state=active]:bg-primary/10">
              <Zap className="h-4 w-4 mr-2" />
              Auto-Trade
            </TabsTrigger>
            <TabsTrigger value="technical" className="data-[state=active]:bg-primary/10">
              <Activity className="h-4 w-4 mr-2" />
              Technical
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary/10">
              <Activity className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto-trade" className="animate-in fade-in-from-bottom-4 duration-500">
            <AlpacaAutoTrading 
              onAutoTradingChange={setIsAutoTradingEnabled}
              onMaxPositionSizeChange={setMaxPositionSize}
            />
          </TabsContent>

          <TabsContent value="technical" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TechnicalAnalysis />
          </TabsContent>

          <TabsContent value="activity" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ActivityLog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
