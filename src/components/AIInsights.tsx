import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, Calendar, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface StockRecommendation {
  symbol: string;
  name: string;
  price: number;
  reason: string;
  risk: "low" | "medium" | "high";
}

interface AIRecommendations {
  today: StockRecommendation[];
  one_week: StockRecommendation[];
  one_month: StockRecommendation[];
}

export const AIInsights = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-stocks');

      if (error) throw error;

      if (data) {
        setRecommendations(data);
        toast({
          title: "AI Analysis Complete",
          description: "Stock recommendations generated",
        });
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to get AI recommendations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'bg-success/10 text-success border-success/20';
      case 'high': return 'bg-danger/10 text-danger border-danger/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const renderStockList = (stocks: StockRecommendation[], title: string, icon: React.ReactNode) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3">
        {stocks.map((stock, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{stock.symbol}</span>
                  <Badge variant="outline" className={getRiskColor(stock.risk)}>
                    {stock.risk.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{stock.name}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">
                ${stock.price.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{stock.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">AI Trading Insights</h2>
        </div>
        <Button
          onClick={fetchRecommendations}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Analyzing...' : 'Get AI Recommendations'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : recommendations ? (
        <div className="space-y-6">
          {renderStockList(
            recommendations.today,
            "Buy Today (Day Trading)",
            <Clock className="h-4 w-4 text-primary" />
          )}
          
          {renderStockList(
            recommendations.one_week,
            "Buy This Week (Swing Trading)",
            <Calendar className="h-4 w-4 text-primary" />
          )}
          
          {renderStockList(
            recommendations.one_month,
            "Buy This Month (Position Trading)",
            <TrendingUp className="h-4 w-4 text-primary" />
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Get AI-powered stock recommendations</p>
          <p className="text-sm text-muted-foreground">
            AI analyzes market trends to recommend stocks for different time horizons
          </p>
        </div>
      )}
    </Card>
  );
};
