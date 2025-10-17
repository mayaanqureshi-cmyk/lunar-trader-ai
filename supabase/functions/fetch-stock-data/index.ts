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
      console.log('Yahoo Finance gainers response:', JSON.stringify(data, null, 2));
      const quotes = data.finance.result[0].quotes;

      // Filter to only show regular stocks (no options, warrants, or derivatives)
      const regularStocks = quotes.filter((quote: any) => {
        const symbol = quote.symbol;
        // Only allow pure letter symbols (A-Z), which are regular stocks
        // This excludes:
        // - Options (contain numbers like AAPL240119C00150000)
        // - Warrants (contain .WS, -WT, etc.)
        // - Special securities (contain -, ., ^, numbers)
        return /^[A-Z]+$/.test(symbol);
      });

      const formattedData = regularStocks.slice(0, 5).map((quote: any) => {
        // Handle different possible data formats from Yahoo Finance
        const price = typeof quote.regularMarketPrice === 'number' 
          ? quote.regularMarketPrice 
          : parseFloat(quote.regularMarketPrice?.fmt || quote.regularMarketPrice || 0);
        
        const changePercent = typeof quote.regularMarketChangePercent === 'number'
          ? quote.regularMarketChangePercent
          : parseFloat(quote.regularMarketChangePercent?.fmt || quote.regularMarketChangePercent || 0);

        return {
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          price: `$${price.toFixed(2)}`,
          change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          volume: formatVolume(quote.regularMarketVolume || 0),
          rawPrice: price,
          rawChange: changePercent,
        };
      });

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
      console.log('Yahoo Finance quotes response:', JSON.stringify(data, null, 2));
      const quotes = data.quoteResponse.result;

      const formattedData = quotes.map((quote: any) => {
        const price = typeof quote.regularMarketPrice === 'number'
          ? quote.regularMarketPrice
          : parseFloat(quote.regularMarketPrice || 0);
        
        const change = typeof quote.regularMarketChange === 'number'
          ? quote.regularMarketChange
          : parseFloat(quote.regularMarketChange || 0);
        
        const changePercent = typeof quote.regularMarketChangePercent === 'number'
          ? quote.regularMarketChangePercent
          : parseFloat(quote.regularMarketChangePercent || 0);

        return {
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          price: price.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2),
          volume: quote.regularMarketVolume || 0,
          marketCap: quote.marketCap || 0,
          high: quote.regularMarketDayHigh ? parseFloat(quote.regularMarketDayHigh.toString()).toFixed(2) : '0.00',
          low: quote.regularMarketDayLow ? parseFloat(quote.regularMarketDayLow.toString()).toFixed(2) : '0.00',
        };
      });

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
