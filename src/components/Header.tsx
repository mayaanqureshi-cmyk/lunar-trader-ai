import { TrendingUp, Activity } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TradeBot AI</h1>
              <p className="text-xs text-muted-foreground">Intelligent Trading Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm px-3 py-1.5 bg-success/10 rounded-full border border-success/20">
              <Activity className="h-4 w-4 text-success animate-pulse" />
              <span className="text-success font-medium">Live Data</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
