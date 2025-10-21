import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, TrendingUp, TrendingDown, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AIAnalysis {
  symbol: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  technicalSignals: string[];
  priceTarget: number | null;
  stopLoss: number | null;
}

interface AIStockAnalyzerProps {
  isAutoTradingEnabled: boolean;
  maxPositionSize: number;
}

export const AIStockAnalyzer = ({ isAutoTradingEnabled, maxPositionSize }: AIStockAnalyzerProps) => {
  const [symbol, setSymbol] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);

  const analyzeStock = async () => {
    if (!symbol.trim()) {
      toast({
        title: "Error",
        description: "Please enter a stock symbol",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-stocks", {
        body: { symbols: [symbol.toUpperCase()] },
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setAnalysis(data[0]);
        
        // Auto-execute if enabled and confidence is high
        if (isAutoTradingEnabled && data[0].confidence >= 0.7 && data[0].recommendation === "BUY") {
          await executeAutoTrade(data[0]);
        }
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze stock",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeAutoTrade = async (analysis: AIAnalysis) => {
    setIsExecutingTrade(true);
    
    try {
      const { data: accountData, error: accountError } = await supabase.functions.invoke(
        "fetch-alpaca-account"
      );

      if (accountError) throw accountError;

      const buyingPower = parseFloat(accountData.account.buying_power);
      const tradeAmount = Math.min(maxPositionSize, buyingPower * 0.1); // Use 10% of buying power or max position size
      
      const { error: tradeError } = await supabase.functions.invoke("execute-alpaca-trade", {
        body: {
          symbol: analysis.symbol,
          qty: Math.floor(tradeAmount / (analysis.priceTarget || 100)),
          side: "buy",
          type: "market",
        },
      });

      if (tradeError) throw tradeError;

      toast({
        title: "Auto-Trade Executed",
        description: `Bought ${analysis.symbol} - AI Confidence: ${(analysis.confidence * 100).toFixed(0)}%`,
      });
    } catch (error: any) {
      console.error("Auto-trade error:", error);
      toast({
        title: "Auto-Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecutingTrade(false);
    }
  };

  const manualExecuteTrade = async () => {
    if (!analysis) return;
    await executeAutoTrade(analysis);
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">AI Stock Analyzer</h2>
          <p className="text-sm text-muted-foreground">
            Advanced analysis powered by Google Gemini
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Enter stock symbol (e.g., AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === "Enter" && analyzeStock()}
          className="flex-1"
        />
        <Button onClick={analyzeStock} disabled={isAnalyzing || !symbol.trim()}>
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">{analysis.symbol}</div>
              {analysis.recommendation === "BUY" ? (
                <TrendingUp className="h-6 w-6 text-success" />
              ) : analysis.recommendation === "SELL" ? (
                <TrendingDown className="h-6 w-6 text-danger" />
              ) : null}
              <Badge
                variant={
                  analysis.recommendation === "BUY"
                    ? "default"
                    : analysis.recommendation === "SELL"
                    ? "destructive"
                    : "secondary"
                }
              >
                {analysis.recommendation}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Confidence</p>
              <p className="text-2xl font-bold text-primary">
                {(analysis.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="p-4 bg-background rounded-lg border border-border">
            <h3 className="font-semibold mb-2">AI Reasoning</h3>
            <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
          </div>

          {analysis.technicalSignals.length > 0 && (
            <div className="p-4 bg-background rounded-lg border border-border">
              <h3 className="font-semibold mb-2">Technical Signals</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.technicalSignals.map((signal, idx) => (
                  <Badge key={idx} variant="outline">
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(analysis.priceTarget || analysis.stopLoss) && (
            <div className="grid grid-cols-2 gap-4">
              {analysis.priceTarget && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                  <p className="text-xs text-muted-foreground mb-1">Price Target</p>
                  <p className="text-xl font-bold text-success">
                    ${analysis.priceTarget.toFixed(2)}
                  </p>
                </div>
              )}
              {analysis.stopLoss && (
                <div className="p-4 bg-danger/10 rounded-lg border border-danger/30">
                  <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                  <p className="text-xl font-bold text-danger">
                    ${analysis.stopLoss.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {!isAutoTradingEnabled && analysis.recommendation === "BUY" && (
            <Button
              onClick={manualExecuteTrade}
              disabled={isExecutingTrade}
              className="w-full"
            >
              {isExecutingTrade ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing Trade
                </>
              ) : (
                "Execute Trade Manually"
              )}
            </Button>
          )}

          {isAutoTradingEnabled && analysis.confidence >= 0.7 && (
            <Badge variant="default" className="w-full justify-center py-2">
              Auto-trade will execute this signal
            </Badge>
          )}
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Enter a stock symbol to get AI-powered analysis
          </p>
        </div>
      )}
    </Card>
  );
};
