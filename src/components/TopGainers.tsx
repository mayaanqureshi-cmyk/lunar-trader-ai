import { Card } from "@/components/ui/card";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockData } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface StockRecommendation {
  symbol: string;
  recommendation: "BUY" | "HOLD";
  reason: string;
}

export const TopGainers = () => {
  const { gainers, isLoading, refetch } = useStockData();
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [analyzingStocks, setAnalyzingStocks] = useState(false);

  useEffect(() => {
    if (gainers.length > 0) {
      analyzeStocks();
    }
  }, [gainers]);

  const analyzeStocks = async () => {
    setAnalyzingStocks(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-stocks', {
        body: { stocks: gainers }
      });

      if (error) throw error;
      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error analyzing stocks:', error);
    } finally {
      setAnalyzingStocks(false);
    }
  };

  const getRecommendation = (symbol: string) => {
    return recommendations.find(r => r.symbol === symbol);
  };
  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          <h2 className="text-lg font-bold text-foreground">Top Daily Gainers</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refetch}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {gainers.map((stock, index) => {
            const rec = getRecommendation(stock.symbol);
            return (
              <div 
                key={stock.symbol}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-success flex items-center justify-center text-success-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{stock.symbol}</p>
                    <p className="text-xs text-muted-foreground">{stock.name}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-foreground">{stock.price}</p>
                  <p className="text-sm font-medium text-success">{stock.change}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="text-sm text-foreground">{stock.volume}</p>
                </div>

                <div className="flex flex-col items-end gap-1 min-w-[140px]">
                  {analyzingStocks ? (
                    <Skeleton className="h-5 w-16" />
                  ) : rec ? (
                    <>
                      <Badge 
                        variant={rec.recommendation === "BUY" ? "default" : "secondary"}
                        className={rec.recommendation === "BUY" ? "bg-success text-success-foreground" : ""}
                      >
                        {rec.recommendation}
                      </Badge>
                      <p className="text-xs text-muted-foreground text-right">{rec.reason}</p>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
