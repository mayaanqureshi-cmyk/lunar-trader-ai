import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Symbols array is required");
    }

    // Using Alpha Vantage News API (free tier)
    const newsPromises = symbols.slice(0, 5).map(async (symbol) => {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=demo&limit=3`
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch news for ${symbol}`);
          return { symbol, articles: [] };
        }

        const data = await response.json();
        const articles = (data.feed || []).slice(0, 3).map((item: any) => ({
          title: item.title,
          url: item.url,
          source: item.source,
          summary: item.summary,
          sentiment: item.overall_sentiment_label,
          publishedAt: item.time_published,
        }));

        return { symbol, articles };
      } catch (error) {
        console.error(`Error fetching news for ${symbol}:`, error);
        return { symbol, articles: [] };
      }
    });

    const newsResults = await Promise.all(newsPromises);

    return new Response(JSON.stringify({ news: newsResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
