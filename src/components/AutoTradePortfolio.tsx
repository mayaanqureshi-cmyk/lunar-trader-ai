import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Position {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
}

interface AccountData {
  portfolio_value: string;
  cash: string;
  buying_power: string;
  equity: string;
  last_equity: string;
}

export const AutoTradePortfolio = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPortfolio = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-alpaca-account');
      
      if (error) throw error;
      
      setPositions(data.positions || []);
      setAccountData(data.account || null);
      
      toast({
        title: "Portfolio Updated",
        description: "Successfully fetched latest portfolio data",
      });
    } catch (error: any) {
      console.error('Failed to fetch portfolio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load portfolio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellPosition = async (symbol: string, quantity: string) => {
    try {
      toast({
        title: "Selling Position",
        description: `Selling ${quantity} shares of ${symbol}...`,
      });
      
      const { data, error } = await supabase.functions.invoke('execute-alpaca-trade', {
        body: {
          symbol,
          action: 'sell',
          quantity: parseFloat(quantity),
          orderType: 'market',
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Position Sold",
          description: `Successfully sold ${quantity} shares of ${symbol}`,
        });
        fetchPortfolio(); // Refresh portfolio after sell
      } else {
        throw new Error(data.error || 'Failed to execute sell order');
      }
    } catch (error: any) {
      console.error('Error selling position:', error);
      toast({
        title: "Sell Failed",
        description: error.message || 'Failed to sell position',
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPortfolio();

    // Subscribe to real-time position updates
    const channel = supabase
      .channel('portfolio_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_trade_logs'
        },
        () => {
          // Refresh portfolio when new trades are executed
          fetchPortfolio();
        }
      )
      .subscribe();

    // Refresh every 30 seconds for live price updates
    const interval = setInterval(fetchPortfolio, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const totalUnrealizedPL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealized_pl), 0);
  const totalMarketValue = positions.reduce((sum, pos) => sum + parseFloat(pos.market_value), 0);

  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-2xl font-bold text-foreground">
                ${accountData ? parseFloat(accountData.portfolio_value).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <DollarSign className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash</p>
              <p className="text-2xl font-bold text-foreground">
                ${accountData ? parseFloat(accountData.cash).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-6 ${totalUnrealizedPL >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 ${totalUnrealizedPL >= 0 ? 'bg-success/20' : 'bg-destructive/20'} rounded-lg`}>
              {totalUnrealizedPL >= 0 ? (
                <TrendingUp className="h-6 w-6 text-success" />
              ) : (
                <TrendingDown className="h-6 w-6 text-destructive" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unrealized P/L</p>
              <p className={`text-2xl font-bold ${totalUnrealizedPL >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${totalUnrealizedPL.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <DollarSign className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buying Power</p>
              <p className="text-2xl font-bold text-foreground">
                ${accountData ? parseFloat(accountData.buying_power).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Positions Table */}
      <Card className="p-6 bg-card border-border shadow-card">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <CardTitle className="text-2xl">Current Positions</CardTitle>
              <CardDescription>
                Live positions from your auto-trading portfolio
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPortfolio}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No positions yet. Auto-trader will execute trades when opportunities are found.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-semibold">Symbol</TableHead>
                    <TableHead className="font-semibold text-right">Quantity</TableHead>
                    <TableHead className="font-semibold text-right">Average Entry</TableHead>
                    <TableHead className="font-semibold text-right">Current Price</TableHead>
                    <TableHead className="font-semibold text-right">Market Value</TableHead>
                    <TableHead className="font-semibold text-right">Cost Basis</TableHead>
                    <TableHead className="font-semibold text-right">P/L</TableHead>
                    <TableHead className="font-semibold text-right">P/L %</TableHead>
                    <TableHead className="font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => {
                    const pl = parseFloat(position.unrealized_pl);
                    const plpc = parseFloat(position.unrealized_plpc) * 100;
                    
                    return (
                      <TableRow key={position.symbol} className="hover:bg-secondary/20 transition-colors">
                        <TableCell className="font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            {position.symbol}
                            <Badge variant={position.side === 'long' ? 'default' : 'secondary'} className="text-xs">
                              {position.side}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-foreground">{position.qty}</TableCell>
                        <TableCell className="text-right text-foreground">
                          ${parseFloat(position.avg_entry_price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          ${parseFloat(position.current_price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          ${parseFloat(position.market_value).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${parseFloat(position.cost_basis).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${plpc >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {plpc >= 0 ? '+' : ''}{plpc.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSellPosition(position.symbol, position.qty)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Sell
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
