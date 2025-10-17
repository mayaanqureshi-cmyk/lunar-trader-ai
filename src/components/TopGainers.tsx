import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const mockGainers = [
  { symbol: "NVDA", name: "NVIDIA Corp", price: "$487.32", change: "+8.45%", volume: "52.3M" },
  { symbol: "TSLA", name: "Tesla Inc", price: "$242.18", change: "+6.82%", volume: "124.5M" },
  { symbol: "AMD", name: "Advanced Micro", price: "$145.67", change: "+5.23%", volume: "78.2M" },
  { symbol: "META", name: "Meta Platforms", price: "$512.45", change: "+4.91%", volume: "45.8M" },
  { symbol: "AAPL", name: "Apple Inc", price: "$178.23", change: "+3.67%", volume: "89.4M" },
];

export const TopGainers = () => {
  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-success" />
        <h2 className="text-lg font-bold text-foreground">Top Daily Gainers</h2>
      </div>
      
      <div className="space-y-3">
        {mockGainers.map((stock, index) => (
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
    </Card>
  );
};
