import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, AlertCircle, Target, Clock, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockRecommendation {
  symbol: string;
  company_name: string;
  current_price: string;
  price_target: string;
  catalyst: string;
  risk_level: number;
  time_horizon: string;
  entry_strategy: string;
  pattern_match: string;
  confidence_score: number;
}

interface AnalysisResult {
  analysis_summary: string;
  market_conditions: string;
  recommendations: StockRecommendation[];
}

export const AIStockAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      toast({
        title: "AI Analysis Started",
        description: "Analyzing 5 years of historical data and current market conditions...",
      });

      const { data, error } = await supabase.functions.invoke('analyze-historical-patterns');

      if (error) throw error;

      setAnalysis(data);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${data.recommendations.length} high-probability opportunities`,
      });
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      toast({
        title: "Error",
        description: "Failed to analyze patterns. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 3) return "text-success";
    if (risk <= 6) return "text-warning";
    return "text-danger";
  };

  const getRiskBadge = (risk: number) => {
    if (risk <= 3) return "Low Risk";
    if (risk <= 6) return "Moderate Risk";
    return "High Risk";
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Pattern Analyzer</h2>
            <p className="text-sm text-muted-foreground">5-Year Historical Analysis + Current Market Intel</p>
          </div>
        </div>
        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          size="lg"
          className="bg-primary hover:bg-primary/90"
        >
          {isAnalyzing ? (
            <>
              <Brain className="mr-2 h-4 w-4 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Run Deep Analysis
            </>
          )}
        </Button>
      </div>

      {isAnalyzing && (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-semibold text-foreground mb-2">AI is analyzing...</p>
          <p className="text-sm text-muted-foreground">
            Processing historical weekly gainers, identifying patterns, and finding current opportunities
          </p>
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="space-y-6">
          {/* Market Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-secondary/50 border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Pattern Analysis
              </h3>
              <p className="text-sm text-muted-foreground">{analysis.analysis_summary}</p>
            </Card>
            
            <Card className="p-4 bg-secondary/50 border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Market Conditions
              </h3>
              <p className="text-sm text-muted-foreground">{analysis.market_conditions}</p>
            </Card>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              High-Probability Recommendations ({analysis.recommendations.length})
            </h3>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {analysis.recommendations.map((stock, index) => (
                  <Card 
                    key={stock.symbol} 
                    className="p-5 bg-gradient-to-br from-card to-secondary/20 border-border hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl font-bold text-foreground">{stock.symbol}</span>
                          <Badge 
                            variant="outline" 
                            className={`${stock.confidence_score >= 8 ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}
                          >
                            {stock.confidence_score}/10 Confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{stock.company_name}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`${getRiskColor(stock.risk_level)} border-current`}
                      >
                        {getRiskBadge(stock.risk_level)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                        <p className="text-lg font-bold text-foreground">{stock.current_price}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5">
                        <p className="text-xs text-muted-foreground mb-1">Price Target</p>
                        <p className="text-lg font-bold text-primary">{stock.price_target}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">Catalyst</p>
                          <p className="text-sm text-muted-foreground">{stock.catalyst}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">Time Horizon</p>
                          <p className="text-sm text-muted-foreground">{stock.time_horizon}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">Entry Strategy</p>
                          <p className="text-sm text-muted-foreground">{stock.entry_strategy}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1">Pattern Match</p>
                          <p className="text-sm text-muted-foreground">{stock.pattern_match}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Risk Disclaimer</p>
                <p className="text-xs text-muted-foreground">
                  These are AI-generated recommendations based on historical pattern analysis. Past performance does not guarantee future results. 
                  Always do your own research, manage position sizes, and use stop losses. Trading stocks involves risk of loss.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold text-foreground mb-2">Ready to Find Winners</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click "Run Deep Analysis" to analyze 5 years of top weekly gainers, identify patterns, 
            and get high-probability stock recommendations for maximum gains.
          </p>
        </div>
      )}
    </Card>
  );
};
