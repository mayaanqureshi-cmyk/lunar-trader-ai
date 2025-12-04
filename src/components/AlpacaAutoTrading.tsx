import { useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface AlpacaAutoTradingProps {
  onAutoTradingChange: (enabled: boolean) => void;
  onMaxPositionSizeChange: (size: number) => void;
}

export const AlpacaAutoTrading = ({ onAutoTradingChange, onMaxPositionSizeChange }: AlpacaAutoTradingProps) => {
  const [isEnabled, setIsEnabled] = useLocalStorage('autoTradingEnabled', false);
  const [maxPositionSize, setMaxPositionSize] = useLocalStorage('maxPositionSize', 100);
  const [minConfidence, setMinConfidence] = useLocalStorage('minConfidence', 0.7);
  const [stopLossPercent, setStopLossPercent] = useLocalStorage('stopLossPercent', 2);
  const [takeProfitPercent, setTakeProfitPercent] = useLocalStorage('takeProfitPercent', 6);

  useEffect(() => {
    onAutoTradingChange(isEnabled);
  }, [isEnabled, onAutoTradingChange]);

  useEffect(() => {
    onMaxPositionSizeChange(maxPositionSize);
  }, [maxPositionSize, onMaxPositionSizeChange]);

  const handleToggle = useCallback((checked: boolean) => {
    setIsEnabled(checked);
    toast({
      title: checked ? "AUTO-TRADE ENABLED" : "AUTO-TRADE DISABLED",
      description: checked 
        ? "System will execute trades automatically" 
        : "Manual mode active",
    });
  }, [setIsEnabled]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-2 border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-label">AUTOMATION</p>
            <h2 className="text-2xl font-bold mt-1">AUTO-TRADE</h2>
          </div>
          <div className={`px-4 py-2 border-2 ${isEnabled ? 'border-success bg-success/10 text-success' : 'border-border text-muted-foreground'}`}>
            <span className="text-xs font-bold">{isEnabled ? 'ACTIVE' : 'INACTIVE'}</span>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 border-2 border-border bg-secondary/30">
          <div>
            <Label className="text-sm font-bold">ENABLE AUTO-TRADING</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Execute trades automatically based on AI signals
            </p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* Settings Grid */}
      <div className="data-grid grid-cols-2">
        <div className="space-y-3">
          <Label className="text-label">MAX POSITION ($)</Label>
          <Input
            type="number"
            min="10"
            max="10000"
            value={maxPositionSize}
            onChange={(e) => setMaxPositionSize(Number(e.target.value))}
            disabled={!isEnabled}
            className="bg-background border-2 font-bold"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-label">MIN CONFIDENCE</Label>
          <div className="flex items-center gap-3">
            <Input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              disabled={!isEnabled}
              className="flex-1"
            />
            <span className="text-sm font-bold w-12">{(minConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-label">STOP LOSS (%)</Label>
          <Input
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            value={stopLossPercent}
            onChange={(e) => setStopLossPercent(Number(e.target.value))}
            disabled={!isEnabled}
            className="bg-background border-2 font-bold"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-label">TAKE PROFIT (%)</Label>
          <Input
            type="number"
            min="1"
            max="50"
            step="1"
            value={takeProfitPercent}
            onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
            disabled={!isEnabled}
            className="bg-background border-2 font-bold"
          />
        </div>
      </div>

      {/* Warning */}
      {isEnabled && (
        <div className="border-2 border-warning bg-warning/10 p-4">
          <p className="text-warning text-xs font-bold">⚠ AUTO-TRADING ACTIVE</p>
          <p className="text-sm text-foreground mt-2">
            System will automatically execute trades on your Alpaca account. Monitor positions regularly.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="data-grid grid-cols-3">
        <div className="text-center">
          <p className="text-value text-primary">0</p>
          <p className="text-label mt-1">TRADES TODAY</p>
        </div>
        <div className="text-center">
          <p className="text-value text-success">0%</p>
          <p className="text-label mt-1">WIN RATE</p>
        </div>
        <div className="text-center">
          <p className="text-value">$0</p>
          <p className="text-label mt-1">TOTAL P/L</p>
        </div>
      </div>
    </div>
  );
};
