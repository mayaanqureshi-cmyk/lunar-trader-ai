import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

interface RobinhoodPosition {
  symbol: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  equity: number;
  percent_change: number;
  intraday_percent_change: number;
}

interface RobinhoodAccount {
  account_number: string;
  buying_power: number;
  cash: number;
  portfolio_cash: number;
}

export const RobinhoodPortfolio = () => {
  const [portfolio, setPortfolio] = useState<RobinhoodPosition[]>([]);
  const [account, setAccount] = useState<RobinhoodAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [orderQuantity, setOrderQuantity] = useState("");
  const { toast } = useToast();

  const fetchPortfolio = async (mfa?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('robinhood-api', {
        body: { action: 'get_portfolio', mfa_code: mfa }
      });

      if (error) {
        if (data?.mfa_required) {
          setNeedsMfa(true);
          toast({
            title: "2FA Required",
            description: "Please enter your Robinhood 2FA code",
          });
        } else {
          throw error;
        }
      } else {
        setPortfolio(data.portfolio || []);
        setNeedsMfa(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch Robinhood portfolio",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccount = async (mfa?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('robinhood-api', {
        body: { action: 'get_account', mfa_code: mfa }
      });

      if (!error && data?.account) {
        setAccount(data.account);
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  };

  const handleMfaSubmit = () => {
    if (mfaCode.length === 6) {
      fetchPortfolio(mfaCode);
      fetchAccount(mfaCode);
      setMfaCode("");
    }
  };

  const placeOrder = async (symbol: string, quantity: number, type: 'buy' | 'sell') => {
    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('robinhood-api', {
        body: {
          action: 'place_order',
          symbol,
          quantity,
          type,
          mfa_code: mfaCode || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Order Placed",
        description: `${type.toUpperCase()} order for ${quantity} shares of ${symbol} submitted`,
      });

      // Refresh portfolio
      await fetchPortfolio();
      await fetchAccount();
      setSelectedStock(null);
      setOrderQuantity("");
    } catch (error) {
      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchAccount();
  }, []);

  const totalValue = portfolio.reduce((sum, pos) => sum + pos.equity, 0);
  const totalGain = portfolio.reduce((sum, pos) => {
    const costBasis = pos.quantity * pos.average_buy_price;
    return sum + (pos.equity - costBasis);
  }, 0);
  const totalGainPercent = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Robinhood Portfolio</h2>
          <Button
            onClick={() => {
              fetchPortfolio();
              fetchAccount();
            }}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {needsMfa && (
          <div className="mb-6 p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Two-Factor Authentication Required</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <Button onClick={handleMfaSubmit} disabled={mfaCode.length !== 6}>
                Submit
              </Button>
            </div>
          </div>
        )}

        {account && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Buying Power
              </div>
              <div className="text-2xl font-bold">
                ${account.buying_power.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Portfolio Value</div>
              <div className="text-2xl font-bold">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                {totalGain >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                Total Gain/Loss
              </div>
              <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${Math.abs(totalGain).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-2">({totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {isLoading && !portfolio.length ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : portfolio.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No positions found
            </div>
          ) : (
            portfolio.map((position) => (
              <Card key={position.symbol} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-bold text-lg">{position.symbol}</h3>
                        <div className="text-sm text-muted-foreground">
                          {position.quantity} shares @ ${position.average_buy_price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-lg">
                      ${position.current_price.toFixed(2)}
                    </div>
                    <div className={`text-sm ${position.percent_change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {position.percent_change >= 0 ? '+' : ''}{position.percent_change.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <div className="font-bold text-lg">
                      ${position.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>

                  <div className="ml-4 flex gap-2">
                    {selectedStock === position.symbol ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(e.target.value)}
                          className="w-20"
                          min="1"
                          max={position.quantity}
                        />
                        <Button
                          onClick={() => placeOrder(position.symbol, parseInt(orderQuantity), 'sell')}
                          disabled={isLoading || !orderQuantity}
                          variant="destructive"
                          size="sm"
                        >
                          Sell
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedStock(null);
                            setOrderQuantity("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setSelectedStock(position.symbol)}
                        variant="outline"
                        size="sm"
                      >
                        Trade
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">⚠️ Important Disclaimer</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• This integration uses Robinhood's unofficial API and may break without notice</p>
          <p>• Trading carries significant financial risk - only trade what you can afford to lose</p>
          <p>• No safety checks are in place - orders execute immediately at market price</p>
          <p>• You are responsible for all trading decisions and their consequences</p>
          <p>• This is for educational purposes - consult a financial advisor before trading</p>
        </div>
      </Card>
    </div>
  );
};
