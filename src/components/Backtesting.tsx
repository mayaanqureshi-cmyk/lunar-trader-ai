import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LineChart, Plus, Play, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Strategy {
  id: string;
  name: string;
  description: string;
  buy_condition: string;
  sell_condition: string;
  initial_capital: number;
}

interface BacktestResult {
  id: string;
  symbol: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_profit_loss: number;
  return_percentage: number;
  max_drawdown: number;
  win_rate: number;
  start_date: string;
  end_date: string;
}

export const Backtesting = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    buy_condition: "5",
    sell_condition: "10",
    initial_capital: "10000",
  });

  const [testParams, setTestParams] = useState({
    strategyId: "",
    symbol: "AAPL",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  });

  useEffect(() => {
    fetchStrategies();
    fetchResults();
  }, []);

  const fetchStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from("backtest_strategies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error("Error fetching strategies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from("backtest_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase.from("backtest_strategies").insert({
        name: formData.name,
        description: formData.description,
        buy_condition: formData.buy_condition,
        sell_condition: formData.sell_condition,
        initial_capital: parseFloat(formData.initial_capital),
      }).select().single();

      if (error) throw error;

      toast({
        title: "Strategy Created",
        description: `Strategy "${formData.name}" has been created`,
      });

      setFormData({
        name: "",
        description: "",
        buy_condition: "5",
        sell_condition: "10",
        initial_capital: "10000",
      });
      setShowCreateForm(false);
      fetchStrategies();
    } catch (error) {
      console.error("Error creating strategy:", error);
      toast({
        title: "Error",
        description: "Failed to create strategy",
        variant: "destructive",
      });
    }
  };

  const handleRunBacktest = async () => {
    if (!testParams.strategyId) {
      toast({
        title: "Error",
        description: "Please select a strategy",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-backtest", {
        body: testParams,
      });

      if (error) throw error;

      toast({
        title: "Backtest Complete",
        description: `Ran ${data.result.total_trades} trades with ${data.result.return_percentage.toFixed(2)}% return`,
      });

      fetchResults();
    } catch (error) {
      console.error("Error running backtest:", error);
      toast({
        title: "Error",
        description: "Failed to run backtest",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Backtesting</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Create Strategy Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateStrategy} className="mb-6 p-4 rounded-lg bg-secondary/50 border border-border space-y-4">
              <div>
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Trading Strategy"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your strategy..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buy_condition">Buy Threshold (%)</Label>
                  <Input
                    id="buy_condition"
                    type="number"
                    step="0.1"
                    value={formData.buy_condition}
                    onChange={(e) => setFormData({ ...formData, buy_condition: e.target.value })}
                    placeholder="5"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Buy when price drops by this %</p>
                </div>
                <div>
                  <Label htmlFor="sell_condition">Sell Threshold (%)</Label>
                  <Input
                    id="sell_condition"
                    type="number"
                    step="0.1"
                    value={formData.sell_condition}
                    onChange={(e) => setFormData({ ...formData, sell_condition: e.target.value })}
                    placeholder="10"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sell when price gains by this %</p>
                </div>
              </div>
              <div>
                <Label htmlFor="initial_capital">Initial Capital ($)</Label>
                <Input
                  id="initial_capital"
                  type="number"
                  value={formData.initial_capital}
                  onChange={(e) => setFormData({ ...formData, initial_capital: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Strategy</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Strategies List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Strategies</h3>
            {strategies.length > 0 ? (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        testParams.strategyId === strategy.id
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/50 border-border hover:bg-secondary/70"
                      }`}
                      onClick={() => setTestParams({ ...testParams, strategyId: strategy.id })}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-foreground">{strategy.name}</span>
                        <Badge variant="outline">${strategy.initial_capital}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{strategy.description}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-muted-foreground">Buy: -{strategy.buy_condition}%</span>
                        <span className="text-muted-foreground">Sell: +{strategy.sell_condition}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No strategies yet. Create one to start backtesting.
              </p>
            )}
          </div>

          {/* Run Backtest */}
          <div className="mb-6 p-4 rounded-lg bg-secondary/50 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Run Backtest</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={testParams.symbol}
                  onChange={(e) => setTestParams({ ...testParams, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={testParams.startDate}
                  onChange={(e) => setTestParams({ ...testParams, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={testParams.endDate}
                  onChange={(e) => setTestParams({ ...testParams, endDate: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleRunBacktest} disabled={isRunning || !testParams.strategyId}>
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Running..." : "Run Backtest"}
            </Button>
          </div>

          {/* Results */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Results</h3>
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{result.symbol}</span>
                        <Badge
                          variant="outline"
                          className={
                            result.return_percentage >= 0
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-danger/10 text-danger border-danger/20"
                          }
                        >
                          {result.return_percentage.toFixed(2)}%
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.start_date).toLocaleDateString()} - {new Date(result.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Trades</p>
                        <p className="font-semibold text-foreground">{result.total_trades}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="font-semibold text-foreground">{result.win_rate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">P/L</p>
                        <p
                          className={`font-semibold ${
                            result.total_profit_loss >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          ${result.total_profit_loss.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max DD</p>
                        <p className="font-semibold text-danger">
                          {result.max_drawdown.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No results yet. Run a backtest to see results.
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
};
