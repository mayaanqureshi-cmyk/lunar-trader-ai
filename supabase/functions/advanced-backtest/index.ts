import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= TECHNICAL INDICATORS =============
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  // Signal is 9-day EMA of MACD (simplified)
  const signal = macd * 0.8;
  return { macd, signal, histogram: macd - signal };
}

function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateBollingerBands(prices: number[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number } {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: sma + stdDev * std, middle: sma, lower: sma - stdDev * std };
}

// ============= ENTRY SIGNAL DETECTION =============
interface SignalStrength {
  score: number;
  signals: string[];
  entry: 'BUY' | 'SELL' | 'HOLD';
}

function detectEntrySignals(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  index: number,
  strategy: string
): SignalStrength {
  if (index < 50) return { score: 0, signals: [], entry: 'HOLD' };

  const priceSlice = closes.slice(0, index + 1);
  const highSlice = highs.slice(0, index + 1);
  const lowSlice = lows.slice(0, index + 1);
  
  const rsi = calculateRSI(priceSlice);
  const sma20 = calculateSMA(priceSlice, 20);
  const sma50 = calculateSMA(priceSlice, 50);
  const ema9 = calculateEMA(priceSlice, 9);
  const ema21 = calculateEMA(priceSlice, 21);
  const macd = calculateMACD(priceSlice);
  const atr = calculateATR(highSlice, lowSlice, priceSlice);
  const bb = calculateBollingerBands(priceSlice);
  const currentPrice = closes[index];
  const prevPrice = closes[index - 1];
  const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;
  
  // Volume analysis
  const avgVolume = volumes.slice(Math.max(0, index - 20), index).reduce((a, b) => a + b, 0) / 20;
  const relativeVolume = volumes[index] / avgVolume;
  
  let buyScore = 0;
  let sellScore = 0;
  const signals: string[] = [];

  // Strategy-specific logic
  if (strategy === 'MOMENTUM_RSI') {
    // Oversold bounce
    if (rsi < 30) { buyScore += 3; signals.push('RSI Oversold'); }
    else if (rsi < 40) { buyScore += 1; signals.push('RSI Low'); }
    if (rsi > 70) { sellScore += 3; signals.push('RSI Overbought'); }
    
    // MACD crossover
    if (macd.histogram > 0 && macd.macd > macd.signal) { buyScore += 2; signals.push('MACD Bullish'); }
    else if (macd.histogram < 0) { sellScore += 2; signals.push('MACD Bearish'); }
    
    // Price vs EMA
    if (currentPrice > ema9 && ema9 > ema21) { buyScore += 2; signals.push('EMA Aligned Up'); }
    else if (currentPrice < ema9 && ema9 < ema21) { sellScore += 2; signals.push('EMA Aligned Down'); }
  }
  
  else if (strategy === 'MEAN_REVERSION') {
    // Bollinger Band touches
    if (currentPrice < bb.lower) { buyScore += 3; signals.push('Below BB Lower'); }
    else if (currentPrice > bb.upper) { sellScore += 3; signals.push('Above BB Upper'); }
    
    // RSI extremes
    if (rsi < 25) { buyScore += 2; signals.push('RSI Extreme Low'); }
    else if (rsi > 75) { sellScore += 2; signals.push('RSI Extreme High'); }
    
    // Distance from SMA20
    const distFromSMA = ((currentPrice - sma20) / sma20) * 100;
    if (distFromSMA < -3) { buyScore += 2; signals.push('Extended Below SMA20'); }
    else if (distFromSMA > 3) { sellScore += 2; signals.push('Extended Above SMA20'); }
  }
  
  else if (strategy === 'TREND_FOLLOWING') {
    // SMA crossover
    if (sma20 > sma50 && currentPrice > sma20) { buyScore += 3; signals.push('Uptrend Confirmed'); }
    else if (sma20 < sma50 && currentPrice < sma20) { sellScore += 3; signals.push('Downtrend Confirmed'); }
    
    // Higher highs / higher lows
    const recentHighs = highSlice.slice(-10);
    const recentLows = lowSlice.slice(-10);
    if (Math.max(...recentHighs.slice(-5)) > Math.max(...recentHighs.slice(0, 5))) {
      buyScore += 1; signals.push('Higher Highs');
    }
    
    // ADX proxy (simplified trend strength)
    const trendStrength = Math.abs(sma20 - sma50) / sma50 * 100;
    if (trendStrength > 2) { 
      if (sma20 > sma50) buyScore += 2; 
      else sellScore += 2;
      signals.push(`Strong Trend ${trendStrength.toFixed(1)}%`);
    }
  }
  
  else if (strategy === 'VOLATILITY_BREAKOUT') {
    // ATR-based breakout
    const atrPercent = (atr / currentPrice) * 100;
    const prevDayRange = highs[index] - lows[index];
    const avgDayRange = atr;
    
    // Breakout if today's range > 1.5x ATR
    if (prevDayRange > avgDayRange * 1.5 && priceChange > 0) {
      buyScore += 3; signals.push('Volatility Breakout Up');
    } else if (prevDayRange > avgDayRange * 1.5 && priceChange < 0) {
      sellScore += 3; signals.push('Volatility Breakout Down');
    }
    
    // Volume confirmation
    if (relativeVolume > 1.5 && priceChange > 1) { buyScore += 2; signals.push('Volume Surge'); }
    
    // Price breaking BB
    if (currentPrice > bb.upper && priceChange > 0.5) { buyScore += 2; signals.push('BB Upper Break'); }
  }
  
  else if (strategy === 'HYBRID_AI') {
    // Combine multiple signals
    // RSI
    if (rsi < 35) buyScore += 2;
    else if (rsi > 65) sellScore += 2;
    
    // MACD
    if (macd.histogram > 0) buyScore += 1;
    else sellScore += 1;
    
    // Trend
    if (currentPrice > sma20 && sma20 > sma50) buyScore += 2;
    else if (currentPrice < sma20 && sma20 < sma50) sellScore += 2;
    
    // Bollinger
    if (currentPrice < bb.lower * 1.01) buyScore += 2;
    else if (currentPrice > bb.upper * 0.99) sellScore += 2;
    
    // Volume
    if (relativeVolume > 1.3 && priceChange > 0.5) { buyScore += 1; signals.push('Volume Confirm'); }
    
    signals.push(`Hybrid Score: Buy ${buyScore} / Sell ${sellScore}`);
  }
  
  // Determine entry
  const netScore = buyScore - sellScore;
  if (netScore >= 4) return { score: buyScore, signals, entry: 'BUY' };
  if (netScore <= -4) return { score: sellScore, signals, entry: 'SELL' };
  return { score: 0, signals, entry: 'HOLD' };
}

// ============= BACKTEST ENGINE =============
interface BacktestParams {
  symbol: string;
  startDate: string;
  endDate: string;
  strategy: string;
  initialCapital: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;
  positionSizePercent: number;
}

interface TradeRecord {
  date: string;
  action: string;
  price: number;
  shares: number;
  profitLoss?: number;
  profitPct?: number;
  reason: string;
  signals?: string[];
}

interface BacktestResult {
  strategy: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  trades: TradeRecord[];
  equityCurve: { date: string; value: number }[];
}

async function runSingleBacktest(params: BacktestParams): Promise<BacktestResult> {
  const { symbol, startDate, endDate, strategy, initialCapital, stopLossPercent, takeProfitPercent, trailingStopPercent, positionSizePercent } = params;
  
  console.log(`🔄 Backtest: ${symbol} | ${strategy} | ${startDate} to ${endDate}`);
  
  // Fetch historical data
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
  
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
  );
  
  if (!response.ok) throw new Error(`Failed to fetch data for ${symbol}`);
  
  const data = await response.json();
  const quotes = data.chart?.result?.[0];
  if (!quotes?.timestamp || !quotes.indicators?.quote?.[0]) {
    throw new Error(`No data for ${symbol}`);
  }
  
  const timestamps = quotes.timestamp;
  const ohlcv = quotes.indicators.quote[0];
  const closes: number[] = ohlcv.close || [];
  const highs: number[] = ohlcv.high || [];
  const lows: number[] = ohlcv.low || [];
  const volumes: number[] = ohlcv.volume || [];
  
  // Initialize backtest state
  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  let peakPrice = 0;
  let maxCapital = capital;
  let maxDrawdown = 0;
  const trades: TradeRecord[] = [];
  const equityCurve: { date: string; value: number }[] = [];
  const dailyReturns: number[] = [];
  let prevValue = initialCapital;
  let totalWins = 0;
  let totalLosses = 0;
  
  // Run simulation
  for (let i = 50; i < timestamps.length; i++) {
    const currentPrice = closes[i];
    if (!currentPrice || currentPrice <= 0) continue;
    
    const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    
    // Track peak and drawdown
    if (position > 0 && currentPrice > peakPrice) {
      peakPrice = currentPrice;
    }
    
    // Check exits if in position
    if (position > 0) {
      const currentProfit = ((currentPrice - entryPrice) / entryPrice) * 100;
      const profitFromPeak = peakPrice > 0 ? ((currentPrice - peakPrice) / peakPrice) * 100 : 0;
      
      let shouldSell = false;
      let exitReason = '';
      
      // Stop Loss
      if (currentProfit <= -stopLossPercent) {
        shouldSell = true;
        exitReason = `Stop Loss (${currentProfit.toFixed(1)}%)`;
      }
      // Take Profit
      else if (currentProfit >= takeProfitPercent) {
        shouldSell = true;
        exitReason = `Take Profit (${currentProfit.toFixed(1)}%)`;
      }
      // Trailing Stop
      else if (currentProfit >= trailingStopPercent && profitFromPeak <= -3) {
        shouldSell = true;
        exitReason = `Trailing Stop (${currentProfit.toFixed(1)}%)`;
      }
      
      if (shouldSell) {
        const sellValue = position * currentPrice;
        const profitLoss = sellValue - (position * entryPrice);
        capital += sellValue;
        
        if (profitLoss > 0) totalWins += profitLoss;
        else totalLosses += Math.abs(profitLoss);
        
        trades.push({
          date,
          action: 'SELL',
          price: currentPrice,
          shares: position,
          profitLoss,
          profitPct: currentProfit,
          reason: exitReason
        });
        
        position = 0;
        entryPrice = 0;
        peakPrice = 0;
      }
    }
    
    // Check entry signals if not in position
    if (position === 0) {
      const signal = detectEntrySignals(closes, highs, lows, volumes, i, strategy);
      
      if (signal.entry === 'BUY' && signal.score >= 4) {
        const positionValue = capital * (positionSizePercent / 100);
        const sharesToBuy = Math.floor(positionValue / currentPrice);
        
        if (sharesToBuy > 0 && sharesToBuy * currentPrice <= capital) {
          position = sharesToBuy;
          entryPrice = currentPrice;
          peakPrice = currentPrice;
          capital -= sharesToBuy * currentPrice;
          
          trades.push({
            date,
            action: 'BUY',
            price: currentPrice,
            shares: sharesToBuy,
            reason: signal.signals.join(', '),
            signals: signal.signals
          });
        }
      }
    }
    
    // Track equity curve
    const currentValue = capital + (position * currentPrice);
    equityCurve.push({ date, value: currentValue });
    
    // Daily returns for Sharpe
    const dailyReturn = (currentValue - prevValue) / prevValue;
    dailyReturns.push(dailyReturn);
    prevValue = currentValue;
    
    // Max drawdown
    if (currentValue > maxCapital) maxCapital = currentValue;
    const drawdown = ((maxCapital - currentValue) / maxCapital) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Close any open position at end
  if (position > 0) {
    const finalPrice = closes[closes.length - 1];
    const sellValue = position * finalPrice;
    const currentProfit = ((finalPrice - entryPrice) / entryPrice) * 100;
    const profitLoss = sellValue - (position * entryPrice);
    capital += sellValue;
    
    if (profitLoss > 0) totalWins += profitLoss;
    else totalLosses += Math.abs(profitLoss);
    
    trades.push({
      date: new Date(timestamps[timestamps.length - 1] * 1000).toISOString().split('T')[0],
      action: 'SELL',
      price: finalPrice,
      shares: position,
      profitLoss,
      profitPct: currentProfit,
      reason: 'End of Period'
    });
  }
  
  // Calculate metrics
  const finalValue = capital;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  const sellTrades = trades.filter(t => t.action === 'SELL');
  const winningTrades = sellTrades.filter(t => (t.profitLoss || 0) > 0).length;
  const losingTrades = sellTrades.filter(t => (t.profitLoss || 0) <= 0).length;
  const totalTrades = sellTrades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  
  // Sharpe Ratio (annualized)
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
  const stdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length) || 1;
  const sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252);
  
  // Average win/loss
  const wins = sellTrades.filter(t => (t.profitLoss || 0) > 0).map(t => t.profitLoss || 0);
  const losses = sellTrades.filter(t => (t.profitLoss || 0) < 0).map(t => Math.abs(t.profitLoss || 0));
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  
  return {
    strategy,
    symbol,
    startDate,
    endDate,
    initialCapital,
    finalValue,
    totalReturn,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    maxDrawdown,
    sharpeRatio,
    profitFactor,
    avgWin,
    avgLoss,
    trades,
    equityCurve
  };
}

// ============= MONTE CARLO SIMULATION =============
interface MonteCarloResult {
  percentile5: number;
  percentile25: number;
  median: number;
  percentile75: number;
  percentile95: number;
  mean: number;
  worstCase: number;
  bestCase: number;
  probabilityOfProfit: number;
  probabilityOf10Percent: number;
  probabilityOfLoss10Percent: number;
  simulations: number[];
}

function runMonteCarloSimulation(trades: TradeRecord[], initialCapital: number, numSimulations = 1000): MonteCarloResult {
  const returns = trades
    .filter(t => t.action === 'SELL' && t.profitPct !== undefined)
    .map(t => t.profitPct!);
  
  if (returns.length < 5) {
    return {
      percentile5: 0, percentile25: 0, median: 0, percentile75: 0, percentile95: 0,
      mean: 0, worstCase: 0, bestCase: 0, probabilityOfProfit: 0,
      probabilityOf10Percent: 0, probabilityOfLoss10Percent: 0, simulations: []
    };
  }
  
  const finalValues: number[] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    let capital = initialCapital;
    const numTrades = Math.floor(Math.random() * returns.length) + Math.ceil(returns.length / 2);
    
    for (let t = 0; t < numTrades; t++) {
      const randomReturn = returns[Math.floor(Math.random() * returns.length)];
      capital *= (1 + randomReturn / 100);
    }
    
    finalValues.push(((capital - initialCapital) / initialCapital) * 100);
  }
  
  finalValues.sort((a, b) => a - b);
  
  const getPercentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)];
  
  return {
    percentile5: getPercentile(finalValues, 5),
    percentile25: getPercentile(finalValues, 25),
    median: getPercentile(finalValues, 50),
    percentile75: getPercentile(finalValues, 75),
    percentile95: getPercentile(finalValues, 95),
    mean: finalValues.reduce((a, b) => a + b, 0) / finalValues.length,
    worstCase: finalValues[0],
    bestCase: finalValues[finalValues.length - 1],
    probabilityOfProfit: (finalValues.filter(v => v > 0).length / finalValues.length) * 100,
    probabilityOf10Percent: (finalValues.filter(v => v >= 10).length / finalValues.length) * 100,
    probabilityOfLoss10Percent: (finalValues.filter(v => v <= -10).length / finalValues.length) * 100,
    simulations: finalValues.slice(0, 100) // Sample for visualization
  };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mode, 
      symbol, 
      symbols,
      startDate, 
      endDate, 
      strategies,
      initialCapital = 100000,
      stopLossPercent = 3,
      takeProfitPercent = 12,
      trailingStopPercent = 8,
      positionSizePercent = 25,
      runMonteCarlo = false,
      monteCarloSimulations = 1000
    } = await req.json();
    
    console.log(`📊 Advanced Backtest: Mode=${mode}, Symbols=${symbols || symbol}`);
    
    const results: BacktestResult[] = [];
    const targetSymbols = symbols || [symbol];
    const targetStrategies = strategies || ['HYBRID_AI'];
    
    if (mode === 'compare_strategies') {
      // Compare multiple strategies on same symbol
      for (const strat of targetStrategies) {
        const result = await runSingleBacktest({
          symbol: targetSymbols[0],
          startDate,
          endDate,
          strategy: strat,
          initialCapital,
          stopLossPercent,
          takeProfitPercent,
          trailingStopPercent,
          positionSizePercent
        });
        results.push(result);
      }
    } 
    else if (mode === 'compare_symbols') {
      // Same strategy across multiple symbols
      for (const sym of targetSymbols) {
        const result = await runSingleBacktest({
          symbol: sym,
          startDate,
          endDate,
          strategy: targetStrategies[0],
          initialCapital,
          stopLossPercent,
          takeProfitPercent,
          trailingStopPercent,
          positionSizePercent
        });
        results.push(result);
      }
    }
    else {
      // Single backtest
      const result = await runSingleBacktest({
        symbol: targetSymbols[0],
        startDate,
        endDate,
        strategy: targetStrategies[0],
        initialCapital,
        stopLossPercent,
        takeProfitPercent,
        trailingStopPercent,
        positionSizePercent
      });
      results.push(result);
    }
    
    // Run Monte Carlo if requested
    let monteCarloResults: Record<string, MonteCarloResult> = {};
    if (runMonteCarlo) {
      for (const result of results) {
        const key = `${result.symbol}_${result.strategy}`;
        monteCarloResults[key] = runMonteCarloSimulation(result.trades, initialCapital, monteCarloSimulations);
        console.log(`🎲 Monte Carlo ${key}: Median ${monteCarloResults[key].median.toFixed(1)}%, P(profit)=${monteCarloResults[key].probabilityOfProfit.toFixed(1)}%`);
      }
    }
    
    // Rank strategies
    const ranked = [...results].sort((a, b) => {
      // Score: return * winRate * sharpe / drawdown
      const scoreA = (a.totalReturn * a.winRate * Math.max(0.1, a.sharpeRatio)) / Math.max(1, a.maxDrawdown);
      const scoreB = (b.totalReturn * b.winRate * Math.max(0.1, b.sharpeRatio)) / Math.max(1, b.maxDrawdown);
      return scoreB - scoreA;
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        results: ranked,
        monteCarlo: monteCarloResults,
        bestStrategy: ranked[0]?.strategy,
        summary: {
          totalBacktests: results.length,
          bestReturn: Math.max(...results.map(r => r.totalReturn)),
          bestWinRate: Math.max(...results.map(r => r.winRate)),
          lowestDrawdown: Math.min(...results.map(r => r.maxDrawdown))
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Backtest error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
