import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

const mockSentiment = [
  { source: "Wall Street Journal", sentiment: "bullish", confidence: 87, summary: "Strong earnings reports drive market optimism" },
  { source: "Bloomberg", sentiment: "bullish", confidence: 82, summary: "Tech sector shows continued growth momentum" },
  { source: "CNBC", sentiment: "neutral", confidence: 65, summary: "Mixed signals on inflation data" },
  { source: "Reuters", sentiment: "bullish", confidence: 78, summary: "Federal Reserve maintains steady course" },
];

export const SentimentAnalysis = () => {
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
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Overall Score</p>
          <p className="text-2xl font-bold text-success">{overallSentiment}%</p>
        </div>
      </div>

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
    </Card>
  );
};
