import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Zap, AlertTriangle, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface AlpacaAutoTradingProps {
  onAutoTradingChange: (enabled: boolean) => void;
  onMaxPositionSizeChange: (size: number) => void;
}

export const AlpacaAutoTrading = ({ onAutoTradingChange, onMaxPositionSizeChange }: AlpacaAutoTradingProps) => {
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem('autoTradingEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [maxPositionSize, setMaxPositionSize] = useState(() => {
    const saved = localStorage.getItem('maxPositionSize');
    return saved ? Number(saved) : 100;
  });
  const [minConfidence, setMinConfidence] = useState(() => {
    const saved = localStorage.getItem('minConfidence');
    return saved ? Number(saved) : 0.7;
  });
  const [maxPortfolioRisk, setMaxPortfolioRisk] = useState(() => {
    const saved = localStorage.getItem('maxPortfolioRisk');
    return saved ? Number(saved) : 2;
  });
  const [useKellyCriterion, setUseKellyCriterion] = useState(() => {
    const saved = localStorage.getItem('useKellyCriterion');
    return saved ? JSON.parse(saved) : true;
  });
  const [stopLossPercent, setStopLossPercent] = useState(() => {
    const saved = localStorage.getItem('stopLossPercent');
    return saved ? Number(saved) : 2;
  });
  const [takeProfitPercent, setTakeProfitPercent] = useState(() => {
    const saved = localStorage.getItem('takeProfitPercent');
    return saved ? Number(saved) : 6;
  });

  useEffect(() => {
    localStorage.setItem('autoTradingEnabled', JSON.stringify(isEnabled));
    onAutoTradingChange(isEnabled);
  }, [isEnabled, onAutoTradingChange]);

  useEffect(() => {
    localStorage.setItem('maxPositionSize', String(maxPositionSize));
    onMaxPositionSizeChange(maxPositionSize);
  }, [maxPositionSize, onMaxPositionSizeChange]);

  useEffect(() => {
    localStorage.setItem('minConfidence', String(minConfidence));
  }, [minConfidence]);

  useEffect(() => {
    localStorage.setItem('maxPortfolioRisk', String(maxPortfolioRisk));
  }, [maxPortfolioRisk]);

  useEffect(() => {
    localStorage.setItem('useKellyCriterion', JSON.stringify(useKellyCriterion));
  }, [useKellyCriterion]);

  useEffect(() => {
    localStorage.setItem('stopLossPercent', String(stopLossPercent));
  }, [stopLossPercent]);

  useEffect(() => {
    localStorage.setItem('takeProfitPercent', String(takeProfitPercent));
  }, [takeProfitPercent]);

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    toast({
      title: checked ? "Auto-Trading Enabled" : "Auto-Trading Disabled",
      description: checked 
        ? "AI will now automatically execute trades based on signals" 
        : "AI signals will be shown but not executed",
    });
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">Auto-Trading</h2>
          <p className="text-sm text-muted-foreground">
            Automated trade execution powered by AI analysis
          </p>
        </div>
        <Badge variant={isEnabled ? "default" : "secondary"}>
          {isEnabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-trading" className="text-base font-semibold">
                Enable Auto-Trading
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to execute trades automatically
              </p>
            </div>
          </div>
          <Switch
            id="auto-trading"
            checked={isEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Configuration Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-position" className="text-sm font-semibold">
              Max Position Size ($)
            </Label>
            <Input
              id="max-position"
              type="number"
              min="10"
              max="10000"
              value={maxPositionSize}
              onChange={(e) => setMaxPositionSize(Number(e.target.value))}
              disabled={!isEnabled}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Maximum dollar amount per trade
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-confidence" className="text-sm font-semibold">
              Minimum Confidence Score
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="min-confidence"
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                disabled={!isEnabled}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[60px]">
                {(minConfidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Only execute trades with AI confidence above this threshold
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-risk" className="text-sm font-semibold">
              Max Portfolio Risk per Trade (%)
            </Label>
            <Input
              id="max-risk"
              type="number"
              min="0.5"
              max="5"
              step="0.5"
              value={maxPortfolioRisk}
              onChange={(e) => setMaxPortfolioRisk(Number(e.target.value))}
              disabled={!isEnabled}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Maximum % of portfolio to risk per trade (recommended: 1-2%)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="kelly" className="text-sm font-semibold">
                Use Kelly Criterion for Position Sizing
              </Label>
              <Switch
                id="kelly"
                checked={useKellyCriterion}
                onCheckedChange={setUseKellyCriterion}
                disabled={!isEnabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mathematically optimal position sizing based on win rate and R/R
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop-loss" className="text-sm font-semibold">
                Stop Loss (%)
              </Label>
              <Input
                id="stop-loss"
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(Number(e.target.value))}
                disabled={!isEnabled}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take-profit" className="text-sm font-semibold">
                Take Profit (%)
              </Label>
              <Input
                id="take-profit"
                type="number"
                min="1"
                max="50"
                step="1"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
                disabled={!isEnabled}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Warning */}
        {isEnabled && (
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Auto-Trading Active</p>
              <p className="text-muted-foreground mt-1">
                The system will automatically execute trades on your Alpaca account based on AI recommendations. 
                Monitor your positions regularly and ensure sufficient buying power.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">Trades Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">0%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">$0</p>
            <p className="text-xs text-muted-foreground">Total P/L</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
