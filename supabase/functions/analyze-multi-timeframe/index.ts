import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Technical indicator calculations
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
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
    
    if (!data.chart?.result?.[0]) {
      throw new Error(`No data for ${symbol}`);
    }
    
    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    
    return {
      prices: quotes.close.filter((p: number) => p !== null),
      volumes: quotes.volume.filter((v: number) => v !== null),
      timestamps: result.timestamp,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol} ${interval}:`, error);
    return null;
  }
}

async function analyzeStock(symbol: string) {
  console.log(`Analyzing ${symbol} across timeframes...`);
  
  // Fetch multiple timeframes
  const [daily, weekly, monthly] = await Promise.all([
    fetchYahooData(symbol, "1d", "3mo"),
    fetchYahooData(symbol, "1wk", "1y"),
    fetchYahooData(symbol, "1mo", "5y"),
  ]);
  
  if (!daily || !weekly || !monthly) {
    return null;
  }
  
  // Daily analysis
  const dailyRSI = calculateRSI(daily.prices);
  const dailyMACD = calculateMACD(daily.prices);
  const dailyVolume = analyzeVolumeTrend(daily.volumes);
  const dailyPattern = detectPattern(daily.prices);
  const dailySMA20 = calculateSMA(daily.prices, 20);
  const dailySMA50 = calculateSMA(daily.prices, 50);
  
  // Weekly analysis
  const weeklyRSI = calculateRSI(weekly.prices);
  const weeklyMACD = calculateMACD(weekly.prices);
  const weeklyPattern = detectPattern(weekly.prices);
  const weeklySMA20 = calculateSMA(weekly.prices, 20);
  
  // Monthly analysis
  const monthlyRSI = calculateRSI(monthly.prices);
  const monthlyPattern = detectPattern(monthly.prices);
  
  const currentPrice = daily.prices[daily.prices.length - 1];
  
  return {
    symbol,
    currentPrice,
    daily: {
      rsi: dailyRSI,
      macd: dailyMACD,
      volumeTrend: dailyVolume,
      pattern: dailyPattern,
      sma20: dailySMA20,
      sma50: dailySMA50,
      priceVsSMA20: ((currentPrice - dailySMA20) / dailySMA20 * 100).toFixed(2),
      priceVsSMA50: ((currentPrice - dailySMA50) / dailySMA50 * 100).toFixed(2),
    },
    weekly: {
      rsi: weeklyRSI,
      macd: weeklyMACD,
      pattern: weeklyPattern,
      sma20: weeklySMA20,
    },
    monthly: {
      rsi: monthlyRSI,
      pattern: monthlyPattern,
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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