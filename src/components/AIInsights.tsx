import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface AIRecommendations {
  dip_threshold: number;
  gain_threshold: number;
  reasoning: string;
  risk_assessment: string;
  suggested_actions: string[];
}

export const AIInsights = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-thresholds');

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        toast({
          title: "AI Analysis Complete",
          description: "Trading thresholds have been optimized",
        });
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to get AI recommendations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'text-success';
      case 'high': return 'text-danger';
      default: return 'text-primary';
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">AI Trading Insights</h2>
        </div>
        <Button
          onClick={fetchRecommendations}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Analyzing...' : 'Get AI Recommendations'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : recommendations ? (
        <div className="space-y-6">
          {/* Optimized Thresholds */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Optimized Thresholds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Dip Alert</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {recommendations.dip_threshold}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trigger when price drops
                </p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Sell Signal</span>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {recommendations.gain_threshold}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum gain to sell
                </p>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${getRiskColor(recommendations.risk_assessment)}`} />
              <span className="text-sm font-semibold text-foreground">Risk Assessment</span>
              <Badge variant="outline" className={getRiskColor(recommendations.risk_assessment)}>
                {recommendations.risk_assessment.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{recommendations.reasoning}</p>
          </div>

          {/* Suggested Actions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Suggested Actions</h3>
            <div className="space-y-2">
              {recommendations.suggested_actions.map((action, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground"
                >
                  {index + 1}. {action}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Get AI-powered trading recommendations</p>
          <p className="text-sm text-muted-foreground">
            Our AI analyzes your portfolio and market data to optimize your trading thresholds
          </p>
        </div>
      )}
    </Card>
  );
};
