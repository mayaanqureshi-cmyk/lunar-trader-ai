import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  summary: string;
  sentiment: string;
  publishedAt: string;
}

interface StockNews {
  symbol: string;
  articles: NewsArticle[];
}

interface StockNewsProps {
  symbols: string[];
}

export const StockNews = ({ symbols }: StockNewsProps) => {
  const [news, setNews] = useState<StockNews[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (symbols.length > 0) {
      fetchNews();
    }
  }, [symbols]);

  const fetchNews = async () => {
    if (symbols.length === 0) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-stock-news", {
        body: { symbols: symbols.slice(0, 5) },
      });

      if (error) throw error;

      setNews(data.news || []);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "Error",
        description: "Failed to fetch stock news",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish":
      case "positive":
        return "bg-success/10 text-success border-success/20";
      case "bearish":
      case "negative":
        return "bg-danger/10 text-danger border-danger/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Stock News</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchNews}
          disabled={isLoading || symbols.length === 0}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : news.length > 0 ? (
        <ScrollArea className="h-[600px]">
          <div className="space-y-6">
            {news.map((stockNews, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Badge variant="outline">{stockNews.symbol}</Badge>
                  <span className="text-muted-foreground">Latest News</span>
                </h3>
                <div className="space-y-3">
                  {stockNews.articles.length > 0 ? (
                    stockNews.articles.map((article, articleIdx) => (
                      <div
                        key={articleIdx}
                        className="p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/70 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-foreground hover:text-primary transition-colors flex items-start gap-2"
                            >
                              <span className="flex-1">{article.title}</span>
                              <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">
                              {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {article.sentiment && (
                          <Badge
                            variant="outline"
                            className={`mb-2 ${getSentimentColor(article.sentiment)}`}
                          >
                            {article.sentiment}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.summary}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No news available for {stockNews.symbol}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No stock news available</p>
          <p className="text-sm text-muted-foreground">
            {symbols.length === 0
              ? "Add stocks to your portfolio to see news"
              : "Click refresh to load news for your stocks"}
          </p>
        </div>
      )}
    </Card>
  );
};
