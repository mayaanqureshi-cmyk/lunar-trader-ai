import { TrendingUp, Activity } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">TradeBot</h1>
              <p className="text-xs text-muted-foreground">Trading Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm px-3 py-1.5 bg-success/10 rounded-full border border-success/20">
              <Activity className="h-3.5 w-3.5 text-success animate-pulse" />
              <span className="text-success font-medium text-xs">Live</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
