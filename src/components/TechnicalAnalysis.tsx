import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TechnicalData {
  symbol: string;
  currentPrice: number;
  daily: {
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    volumeTrend: string;
    pattern: string;
    sma20: number;
    sma50: number;
    priceVsSMA20: string;
    priceVsSMA50: string;
  };
  weekly: {
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    pattern: string;
    sma20: number;
  };
  monthly: {
    rsi: number;
    pattern: string;
  };
}

export const TechnicalAnalysis = () => {
  const [symbols, setSymbols] = useState("NVDA,TSLA,AMD,GOOGL,META");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [technicalData, setTechnicalData] = useState<TechnicalData[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState("");

  const analyzeTechnicals = async () => {
    setIsAnalyzing(true);
    try {
      const symbolArray = symbols.split(",").map(s => s.trim().toUpperCase());
      
      const { data, error } = await supabase.functions.invoke("analyze-multi-timeframe", {
        body: { symbols: symbolArray },
      });

      if (error) throw error;

      setTechnicalData(data.technicalData);
      setAiAnalysis(data.aiAnalysis);
      
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.technicalData.length} stocks across multiple timeframes`,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRSIColor = (rsi: number) => {
    if (rsi > 70) return "text-red-500";
    if (rsi < 30) return "text-green-500";
    return "text-muted-foreground";
  };

  const getMACDIndicator = (macd: { histogram: number }) => {
    return macd.histogram > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Multi-Timeframe Technical Analysis
          </CardTitle>
          <CardDescription>
            Advanced pattern recognition with RSI, MACD, volume, and moving averages across daily, weekly, and monthly timeframes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter symbols (comma-separated, e.g., NVDA,TSLA,AMD)"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              className="flex-1"
            />
            <Button onClick={analyzeTechnicals} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {aiAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>AI Technical Interpretation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{aiAnalysis}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {technicalData.length > 0 && (
        <div className="grid gap-6">
          {technicalData.map((stock) => (
            <Card key={stock.symbol}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{stock.symbol}</CardTitle>
                    <CardDescription>${stock.currentPrice.toFixed(2)}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {stock.daily.pattern.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="daily">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>

                  <TabsContent value="daily" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">RSI</p>
                        <p className={`text-2xl font-bold ${getRSIColor(stock.daily.rsi)}`}>
                          {stock.daily.rsi.toFixed(1)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">MACD</p>
                        <div className="flex items-center gap-2">
                          {getMACDIndicator(stock.daily.macd)}
                          <p className="text-2xl font-bold">
                            {stock.daily.macd.histogram.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Volume</p>
                        <Badge variant={stock.daily.volumeTrend === "surging" ? "default" : "secondary"}>
                          {stock.daily.volumeTrend}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">vs SMA20</p>
                        <p className={`text-xl font-bold ${parseFloat(stock.daily.priceVsSMA20) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stock.daily.priceVsSMA20}%
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Moving Averages</p>
                      <div className="space-y-1">
                        <p className="text-sm">SMA 20: ${stock.daily.sma20.toFixed(2)}</p>
                        <p className="text-sm">SMA 50: ${stock.daily.sma50.toFixed(2)}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="weekly" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">RSI</p>
                        <p className={`text-2xl font-bold ${getRSIColor(stock.weekly.rsi)}`}>
                          {stock.weekly.rsi.toFixed(1)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">MACD</p>
                        <div className="flex items-center gap-2">
                          {getMACDIndicator(stock.weekly.macd)}
                          <p className="text-2xl font-bold">
                            {stock.weekly.macd.histogram.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Pattern</p>
                        <Badge>{stock.weekly.pattern.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="monthly" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">RSI</p>
                        <p className={`text-2xl font-bold ${getRSIColor(stock.monthly.rsi)}`}>
                          {stock.monthly.rsi.toFixed(1)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Long-term Pattern</p>
                        <Badge>{stock.monthly.pattern.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};