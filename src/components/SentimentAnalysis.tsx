import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useStockData } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";

export const SentimentAnalysis = () => {
  const { news, isLoading } = useStockData();

  // Analyze sentiment based on keywords (simple implementation)
  const analyzeSentiment = (title: string) => {
    const bullishWords = ['gain', 'surge', 'rally', 'up', 'high', 'growth', 'profit', 'beat'];
    const bearishWords = ['fall', 'drop', 'decline', 'down', 'low', 'loss', 'miss'];
    
    const lowerTitle = title.toLowerCase();
    const bullishCount = bullishWords.filter(word => lowerTitle.includes(word)).length;
    const bearishCount = bearishWords.filter(word => lowerTitle.includes(word)).length;
    
    if (bullishCount > bearishCount) return { sentiment: 'bullish', confidence: 70 + (bullishCount * 5) };
    if (bearishCount > bullishCount) return { sentiment: 'bearish', confidence: 70 + (bearishCount * 5) };
    return { sentiment: 'neutral', confidence: 65 };
  };

  const mockSentiment = news.map(item => ({
    source: item.source,
    summary: item.summary,
    ...analyzeSentiment(item.title),
  }));
  const getSentimentIcon = (sentiment: string) => {
    switch(sentiment) {
      case "bullish": return <TrendingUp className="h-4 w-4 text-success" />;
      case "bearish": return <TrendingDown className="h-4 w-4 text-danger" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch(sentiment) {
      case "bullish": return "text-success";
      case "bearish": return "text-danger";
      default: return "text-muted-foreground";
    }
  };

  const overallSentiment = Math.round(mockSentiment.reduce((acc, item) => acc + item.confidence, 0) / mockSentiment.length);

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Market Sentiment</h2>
        </div>
        {!isLoading && mockSentiment.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Overall Score</p>
            <p className="text-2xl font-bold text-success">{overallSentiment}%</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {mockSentiment.map((item, index) => (
          <div 
            key={index}
            className="p-4 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSentimentIcon(item.sentiment)}
                <p className="font-semibold text-foreground">{item.source}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-success"
                    style={{ width: `${item.confidence}%` }}
                  />
                </div>
                <span className={`text-sm font-medium ${getSentimentColor(item.sentiment)}`}>
                  {item.confidence}%
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{item.summary}</p>
          </div>
          ))}
        </div>
      )}
    </Card>
  );
};
