import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, TrendingUp, DollarSign, ShieldCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TradeOrder {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  status: string;
  filled_at: string | null;
  filled_avg_price: string | null;
}

export const AlpacaAutoTrading = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState("100");
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const handleToggleAutoTrading = () => {
    setIsEnabled(!isEnabled);
    toast({
      title: isEnabled ? "Auto-Trading Disabled" : "Auto-Trading Enabled",
      description: isEnabled 
        ? "The system will no longer execute trades automatically" 
        : "The system will now execute AI-recommended trades automatically",
    });
  };

  const executeTestTrade = async () => {
    setIsExecuting(true);
    try {
      toast({
        title: "Executing Trade",
        description: "Placing order on Alpaca...",
      });

      const { data, error } = await supabase.functions.invoke('execute-alpaca-trade', {
        body: {
          symbol: 'AAPL',
          action: 'buy',
          quantity: 1,
          orderType: 'market'
        }
      });

      if (error) throw error;

      if (data.success) {
        setOrders([data.order, ...orders]);
        toast({
          title: "Trade Executed Successfully",
          description: `${data.order.side.toUpperCase()} ${data.order.quantity} ${data.order.symbol} - Status: ${data.order.status}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error executing trade:", error);
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "Failed to execute trade",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Alpaca Auto-Trading</h2>
              <p className="text-sm text-muted-foreground">Automated trade execution with AI signals</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={isEnabled ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}
          >
            {isEnabled ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold text-foreground">Alpaca Connected</p>
            </div>
            <p className="text-xs text-muted-foreground">Paper trading account active</p>
          </Card>
          
          <Card className="p-4 bg-secondary/50 border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Buying Power</p>
            </div>
            <p className="text-xs text-muted-foreground">Check account for balance</p>
          </Card>

          <Card className="p-4 bg-secondary/50 border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Orders Today</p>
            </div>
            <p className="text-xs text-muted-foreground">{orders.length} executed</p>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-sm font-semibold text-foreground">Enable Auto-Trading</Label>
                <p className="text-xs text-muted-foreground">Execute trades automatically based on AI signals</p>
              </div>
            </div>
            <Switch 
              checked={isEnabled} 
              onCheckedChange={handleToggleAutoTrading}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Max Position Size (shares)</Label>
            <Input 
              type="number"
              value={maxPositionSize}
              onChange={(e) => setMaxPositionSize(e.target.value)}
              placeholder="100"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">Maximum number of shares per trade</p>
          </div>

          <Button 
            onClick={executeTestTrade}
            disabled={isExecuting}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isExecuting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Executing Trade...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Execute Test Trade (AAPL)
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Trade History */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Orders
        </h3>
        
        {orders.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="p-4 bg-secondary/30 border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{order.symbol}</span>
                      <Badge variant={order.side === 'buy' ? 'default' : 'secondary'}>
                        {order.side.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge 
                      variant="outline"
                      className={order.status === 'filled' 
                        ? 'bg-success/10 text-success border-success/20' 
                        : 'bg-warning/10 text-warning border-warning/20'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="text-foreground font-semibold">{order.quantity} shares</p>
                    </div>
                    {order.filled_avg_price && (
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Price</p>
                        <p className="text-foreground font-semibold">${order.filled_avg_price}</p>
                      </div>
                    )}
                  </div>
                  {order.filled_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Filled at: {new Date(order.filled_at).toLocaleString()}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No orders executed yet</p>
          </div>
        )}
      </Card>

      {/* Risk Disclaimer */}
      <Card className="p-4 bg-warning/10 border-warning/20">
        <div className="flex items-start gap-2">
          <XCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Important Notice</p>
            <p className="text-xs text-muted-foreground">
              This is connected to Alpaca's paper trading account for testing. No real money is being used. 
              Before going live with real money, thoroughly test your strategies and understand the risks involved.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
