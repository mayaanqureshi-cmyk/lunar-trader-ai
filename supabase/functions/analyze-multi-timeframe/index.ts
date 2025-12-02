import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced technical indicator calculations
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period = 14): { k: number, d: number } {
  if (closes.length < period) return { k: 50, d: 50 };
  const recentHighs = highs.slice(-period), recentLows = lows.slice(-period);
  const highestHigh = Math.max(...recentHighs), lowestLow = Math.min(...recentLows);
  const k = ((closes[closes.length - 1] - lowestLow) / (highestHigh - lowestLow)) * 100;
  return { k, d: k }; // Simplified
}

function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < period + 1) return 0;
  const trueRanges = [];
  for (let i = 1; i < closes.length; i++) {
    trueRanges.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateBollingerBands(prices: number[], period = 20): { upper: number, middle: number, lower: number, bandwidth: number } {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0, bandwidth: 0 };
  const sma = calculateSMA(prices, period);
  const stdDev = Math.sqrt(prices.slice(-period).reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period);
  return { upper: sma + 2 * stdDev, middle: sma, lower: sma - 2 * stdDev, bandwidth: (4 * stdDev / sma) * 100 };
}

function calculateADX(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < period + 1) return 0;
  const atr = calculateATR(highs, lows, closes, period);
  if (atr === 0) return 0;
  return Math.min(100, (atr / closes[closes.length - 1]) * 100 * 10); // Simplified
}

function calculateMACD(prices: number[]): { macd: number, signal: number, histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  const macdLine = [macd];
  const signal = calculateEMA(macdLine, 9);
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b) / slice.length;
}

function analyzeVolumeTrend(volumes: number[]): string {
  if (volumes.length < 20) return "insufficient_data";
  
  const recentVol = volumes.slice(-5).reduce((a, b) => a + b) / 5;
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b) / 20;
  
  const ratio = recentVol / avgVol;
  
  if (ratio > 1.5) return "surging";
  if (ratio > 1.2) return "increasing";
  if (ratio < 0.8) return "decreasing";
  return "normal";
}

function detectPattern(prices: number[]): string {
  if (prices.length < 20) return "insufficient_data";
  
  const recent = prices.slice(-20);
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const currentPrice = prices[prices.length - 1];
  
  // Trend detection
  const priceChange = ((currentPrice - recent[0]) / recent[0]) * 100;
  
  if (sma20 > sma50 && currentPrice > sma20) return "bullish_trend";
  if (sma20 < sma50 && currentPrice < sma20) return "bearish_trend";
  if (priceChange > 5) return "breakout";
  if (Math.abs(priceChange) < 2) return "consolidation";
  
  return "neutral";
}

async function fetchYahooData(symbol: string, interval: string, range: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.chart?.result?.[0]) throw new Error(`No data for ${symbol}`);
    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    return {
      close: quotes.close.filter((p: number) => p !== null),
      high: quotes.high.filter((p: number) => p !== null),
      low: quotes.low.filter((p: number) => p !== null),
      volume: quotes.volume.filter((v: number) => v !== null),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

async function analyzeStock(symbol: string) {
  const [daily, weekly, monthly] = await Promise.all([
    fetchYahooData(symbol, "1d", "6mo"),
    fetchYahooData(symbol, "1wk", "2y"),
    fetchYahooData(symbol, "1mo", "5y"),
  ]);
  if (!daily || !weekly || !monthly) return null;
  
  const currentPrice = daily.close[daily.close.length - 1];
  const dailySMA20 = calculateSMA(daily.close, 20), dailySMA50 = calculateSMA(daily.close, 50), dailySMA200 = calculateSMA(daily.close, 200);
  const dailyBB = calculateBollingerBands(daily.close);
  const dailyATR = calculateATR(daily.high, daily.low, daily.close);
  
  return {
    symbol, currentPrice,
    daily: {
      rsi: calculateRSI(daily.close),
      macd: calculateMACD(daily.close),
      volumeTrend: analyzeVolumeTrend(daily.volume),
      pattern: detectPattern(daily.close),
      sma20: dailySMA20, sma50: dailySMA50, sma200: dailySMA200,
      priceVsSMA20: ((currentPrice - dailySMA20) / dailySMA20 * 100).toFixed(2),
      priceVsSMA50: ((currentPrice - dailySMA50) / dailySMA50 * 100).toFixed(2),
      bollingerBands: dailyBB,
      bbPosition: ((currentPrice - dailyBB.lower) / (dailyBB.upper - dailyBB.lower) * 100).toFixed(1),
      atr: dailyATR,
      atrPercent: ((dailyATR / currentPrice) * 100).toFixed(2),
      adx: calculateADX(daily.high, daily.low, daily.close),
      stochastic: calculateStochastic(daily.high, daily.low, daily.close),
    },
    weekly: {
      rsi: calculateRSI(weekly.close),
      macd: calculateMACD(weekly.close),
      pattern: detectPattern(weekly.close),
      sma20: calculateSMA(weekly.close, 20),
      adx: calculateADX(weekly.high, weekly.low, weekly.close),
    },
    monthly: {
      rsi: calculateRSI(monthly.close),
      pattern: detectPattern(monthly.close),
      adx: calculateADX(monthly.high, monthly.low, monthly.close),
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    console.log('Analyzing stocks:', symbols);
    
    if (!symbols || !Array.isArray(symbols)) {
      throw new Error('Symbols array required');
    }
    
    // Analyze all stocks in parallel
    const results = await Promise.all(
      symbols.map(symbol => analyzeStock(symbol))
    );
    
    const validResults = results.filter(r => r !== null);
    
    if (validResults.length === 0) {
      throw new Error('No valid analysis results');
    }
    
    // Use AI to interpret the technical analysis
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    const aiPrompt = `You are an expert technical analyst. Analyze these stocks across multiple timeframes and provide actionable insights.

Technical Analysis Data:
${JSON.stringify(validResults, null, 2)}

For each stock, provide:
1. Overall Signal: BUY, SELL, or HOLD
2. Timeframe Alignment: Are daily, weekly, monthly signals aligned?
3. Key Technical Levels: Support/resistance levels
4. Entry Strategy: Best entry price and timing
5. Risk Assessment: Stop loss and take profit levels
6. Conviction Score: 1-10 based on technical confluence

Focus on identifying:
- Multi-timeframe confirmation (all timeframes bullish/bearish)
- RSI divergences and extremes
- MACD crossovers and momentum
- Volume confirmation
- Pattern breakouts
- Moving average alignments

Rank stocks by probability of significant move (>15%) in next 2-4 weeks.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert technical analyst specializing in multi-timeframe analysis.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }
    
    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;
    
    return new Response(
      JSON.stringify({ 
        technicalData: validResults,
        aiAnalysis: analysis,
        analyzedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});