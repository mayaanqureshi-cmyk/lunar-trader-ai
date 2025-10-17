import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PaperStock {
  id: string;
  symbol: string;
  name: string;
  purchase_price: number;
  quantity: number;
  purchase_date: string;
  current_price?: number;
  current_value?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
}

interface PaperTrade {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  total_value: number;
  profit_loss: number | null;
  trade_date: string;
}

export const PaperTrading = () => {
  const [portfolio, setPortfolio] = useState<PaperStock[]>([]);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalProfitLoss, setTotalProfitLoss] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaperPortfolio();
    fetchPaperTrades();
  }, []);

  const fetchPaperPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from("paper_portfolio")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch current prices for all stocks
      if (data && data.length > 0) {
        const symbols = data.map((s) => s.symbol).join(",");
        const priceResponse = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
        );
        const priceData = await priceResponse.json();
        const quotes = priceData.quoteResponse.quotes;

        const enrichedPortfolio = data.map((stock) => {
          const quote = quotes.find((q: any) => q.symbol === stock.symbol);
          const currentPrice = quote?.regularMarketPrice || stock.purchase_price;
          const currentValue = currentPrice * stock.quantity;
          const costBasis = stock.purchase_price * stock.quantity;
          const profitLoss = currentValue - costBasis;
          const profitLossPercent = (profitLoss / costBasis) * 100;

          return {
            ...stock,
            current_price: currentPrice,
            current_value: currentValue,
            profit_loss: profitLoss,
            profit_loss_percent: profitLossPercent,
          };
        });

        setPortfolio(enrichedPortfolio);

        const total = enrichedPortfolio.reduce((sum, s) => sum + (s.current_value || 0), 0);
        const pl = enrichedPortfolio.reduce((sum, s) => sum + (s.profit_loss || 0), 0);
        setTotalValue(total);
        setTotalProfitLoss(pl);
      } else {
        setPortfolio([]);
      }
    } catch (error) {
      console.error("Error fetching paper portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to load paper portfolio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaperTrades = async () => {
    try {
      const { data, error } = await supabase
        .from("paper_trades")
        .select("*")
        .order("trade_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error("Error fetching paper trades:", error);
    }
  };

  const handleSell = async (stock: PaperStock) => {
    try {
      const profitLoss = (stock.current_price! - stock.purchase_price) * stock.quantity;
      
      // Record the trade
      const { error: tradeError } = await supabase.from("paper_trades").insert({
        symbol: stock.symbol,
        action: "sell",
        quantity: stock.quantity,
        price: stock.current_price,
        total_value: stock.current_value,
        profit_loss: profitLoss,
      });

      if (tradeError) throw tradeError;

      // Remove from portfolio
      const { error: deleteError } = await supabase
        .from("paper_portfolio")
        .delete()
        .eq("id", stock.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Trade Executed",
        description: `Sold ${stock.quantity} shares of ${stock.symbol}`,
      });

      fetchPaperPortfolio();
      fetchPaperTrades();
    } catch (error) {
      console.error("Error selling stock:", error);
      toast({
        title: "Error",
        description: "Failed to execute trade",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Paper Trading</h2>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Practice Mode
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Portfolio Value</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${totalValue.toFixed(2)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                {totalProfitLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-danger" />
                )}
                <span className="text-xs text-muted-foreground">Total P/L</span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  totalProfitLoss >= 0 ? "text-success" : "text-danger"
                }`}
              >
                ${totalProfitLoss.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Portfolio */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Paper Positions</h3>
            {portfolio.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {portfolio.map((stock) => (
                    <div
                      key={stock.id}
                      className="p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold text-foreground">{stock.symbol}</span>
                          <p className="text-xs text-muted-foreground">{stock.name}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSell(stock)}
                        >
                          Sell
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Qty</p>
                          <p className="font-semibold text-foreground">{stock.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-semibold text-foreground">
                            ${stock.current_price?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">P/L</p>
                          <p
                            className={`font-semibold ${
                              stock.profit_loss! >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            ${stock.profit_loss?.toFixed(2)} (
                            {stock.profit_loss_percent?.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No paper positions yet. Start by adding stocks to your paper portfolio.
              </p>
            )}
          </div>

          {/* Recent Trades */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Trades</h3>
            {trades.length > 0 ? (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="p-3 rounded-lg bg-secondary/50 border border-border text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              trade.action === "buy"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-danger/10 text-danger border-danger/20"
                            }
                          >
                            {trade.action.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-foreground">{trade.symbol}</span>
                          <span className="text-muted-foreground">
                            {trade.quantity} @ ${trade.price.toFixed(2)}
                          </span>
                        </div>
                        {trade.profit_loss !== null && (
                          <span
                            className={`font-semibold ${
                              trade.profit_loss >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            ${trade.profit_loss.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No trades yet
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
};
