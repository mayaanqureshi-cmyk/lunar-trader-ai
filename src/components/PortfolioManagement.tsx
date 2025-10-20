import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Activity,
  RefreshCw,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Position {
  symbol: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

interface AccountData {
  status: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  daytrade_count: number;
}

export const PortfolioManagement = () => {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPortfolioData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-alpaca-account');

      if (error) throw error;

      if (data.success) {
        setAccount(data.account);
        setPositions(data.positions);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to fetch portfolio data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const totalPL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl), 0);
  const totalPLPercent = account ? 
    ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Portfolio Overview</h2>
              <p className="text-sm text-muted-foreground">Real-time Alpaca account data</p>
            </div>
          </div>
          <Button
            onClick={fetchPortfolioData}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading && !account ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading portfolio data...</p>
          </div>
        ) : account ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Portfolio Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${parseFloat(account.portfolio_value).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {totalPLPercent >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-danger" />
                  )}
                  <span className={`text-sm font-semibold ${totalPLPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                    {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
                  </span>
                </div>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border">
                <p className="text-xs text-muted-foreground mb-1">Buying Power</p>
                <p className="text-2xl font-bold text-foreground">
                  ${parseFloat(account.buying_power).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Available to trade</p>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border">
                <p className="text-xs text-muted-foreground mb-1">Cash</p>
                <p className="text-2xl font-bold text-foreground">
                  ${parseFloat(account.cash).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Uninvested</p>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border">
                <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                <p className={`text-2xl font-bold ${totalPL >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalPL >= 0 ? '+' : ''}${Math.abs(totalPL).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Unrealized</p>
              </Card>
            </div>

            {/* Account Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-secondary/30 border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Account Status</p>
                </div>
                <Badge variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {account.status}
                </Badge>
              </Card>

              <Card className="p-4 bg-secondary/30 border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Day Trades</p>
                </div>
                <p className="text-lg font-bold text-foreground">{account.daytrade_count} / 3</p>
              </Card>

              <Card className="p-4 bg-secondary/30 border-border">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Open Positions</p>
                </div>
                <p className="text-lg font-bold text-foreground">{positions.length}</p>
              </Card>
            </div>
          </>
        ) : null}
      </Card>

      {/* Positions */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Current Positions ({positions.length})
        </h3>

        {positions.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {positions.map((position) => {
                const plPercent = parseFloat(position.unrealized_plpc) * 100;
                const pl = parseFloat(position.unrealized_pl);
                
                return (
                  <Card key={position.symbol} className="p-4 bg-secondary/30 border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-foreground">{position.symbol}</span>
                        <Badge variant={position.side === 'long' ? 'default' : 'secondary'}>
                          {position.side.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pl >= 0 ? '+' : ''}${Math.abs(pl).toFixed(2)}
                        </p>
                        <p className={`text-sm ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                          ({pl >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Quantity</p>
                        <p className="text-foreground font-semibold">{position.qty} shares</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current Price</p>
                        <p className="text-foreground font-semibold">${parseFloat(position.current_price).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Cost</p>
                        <p className="text-foreground font-semibold">
                          ${(parseFloat(position.cost_basis) / parseFloat(position.qty)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Value</p>
                        <p className="text-foreground font-semibold">${parseFloat(position.market_value).toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12">
            <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No open positions</p>
          </div>
        )}
      </Card>
    </div>
  );
};