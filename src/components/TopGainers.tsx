import { Card } from "@/components/ui/card";
import { TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockData } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";

export const TopGainers = () => {
  const { gainers, isLoading, refetch } = useStockData();
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
          {gainers.map((stock, index) => (
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
          </div>
          ))}
        </div>
      )}
    </Card>
  );
};
