import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingDown, AlertCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TradingSignal {
  id: string;
  signal_type: string;
  current_price: number;
  price_change_percent: number;
  current_gain_percent: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface TradingNotificationsProps {
  signals: TradingSignal[];
  isLoading: boolean;
  onDismiss: (id: string) => Promise<void>;
}

export const TradingNotifications = ({ signals, isLoading, onDismiss }: TradingNotificationsProps) => {
  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border shadow-card">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Trading Alerts</h2>
        {signals.length > 0 && (
          <Badge variant="destructive" className="ml-2">
            {signals.length}
          </Badge>
        )}
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No active alerts</p>
          <p className="text-sm text-muted-foreground mt-2">
            We'll notify you when your stocks hit important thresholds
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => {
            const isSellSignal = signal.signal_type === 'sell_signal';
            
            return (
              <div
                key={signal.id}
                className={`p-4 rounded-lg border-l-4 ${
                  isSellSignal
                    ? 'bg-success/10 border-success'
                    : 'bg-danger/10 border-danger'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isSellSignal ? (
                      <TrendingDown className="h-5 w-5 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-danger" />
                    )}
                    <span className={`font-bold ${isSellSignal ? 'text-success' : 'text-danger'}`}>
                      {isSellSignal ? 'SELL SIGNAL' : 'PRICE ALERT'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(signal.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-foreground mb-2">{signal.message}</p>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Current: ${signal.current_price.toFixed(2)}</span>
                  <span>Change: {signal.price_change_percent.toFixed(2)}%</span>
                  {signal.current_gain_percent !== null && (
                    <span className="text-success">
                      Gain: +{signal.current_gain_percent.toFixed(2)}%
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(signal.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
