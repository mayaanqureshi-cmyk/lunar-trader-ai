import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Shield,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const EnhancedOrderEntry = () => {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleExecuteTrade = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to execute trades",
        variant: "destructive",
      });
      return;
    }

    if (!symbol || !quantity) {
      toast({
        title: "Missing Information",
        description: "Please enter symbol and quantity",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "limit" && !limitPrice) {
      toast({
        title: "Limit Price Required",
        description: "Please enter a limit price",
        variant: "destructive",
      });
      return;
    }

    if ((orderType === "stop" || orderType === "stop_limit") && !stopPrice) {
      toast({
        title: "Stop Price Required",
        description: "Please enter a stop price",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    try {
      const orderPayload: any = {
        symbol: symbol.toUpperCase(),
        action: side,
        quantity: parseInt(quantity),
        orderType,
      };

      if (orderType === "limit" || orderType === "stop_limit") {
        orderPayload.limitPrice = parseFloat(limitPrice);
      }

      if (orderType === "stop" || orderType === "stop_limit") {
        orderPayload.stopPrice = parseFloat(stopPrice);
      }

      const { data, error } = await supabase.functions.invoke('execute-alpaca-trade', {
        body: orderPayload
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Order Placed Successfully",
          description: `${side.toUpperCase()} ${quantity} ${symbol.toUpperCase()} - ${orderType.toUpperCase()}`,
        });

        // Reset form
        setSymbol("");
        setQuantity("1");
        setLimitPrice("");
        setStopPrice("");
        setStopLoss("");
        setTakeProfit("");
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
      setExecuting(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Enhanced Order Entry</h2>
          <p className="text-sm text-muted-foreground">Multiple order types with risk management</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Symbol & Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input
              placeholder="AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
            />
          </div>
        </div>

        {/* Side & Order Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Side</Label>
            <Select value={side} onValueChange={(value: "buy" | "sell") => setSide(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Buy
                  </div>
                </SelectItem>
                <SelectItem value="sell">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-danger" />
                    Sell
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
                <SelectItem value="stop_limit">Stop Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price Fields (conditional) */}
        {(orderType === "limit" || orderType === "stop_limit") && (
          <div className="space-y-2">
            <Label>
              <Target className="h-4 w-4 inline mr-2" />
              Limit Price
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              step="0.01"
            />
          </div>
        )}

        {(orderType === "stop" || orderType === "stop_limit") && (
          <div className="space-y-2">
            <Label>
              <Shield className="h-4 w-4 inline mr-2" />
              Stop Price
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              step="0.01"
            />
          </div>
        )}

        {/* Risk Management (Optional) */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">Risk Management (Optional)</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Stop Loss</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Take Profit</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Execute Button */}
        <Button
          onClick={handleExecuteTrade}
          disabled={executing || !symbol || !quantity}
          className="w-full bg-primary hover:bg-primary/90 h-12 text-lg"
        >
          {executing ? (
            <>
              <Zap className="mr-2 h-5 w-5 animate-pulse" />
              Executing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-5 w-5" />
              {side === "buy" ? "Buy" : "Sell"} {symbol || "Stock"}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};