import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp, TrendingDown, Trash2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioStock {
  id: string;
  symbol: string;
  name: string;
  purchase_price: number;
  quantity: number;
  purchase_date: string;
}

interface PortfolioListProps {
  portfolio: PortfolioStock[];
  isLoading: boolean;
  onRemove: (id: string) => Promise<void>;
}

export const PortfolioList = ({ portfolio, isLoading, onRemove }: PortfolioListProps) => {
  const [enrichedPortfolio, setEnrichedPortfolio] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCurrentPrices = async () => {
    if (portfolio.length === 0) return;

    setIsRefreshing(true);
    try {
      const symbols = portfolio.map(stock => stock.symbol);
      const { data } = await supabase.functions.invoke('fetch-stock-data', {
        body: { type: 'quotes', symbols }
      });

      if (data?.data) {
        const enriched = portfolio.map(stock => {
          const quote = data.data.find((q: any) => q.symbol === stock.symbol);
          if (quote) {
            const currentPrice = parseFloat(quote.price);
            const costBasis = stock.purchase_price * stock.quantity;
            const currentValue = currentPrice * stock.quantity;
            const gainPercent = ((currentValue - costBasis) / costBasis) * 100;

            return {
              ...stock,
              current_price: currentPrice,
              current_value: currentValue,
              current_gain_percent: gainPercent,
            };
          }
          return stock;
        });

        setEnrichedPortfolio(enriched);
      }
    } catch (error) {
      console.error('Error fetching current prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentPrices();
    const interval = setInterval(fetchCurrentPrices, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [portfolio]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border shadow-card">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (portfolio.length === 0) {
    return (
      <Card className="p-6 bg-card border-border shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Your Portfolio</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No stocks in your portfolio yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Add stocks above to start tracking!</p>
        </div>
      </Card>
    );
  }

  const totalValue = enrichedPortfolio.reduce((sum, stock) => 
    sum + (stock.current_value || stock.purchase_price * stock.quantity), 0
  );
  
  const totalCost = enrichedPortfolio.reduce((sum, stock) => 
    sum + (stock.purchase_price * stock.quantity), 0
  );
  
  const totalGainPercent = ((totalValue - totalCost) / totalCost) * 100;

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Your Portfolio</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCurrentPrices}
          disabled={isRefreshing}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-secondary/50">
        <div>
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-xl font-bold text-foreground">${totalValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Gain</p>
          <p className={`text-xl font-bold ${totalGainPercent >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-3">
        {enrichedPortfolio.map((stock) => {
          const isGain = (stock.current_gain_percent || 0) >= 0;
          
          return (
            <div
              key={stock.id}
              className="p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{stock.symbol}</h3>
                    {stock.current_gain_percent && (
                      <Badge variant={isGain ? "default" : "destructive"}>
                        {isGain ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {isGain ? '+' : ''}{stock.current_gain_percent.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stock.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(stock.id)}
                  className="text-danger hover:text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-semibold text-foreground">{stock.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Purchase Price</p>
                  <p className="font-semibold text-foreground">${stock.purchase_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <p className="font-semibold text-foreground">
                    {stock.current_price ? `$${stock.current_price.toFixed(2)}` : 'Loading...'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Value</p>
                  <p className={`font-semibold ${isGain ? 'text-success' : 'text-danger'}`}>
                    {stock.current_value ? `$${stock.current_value.toFixed(2)}` : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
