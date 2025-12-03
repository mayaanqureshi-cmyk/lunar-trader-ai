import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, startDate, endDate, buyThreshold, sellThreshold, initialCapital } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create strategy internally (bypasses RLS with service role)
    const { data: strategy, error: strategyError } = await supabase
      .from("backtest_strategies")
      .insert({
        name: `Backtest-${symbol}-${Date.now()}`,
        description: 'Auto-generated backtest',
        buy_condition: buyThreshold || '2',
        sell_condition: sellThreshold || '3',
        initial_capital: initialCapital || 10000
      })
      .select()
      .single();

    if (strategyError || !strategy) {
      console.error("Strategy creation error:", strategyError);
      throw new Error("Failed to create strategy");
    }
    
    console.log(`Running backtest for ${symbol} from ${startDate} to ${endDate}`);

    // Fetch historical data from Yahoo Finance
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    const historicalResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
    );

    if (!historicalResponse.ok) {
      throw new Error("Failed to fetch historical data");
    }

    const historicalData = await historicalResponse.json();
    console.log("Yahoo response:", JSON.stringify(historicalData).slice(0, 500));
    
    // Validate Yahoo Finance response
    if (!historicalData.chart?.result?.[0]) {
      throw new Error(`No data returned for ${symbol}. Check if the symbol is valid.`);
    }
    
    const quotes = historicalData.chart.result[0];
    const timestamps = quotes.timestamp;
    const prices = quotes.indicators?.quote?.[0];

    if (!timestamps || !timestamps.length || !prices?.close) {
      throw new Error(`Insufficient historical data for ${symbol}. Try a different date range or symbol.`);
    }

    // ADVANCED EXIT STRATEGY PARAMETERS
    const STOP_LOSS_PCT = 3;           // Cut losses at -3%
    const TAKE_PROFIT_PCT = 12;        // Take profits at +12%
    const TRAILING_TRIGGER_PCT = 8;    // Start trailing after +8% profit
    const TRAILING_STOP_PCT = 3;       // Trail by 3% from peak

    console.log(`Advanced Exit Strategy: SL=${STOP_LOSS_PCT}%, TP=${TAKE_PROFIT_PCT}%, Trail@${TRAILING_TRIGGER_PCT}%`);

    // Run backtest simulation
    let capital = strategy.initial_capital;
    let position = 0;
    let entryPrice = 0;
    let peakPrice = 0;
    let trades: any[] = [];
    let winningTrades = 0;
    let losingTrades = 0;
    let maxCapital = capital;
    let maxDrawdown = 0;

    for (let i = 1; i < timestamps.length; i++) {
      const currentPrice = prices.close[i];
      const previousPrice = prices.close[i - 1];
      const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

      if (position > 0) {
        // Track peak price for trailing stop
        if (currentPrice > peakPrice) {
          peakPrice = currentPrice;
        }

        const currentProfit = ((currentPrice - entryPrice) / entryPrice) * 100;
        const profitFromPeak = ((currentPrice - peakPrice) / peakPrice) * 100;

        let shouldSell = false;
        let exitReason = '';

        // EXIT RULE 1: Stop Loss - cut losses quickly
        if (currentProfit <= -STOP_LOSS_PCT) {
          shouldSell = true;
          exitReason = `Stop Loss (${currentProfit.toFixed(1)}%)`;
        }
        // EXIT RULE 2: Take Profit - lock in big gains
        else if (currentProfit >= TAKE_PROFIT_PCT) {
          shouldSell = true;
          exitReason = `Take Profit (${currentProfit.toFixed(1)}%)`;
        }
        // EXIT RULE 3: Trailing Stop - if in profit territory and drops from peak
        else if (currentProfit >= TRAILING_TRIGGER_PCT && profitFromPeak <= -TRAILING_STOP_PCT) {
          shouldSell = true;
          exitReason = `Trailing Stop (${currentProfit.toFixed(1)}%)`;
        }

        if (shouldSell) {
          const sellValue = position * currentPrice;
          const profitLoss = sellValue - (position * entryPrice);
          capital += sellValue;
          
          if (profitLoss > 0) winningTrades++;
          else losingTrades++;

          trades.push({
            action: 'sell',
            price: currentPrice,
            shares: position,
            profitLoss,
            profitPct: currentProfit,
            exitReason,
            date: new Date(timestamps[i] * 1000),
          });
          
          position = 0;
          entryPrice = 0;
          peakPrice = 0;
        }
      }

      // BUY CONDITION: Price dips by threshold (momentum entry)
      if (position === 0 && priceChange <= -parseFloat(strategy.buy_condition)) {
        const sharesToBuy = Math.floor(capital / currentPrice);
        if (sharesToBuy > 0) {
          position = sharesToBuy;
          entryPrice = currentPrice;
          peakPrice = currentPrice;
          capital -= sharesToBuy * currentPrice;
          trades.push({
            action: 'buy',
            price: currentPrice,
            shares: sharesToBuy,
            date: new Date(timestamps[i] * 1000),
          });
        }
      }

      // Track max portfolio drawdown
      const currentValue = capital + (position * currentPrice);
      if (currentValue > maxCapital) {
        maxCapital = currentValue;
      }
      const drawdown = ((maxCapital - currentValue) / maxCapital) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Close any open position at the end
    if (position > 0) {
      const finalPrice = prices.close[prices.close.length - 1];
      const sellValue = position * finalPrice;
      const currentProfit = ((finalPrice - entryPrice) / entryPrice) * 100;
      const profitLoss = sellValue - (position * entryPrice);
      capital += sellValue;
      
      if (profitLoss > 0) winningTrades++;
      else losingTrades++;

      trades.push({
        action: 'sell',
        price: finalPrice,
        shares: position,
        profitLoss,
        profitPct: currentProfit,
        exitReason: 'End of Period',
        date: new Date(timestamps[timestamps.length - 1] * 1000),
      });
    }

    const finalValue = capital;
    const totalProfitLoss = finalValue - strategy.initial_capital;
    const returnPercentage = (totalProfitLoss / strategy.initial_capital) * 100;
    const totalTrades = trades.filter(t => t.action === 'sell').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Save results
    const { data: result, error: resultError } = await supabase
      .from("backtest_results")
      .insert({
        strategy_id: strategy.id,
        symbol,
        start_date: startDate,
        end_date: endDate,
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        total_profit_loss: totalProfitLoss,
        return_percentage: returnPercentage,
        max_drawdown: maxDrawdown,
        win_rate: winRate,
      })
      .select()
      .single();

    if (resultError) {
      throw resultError;
    }

    return new Response(
      JSON.stringify({
        result: {
          ...result,
          trades,
          finalValue,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
