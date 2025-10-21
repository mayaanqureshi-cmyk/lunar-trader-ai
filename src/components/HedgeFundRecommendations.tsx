import { Card } from "@/components/ui/card";
import { Brain, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StockRecommendation {
  symbol: string;
  name: string;
  price: number;
  reason: string;
  risk: "low" | "medium" | "high";
  quantScore?: number;
  hedgeFundActivity?: string;
}

interface Recommendations {
  today: StockRecommendation[];
  one_week: StockRecommendation[];
  one_month: StockRecommendation[];
}

export const HedgeFundRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-stocks');

      if (error) throw error;
      
      if (data) {
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-success";
      case "medium": return "text-warning";
      case "high": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "low": return "default";
      case "medium": return "secondary";
      case "high": return "destructive";
      default: return "outline";
    }
  };

  const renderStockList = (stocks: StockRecommendation[]) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }

    if (!stocks || stocks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recommendations available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {stocks.map((stock, index) => (
          <div 
            key={stock.symbol}
            className="p-5 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-lg text-foreground">{stock.symbol}</p>
                    <Badge variant={getRiskBadgeVariant(stock.risk)} className="text-xs">
                      {stock.risk.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{stock.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">${stock.price.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-3 p-3 rounded-md bg-secondary/20 border border-border/50">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">{stock.reason}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-6 bg-card border border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Institutional & Quant Picks</h2>
            <p className="text-sm text-muted-foreground">Based on hedge fund activity and quantitative analysis</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchRecommendations}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="today" className="text-sm">
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="text-sm">
            This Week
          </TabsTrigger>
          <TabsTrigger value="month" className="text-sm">
            This Month
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="mt-0">
          {renderStockList(recommendations?.today || [])}
        </TabsContent>
        
        <TabsContent value="week" className="mt-0">
          {renderStockList(recommendations?.one_week || [])}
        </TabsContent>
        
        <TabsContent value="month" className="mt-0">
          {renderStockList(recommendations?.one_month || [])}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
