import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all portfolio stocks
    const { data: portfolio, error: portfolioError } = await supabaseClient
      .from('portfolio')
      .select('*');

    if (portfolioError) throw portfolioError;

    if (!portfolio || portfolio.length === 0) {
      return new Response(JSON.stringify({ message: 'No stocks in portfolio' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current prices with graceful fallback
    const symbols: string[] = portfolio.map((stock: any) => stock.symbol);
    let quotes: any[] = [];

    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        quotes = Array.isArray(data?.quoteResponse?.result) ? data.quoteResponse.result : [];
      } else {
        console.error('Yahoo quotes fetch failed with status:', response.status);
      }
    } catch (e) {
      console.error('Yahoo quotes fetch threw error:', e);
    }

    // Fallback to internal function if Yahoo failed
    if (!quotes.length) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabaseClient.functions.invoke('fetch-stock-data', {
          body: { type: 'quotes', symbols },
        });
        if (!fallbackError && Array.isArray(fallbackData?.data)) {
          // Expecting an array of { symbol, rawPrice }
          quotes = fallbackData.data.map((q: any) => ({ symbol: q.symbol, regularMarketPrice: q.rawPrice }));
        } else if (fallbackError) {
          console.error('fetch-stock-data fallback error:', fallbackError);
        }
      } catch (e) {
        console.error('fetch-stock-data fallback threw error:', e);
      }
    }

    // Analyze each stock and generate signals
    const signals = [];

    for (const stock of portfolio) {
      const quote = quotes.find((q: any) => q.symbol === stock.symbol);
      if (!quote) continue;

      const currentPrice = typeof quote.regularMarketPrice === 'number'
        ? quote.regularMarketPrice
        : parseFloat(quote.regularMarketPrice || 0);

      const purchasePrice = parseFloat(stock.purchase_price);
      const quantity = parseInt(stock.quantity);

      const costBasis = purchasePrice * quantity;
      const currentValue = currentPrice * quantity;
      const gainPercent = ((currentValue - costBasis) / costBasis) * 100;

      // Calculate price change from purchase
      const priceChangePercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;

      // Check for 5% dip alert
      if (priceChangePercent <= -5 && priceChangePercent > -6) {
        signals.push({
          portfolio_id: stock.id,
          signal_type: 'dip_alert',
          current_price: currentPrice,
          price_change_percent: priceChangePercent,
          current_gain_percent: gainPercent,
          message: `⚠️ ${stock.symbol} has dipped ${Math.abs(priceChangePercent).toFixed(2)}% from your purchase price. Current: $${currentPrice.toFixed(2)}`,
        });
      }

      // Check for sell signal: dip >5% but overall gain >30%
      if (priceChangePercent <= -5 && gainPercent >= 30) {
        signals.push({
          portfolio_id: stock.id,
          signal_type: 'sell_signal',
          current_price: currentPrice,
          price_change_percent: priceChangePercent,
          current_gain_percent: gainPercent,
          message: `🔔 SELL SIGNAL for ${stock.symbol}! Price dipped ${Math.abs(priceChangePercent).toFixed(2)}% but you're still up ${gainPercent.toFixed(2)}%. Consider taking profits at $${currentPrice.toFixed(2)}`,
        });
      }
    }

    // Insert signals into database (only if new)
    if (signals.length > 0) {
      // Check for recent signals to avoid duplicates
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      for (const signal of signals) {
        const { data: existingSignals } = await supabaseClient
          .from('trading_signals')
          .select('id')
          .eq('portfolio_id', signal.portfolio_id)
          .eq('signal_type', signal.signal_type)
          .gte('created_at', oneDayAgo);

        // Only insert if no recent signal exists
        if (!existingSignals || existingSignals.length === 0) {
          await supabaseClient
            .from('trading_signals')
            .insert([signal]);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Portfolio monitoring complete',
        signals_generated: signals.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error monitoring portfolio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
