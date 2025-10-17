import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, type } = await req.json();
    
    if (type === 'gainers') {
      // Fetch top gainers using Yahoo Finance API
      const response = await fetch(
        'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=day_gainers&count=10',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch gainers data');
      }

      const data = await response.json();
      const quotes = data.finance.result[0].quotes;

      const formattedData = quotes.slice(0, 5).map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortName || quote.longName,
        price: `$${quote.regularMarketPrice?.toFixed(2) || '0.00'}`,
        change: `${quote.regularMarketChangePercent?.toFixed(2) || '0.00'}%`,
        volume: formatVolume(quote.regularMarketVolume),
        rawPrice: quote.regularMarketPrice,
        rawChange: quote.regularMarketChangePercent,
      }));

      return new Response(JSON.stringify({ data: formattedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (type === 'quotes') {
      // Fetch specific stock quotes
      const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols;
      const response = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quotes data');
      }

      const data = await response.json();
      const quotes = data.quoteResponse.result;

      const formattedData = quotes.map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortName || quote.longName,
        price: quote.regularMarketPrice?.toFixed(2),
        change: quote.regularMarketChange?.toFixed(2),
        changePercent: quote.regularMarketChangePercent?.toFixed(2),
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        high: quote.regularMarketDayHigh?.toFixed(2),
        low: quote.regularMarketDayLow?.toFixed(2),
      }));

      return new Response(JSON.stringify({ data: formattedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (type === 'sentiment') {
      // Fetch news for sentiment analysis
      const response = await fetch(
        'https://query1.finance.yahoo.com/v1/finance/search?q=stock%20market&newsCount=10',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch news data');
      }

      const data = await response.json();
      const news = data.news || [];

      const formattedNews = news.slice(0, 4).map((item: any) => ({
        source: item.publisher || 'Financial News',
        title: item.title,
        summary: item.title, // Yahoo API doesn't always provide full summaries
        link: item.link,
      }));

      return new Response(JSON.stringify({ data: formattedNews }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}
