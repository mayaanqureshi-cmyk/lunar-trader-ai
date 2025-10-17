import { Card } from "@/components/ui/card";
import { TrendingUp, RefreshCw, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockData } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const WeeklyGainers = () => {
  const { gainers, isLoading, refetch } = useStockData();

  // Calculate potential profit for $2,000 monthly goal
  const calculateProfit = (priceStr: string, changeStr: string) => {
    const price = parseFloat(priceStr.replace('$', ''));
    const change = parseFloat(changeStr.replace(/[+%]/g, ''));
    
    // If you bought $100 worth and it gained this much, what would you make?
    const investment = 100;
    const shares = investment / price;
    const profit = shares * price * (change / 100);
    
    return profit;
  };

  const targetMonthlyGoal = 2000;
  const weeksInMonth = 4;
  const weeklyGoal = targetMonthlyGoal / weeksInMonth;

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          <h2 className="text-lg font-bold text-foreground">Top Weekly Gainers</h2>
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

      {/* Goal Tracker */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-success border border-success/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success-foreground" />
            <span className="font-bold text-success-foreground">Monthly Goal</span>
          </div>
          <Badge className="bg-success-foreground text-success">
            ${targetMonthlyGoal}/month
          </Badge>
        </div>
        <p className="text-sm text-success-foreground/80">
          Target: ${weeklyGoal}/week to reach your goal
        </p>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {gainers.map((stock, index) => {
            const potentialProfit = calculateProfit(stock.price, stock.change);
            const percentOfWeeklyGoal = (potentialProfit / weeklyGoal) * 100;

            return (
              <div 
                key={stock.symbol}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-all duration-200 border border-border"
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

                <div className="text-right border-l border-border pl-4">
                  <p className="text-xs text-muted-foreground">Profit on $100</p>
                  <p className="text-lg font-bold text-success">
                    ${potentialProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {percentOfWeeklyGoal.toFixed(1)}% of weekly goal
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Investment Calculator */}
      <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <h3 className="font-bold text-foreground mb-2">💡 Weekly Strategy</h3>
        <p className="text-sm text-muted-foreground mb-3">
          To hit ${weeklyGoal}/week, you need to identify stocks that can gain significantly within 7 days.
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded bg-secondary/50">
            <p className="text-xs text-muted-foreground">Conservative</p>
            <p className="font-bold text-foreground">5% gain</p>
            <p className="text-xs text-muted-foreground">Need ${(weeklyGoal / 0.05).toFixed(0)} invested</p>
          </div>
          <div className="p-2 rounded bg-secondary/50">
            <p className="text-xs text-muted-foreground">Moderate</p>
            <p className="font-bold text-foreground">10% gain</p>
            <p className="text-xs text-muted-foreground">Need ${(weeklyGoal / 0.10).toFixed(0)} invested</p>
          </div>
          <div className="p-2 rounded bg-secondary/50">
            <p className="text-xs text-muted-foreground">Aggressive</p>
            <p className="font-bold text-foreground">20% gain</p>
            <p className="text-xs text-muted-foreground">Need ${(weeklyGoal / 0.20).toFixed(0)} invested</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
