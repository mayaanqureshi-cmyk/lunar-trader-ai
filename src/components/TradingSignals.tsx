import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";

const mockSignals = [
  { 
    type: "buy", 
    symbol: "NVDA", 
    action: "Strong Buy", 
    target: "$525", 
    timeframe: "1-2 weeks",
    confidence: "High",
    reason: "Earnings beat + AI sector momentum"
  },
  { 
    type: "buy", 
    symbol: "TSLA", 
    action: "Buy", 
    target: "$265", 
    timeframe: "2-3 weeks",
    confidence: "Medium",
    reason: "Technical breakout + delivery numbers"
  },
  { 
    type: "sell", 
    symbol: "XYZ", 
    action: "Take Profit", 
    target: "$180", 
    timeframe: "1 week",
    confidence: "High",
    reason: "Resistance level reached + overbought"
  },
];

export const TradingSignals = () => {
  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">AI Trading Signals</h2>
      </div>

      <div className="space-y-4">
        {mockSignals.map((signal, index) => (
          <div 
            key={index}
            className={`p-5 rounded-lg border-l-4 ${
              signal.type === 'buy' 
                ? 'bg-success/10 border-success' 
                : 'bg-danger/10 border-danger'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  signal.type === 'buy' ? 'bg-success/20' : 'bg-danger/20'
                }`}>
                  {signal.type === 'buy' 
                    ? <ArrowUpRight className="h-5 w-5 text-success" />
                    : <ArrowDownRight className="h-5 w-5 text-danger" />
                  }
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{signal.symbol}</p>
                  <p className={`text-sm font-medium ${
                    signal.type === 'buy' ? 'text-success' : 'text-danger'
                  }`}>
                    {signal.action}
                  </p>
                </div>
              </div>
              <Badge variant={signal.confidence === "High" ? "default" : "secondary"}>
                {signal.confidence}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Target Price</p>
                <p className="font-semibold text-foreground">{signal.target}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Timeframe</p>
                <p className="font-semibold text-foreground">{signal.timeframe}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">{signal.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
