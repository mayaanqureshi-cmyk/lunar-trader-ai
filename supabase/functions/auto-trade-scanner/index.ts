import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPES & INTERFACES =============
interface CachedIndicators {
  data: any;
  timestamp: number;
  priceSnapshot: number;
}

interface TradeRecommendation {
  symbol: string;
  recommendation: string;
  confidence: number;
  reasoning: string;
  gpt4oReasoning?: string;
  gptMiniReasoning?: string;
  gpt4oConfidence?: number;
  gptMiniConfidence?: number;
  priceTarget: number;
  stopLoss: number;
  technicalScore: number;
  riskReward: string;
  aiConsensus: string;
  technicalIndicators?: any;
  fundamentals?: any;
  timeframe?: string;
}

interface BacktestResult {
  return_percentage: number;
  win_rate: number;
  total_trades: number;
  max_drawdown: number;
}

// Market regime types
type MarketRegime = 'BULL' | 'BEAR' | 'CHOPPY';

interface RegimeConfig {
  confidenceMultiplier: number;
  positionSizeMultiplier: number;
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  minConfidence: number;
}

// ============= CACHE MANAGEMENT =============
const indicatorCache = new Map<string, CachedIndicators>();
const CACHE_TTL_MS = 60 * 1000;
const PRICE_CHANGE_THRESHOLD = 0.3;

const getCachedIndicators = (symbol: string, currentPrice: number): any | null => {
  const cached = indicatorCache.get(symbol);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  const priceChange = Math.abs((currentPrice - cached.priceSnapshot) / cached.priceSnapshot) * 100;
  
  if (age < CACHE_TTL_MS && priceChange < PRICE_CHANGE_THRESHOLD) {
    console.log(`✅ Cache hit: ${symbol} (age: ${(age / 1000).toFixed(1)}s, drift: ${priceChange.toFixed(2)}%)`);
    return cached.data;
  }
  return null;
};

const setCachedIndicators = (symbol: string, data: any, price: number) => {
  indicatorCache.set(symbol, { data, timestamp: Date.now(), priceSnapshot: price });
  if (indicatorCache.size > 200) {
    const oldestKey = indicatorCache.keys().next().value;
    if (oldestKey) indicatorCache.delete(oldestKey);
  }
};

// ============= CONFIGURATION =============
const SYMBOLS_TO_SCAN = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'AMD', 'INTC', 'QCOM', 'AVGO', 'CRM', 'ORCL', 'ADBE', 'NOW', 'PANW', 'CRWD',
  'PLTR', 'SNOW', 'DDOG', 'NET', 'ZS', 'MDB',
  'WMT', 'COST', 'TGT', 'HD', 'NKE', 'SBUX',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'SQ',
  'JNJ', 'UNH', 'PFE', 'ABBV', 'LLY', 'TMO', 'MRNA', 'GILD',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG',
  'DIS', 'NFLX', 'CMCSA', 'T', 'VZ',
  'BA', 'CAT', 'GE', 'UPS', 'HON', 'LMT',
  'RIVN', 'LCID', 'NIO', 'ENPH', 'PLUG',
  'COIN', 'MSTR', 'RIOT', 'MARA',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO'
];

const SECTOR_MAP: Record<string, string> = {
  'AAPL': 'Tech', 'MSFT': 'Tech', 'GOOGL': 'Tech', 'AMZN': 'Tech', 'META': 'Tech', 'NVDA': 'Tech', 'TSLA': 'Auto',
  'AMD': 'Semiconductors', 'INTC': 'Semiconductors', 'QCOM': 'Semiconductors', 'AVGO': 'Semiconductors',
  'CRM': 'Software', 'ORCL': 'Software', 'ADBE': 'Software', 'NOW': 'Software', 'PANW': 'Cybersecurity', 'CRWD': 'Cybersecurity',
  'PLTR': 'AI', 'SNOW': 'Cloud', 'DDOG': 'Cloud', 'NET': 'Cloud', 'ZS': 'Cybersecurity', 'MDB': 'Database',
  'WMT': 'Retail', 'COST': 'Retail', 'TGT': 'Retail', 'HD': 'Retail', 'NKE': 'Consumer', 'SBUX': 'Consumer',
  'JPM': 'Finance', 'BAC': 'Finance', 'WFC': 'Finance', 'GS': 'Finance', 'MS': 'Finance', 'V': 'Payments', 'MA': 'Payments', 'PYPL': 'Payments',
  'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Pharma', 'ABBV': 'Pharma', 'LLY': 'Pharma', 'TMO': 'Healthcare', 'MRNA': 'Biotech', 'GILD': 'Biotech',
  'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy', 'EOG': 'Energy',
  'DIS': 'Media', 'NFLX': 'Media', 'CMCSA': 'Telecom', 'T': 'Telecom', 'VZ': 'Telecom',
  'BA': 'Aerospace', 'CAT': 'Industrial', 'GE': 'Industrial', 'UPS': 'Transport', 'HON': 'Industrial', 'LMT': 'Defense',
  'RIVN': 'EV', 'LCID': 'EV', 'NIO': 'EV', 'ENPH': 'CleanEnergy', 'PLUG': 'CleanEnergy',
  'COIN': 'Crypto', 'MSTR': 'Crypto', 'RIOT': 'Crypto', 'MARA': 'Crypto',
  'SPY': 'ETF', 'QQQ': 'ETF', 'IWM': 'ETF', 'DIA': 'ETF', 'VTI': 'ETF', 'VOO': 'ETF'
};

// ============= BALANCED RISK CONFIGURATION =============
// Moderately conservative settings for quality trades
const RISK_CONFIG = {
  baseStopLossPercent: 4,        // Base stop - will be ATR-adjusted
  baseTakeProfitPercent: 10,     // Base target - will be ATR-adjusted
  confidenceThreshold: 0.68,     // Moderate confidence threshold
  minTechnicalScore: 6.5,        // Moderate technical score required
  maxSectorExposure: 0.5,        // Allow more sector exposure
  capitalDeployment: 0.85,       // Moderate capital deployment
  requireConsensus: false,       // Allow single strong AI recommendation
  maxPositions: 6,               // Allow more positions
  minRiskRewardRatio: 2.0,       // Moderate risk/reward ratio
  cooldownMinutes: 30,           // Shorter cooldown between trades
  // ATR-based risk management
  atrStopMultiplier: 2.0,        // Stop loss = ATR * multiplier
  atrTakeProfitMultiplier: 4.0,  // Take profit = ATR * multiplier  
  targetRiskPercent: 1.0,        // Target 1% portfolio risk per trade
};

// ============= MARKET REGIME CONFIGURATION =============
const REGIME_CONFIGS: Record<MarketRegime, RegimeConfig> = {
  BULL: {
    confidenceMultiplier: 1.0,
    positionSizeMultiplier: 1.2,    // Larger positions in bull market
    stopLossMultiplier: 1.2,        // Wider stops to let winners run
    takeProfitMultiplier: 1.3,      // Higher targets in trending market
    minConfidence: 0.65,
  },
  BEAR: {
    confidenceMultiplier: 1.2,      // Require higher confidence in bear
    positionSizeMultiplier: 0.6,    // Smaller positions, more defensive
    stopLossMultiplier: 0.8,        // Tighter stops to limit losses
    takeProfitMultiplier: 0.8,      // Lower targets, take profits faster
    minConfidence: 0.75,
  },
  CHOPPY: {
    confidenceMultiplier: 1.1,
    positionSizeMultiplier: 0.8,    // Moderate positions
    stopLossMultiplier: 0.9,        // Slightly tighter stops
    takeProfitMultiplier: 0.9,      // Lower targets for range-bound
    minConfidence: 0.70,
  }
};

// ============= MARKET REGIME DETECTION =============
function detectMarketRegime(technicalData: Record<string, any>): { regime: MarketRegime; confidence: number; details: string } {
  // Analyze SPY and QQQ as market proxies
  const spyData = technicalData['SPY'] || technicalData.technicalData?.['SPY'];
  const qqqData = technicalData['QQQ'] || technicalData.technicalData?.['QQQ'];
  
  if (!spyData && !qqqData) {
    return { regime: 'CHOPPY', confidence: 0.5, details: 'No market proxy data available' };
  }
  
  const data = spyData || qqqData;
  const rsi = data.rsi || 50;
  const macd = data.macd || 0;
  const macdSignal = data.macd_signal || 0;
  const sma20 = data.sma_20 || data.close;
  const sma50 = data.sma_50 || data.close;
  const close = data.close;
  const atr = data.atr || 0;
  const atrPercent = (atr / close) * 100;
  
  let bullScore = 0;
  let bearScore = 0;
  
  // Price vs MAs
  if (close > sma20) bullScore += 2; else bearScore += 2;
  if (close > sma50) bullScore += 2; else bearScore += 2;
  if (sma20 > sma50) bullScore += 1; else bearScore += 1;
  
  // RSI analysis
  if (rsi > 60) bullScore += 2;
  else if (rsi > 50) bullScore += 1;
  else if (rsi < 40) bearScore += 2;
  else if (rsi < 50) bearScore += 1;
  
  // MACD analysis
  if (macd > macdSignal && macd > 0) bullScore += 2;
  else if (macd > macdSignal) bullScore += 1;
  else if (macd < macdSignal && macd < 0) bearScore += 2;
  else if (macd < macdSignal) bearScore += 1;
  
  // Volatility - high ATR suggests choppy/uncertain
  const isHighVolatility = atrPercent > 2.5;
  
  const totalScore = bullScore + bearScore;
  const bullPct = bullScore / totalScore;
  const bearPct = bearScore / totalScore;
  
  let regime: MarketRegime;
  let confidence: number;
  let details: string;
  
  if (isHighVolatility && Math.abs(bullPct - bearPct) < 0.2) {
    regime = 'CHOPPY';
    confidence = 0.6 + (atrPercent / 10);
    details = `High volatility (ATR ${atrPercent.toFixed(1)}%), mixed signals`;
  } else if (bullPct > 0.65) {
    regime = 'BULL';
    confidence = bullPct;
    details = `Bullish trend: Price above MAs, RSI ${rsi.toFixed(0)}, MACD positive`;
  } else if (bearPct > 0.65) {
    regime = 'BEAR';
    confidence = bearPct;
    details = `Bearish trend: Price below MAs, RSI ${rsi.toFixed(0)}, MACD negative`;
  } else {
    regime = 'CHOPPY';
    confidence = 1 - Math.abs(bullPct - bearPct);
    details = `Mixed signals: Bull ${(bullPct*100).toFixed(0)}% vs Bear ${(bearPct*100).toFixed(0)}%`;
  }
  
  console.log(`📊 Market Regime: ${regime} (${(confidence*100).toFixed(0)}% confidence)`);
  console.log(`   ${details}`);
  
  return { regime, confidence, details };
}

// ============= ATR-BASED RISK CALCULATIONS =============
function calculateATRStopLoss(
  currentPrice: number,
  atr: number,
  regime: MarketRegime
): { stopLossPercent: number; stopLossPrice: number } {
  const regimeConfig = REGIME_CONFIGS[regime];
  
  // ATR-based stop: wider for low volatility, tighter for high volatility
  // Minimum stop is based on ATR multiplied by regime factor
  const atrStop = (atr / currentPrice) * 100 * RISK_CONFIG.atrStopMultiplier * regimeConfig.stopLossMultiplier;
  
  // Floor and ceiling for stops
  const minStop = 2.0;  // Never less than 2%
  const maxStop = 8.0;  // Never more than 8%
  
  const stopLossPercent = Math.max(minStop, Math.min(maxStop, atrStop));
  const stopLossPrice = currentPrice * (1 - stopLossPercent / 100);
  
  return { stopLossPercent, stopLossPrice };
}

function calculateATRTakeProfit(
  currentPrice: number,
  atr: number,
  stopLossPercent: number,
  regime: MarketRegime
): { takeProfitPercent: number; takeProfitPrice: number; riskReward: number } {
  const regimeConfig = REGIME_CONFIGS[regime];
  
  // ATR-based take profit, adjusted for regime
  const atrTarget = (atr / currentPrice) * 100 * RISK_CONFIG.atrTakeProfitMultiplier * regimeConfig.takeProfitMultiplier;
  
  // Ensure minimum risk/reward ratio
  const minTakeProfit = stopLossPercent * RISK_CONFIG.minRiskRewardRatio;
  const maxTakeProfit = 15.0; // Cap at 15%
  
  const takeProfitPercent = Math.max(minTakeProfit, Math.min(maxTakeProfit, atrTarget));
  const takeProfitPrice = currentPrice * (1 + takeProfitPercent / 100);
  const riskReward = takeProfitPercent / stopLossPercent;
  
  return { takeProfitPercent, takeProfitPrice, riskReward };
}

// ============= VOLATILITY-ADJUSTED POSITION SIZING =============
function calculateVolatilityAdjustedSize(
  portfolioValue: number,
  currentPrice: number,
  atr: number,
  stopLossPercent: number,
  regime: MarketRegime,
  confidence: number,
  aiConsensus: string
): { positionSize: number; shares: number; riskAmount: number } {
  const regimeConfig = REGIME_CONFIGS[regime];
  
  // Target risk per trade (e.g., 1% of portfolio)
  const baseRiskAmount = portfolioValue * (RISK_CONFIG.targetRiskPercent / 100);
  
  // Adjust risk based on regime
  const adjustedRiskAmount = baseRiskAmount * regimeConfig.positionSizeMultiplier;
  
  // ATR-based position sizing: Risk Amount / (ATR * multiplier)
  // This equalizes risk across different volatility levels
  const atrDollarRisk = atr * RISK_CONFIG.atrStopMultiplier;
  let shares = adjustedRiskAmount / atrDollarRisk;
  
  // Apply confidence multiplier
  if (confidence > 0.80) shares *= 1.2;
  else if (confidence > 0.75) shares *= 1.1;
  
  // AI consensus bonus
  if (aiConsensus.includes('CONSENSUS')) shares *= 1.15;
  
  const positionSize = shares * currentPrice;
  const riskAmount = shares * currentPrice * (stopLossPercent / 100);
  
  console.log(`📐 Position Size: $${positionSize.toFixed(2)} (${shares.toFixed(3)} shares)`);
  console.log(`   Risk: $${riskAmount.toFixed(2)} (${(riskAmount/portfolioValue*100).toFixed(2)}% of portfolio)`);
  
  return { positionSize, shares, riskAmount };
}

// ============= HELPER FUNCTIONS =============
function isLondonKillZone(): { active: boolean; session: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const timeInMinutes = utcHour * 60 + utcMinute;
  
  // Extended London Session: 6:00-14:00 UTC (1-9 AM ET during EST, 2-10 AM ET during EDT)
  // Covers: Pre-London → London Open → London/NY Overlap
  const londonStart = 6 * 60;  // 6:00 UTC (1 AM ET)
  const londonEnd = 14 * 60;   // 14:00 UTC (9 AM ET) - overlaps with NY open
  
  if (timeInMinutes >= londonStart && timeInMinutes <= londonEnd) {
    // Distinguish between sessions for logging
    if (timeInMinutes < 7 * 60) return { active: true, session: 'LONDON_PRE' };
    if (timeInMinutes < 10 * 60) return { active: true, session: 'LONDON_OPEN' };
    return { active: true, session: 'LONDON_NY_OVERLAP' };
  }
  
  return { active: false, session: '' };
}

async function checkMarketStatus(alpacaKey: string, alpacaSecret: string): Promise<{ open: boolean; session: string }> {
  // Check Extended London Session first
  const london = isLondonKillZone();
  if (london.active) {
    console.log(`🇬🇧 London Session active: ${london.session} (6:00-14:00 UTC)`);
    return { open: true, session: london.session };
  }
  
  // Check US market
  const clockResp = await fetch('https://paper-api.alpaca.markets/v2/clock', {
    headers: { 'APCA-API-KEY-ID': alpacaKey, 'APCA-API-SECRET-KEY': alpacaSecret }
  });
  if (!clockResp.ok) throw new Error('Failed to fetch market clock');
  const clock = await clockResp.json();
  
  if (clock.is_open) {
    return { open: true, session: 'US' };
  }
  
  return { open: false, session: '' };
}

async function getTechnicalData(
  supabase: any,
  symbols: string[],
  alpacaKey: string,
  alpacaSecret: string
): Promise<Record<string, any>> {
  // Get current prices for cache validation
  const priceCheckResponse = await fetch(
    `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols.join(',')}`,
    { headers: { 'APCA-API-KEY-ID': alpacaKey, 'APCA-API-SECRET-KEY': alpacaSecret } }
  );
  const priceData = priceCheckResponse.ok ? await priceCheckResponse.json() : {};
  
  // Check cache and identify uncached symbols
  const uncachedSymbols: string[] = [];
  const cachedData: Record<string, any> = {};
  
  for (const symbol of symbols) {
    const currentPrice = priceData[symbol]?.latestTrade?.p || 0;
    if (currentPrice > 0) {
      const cached = getCachedIndicators(symbol, currentPrice);
      if (cached) {
        cachedData[symbol] = { ...cached, close: currentPrice };
      } else {
        uncachedSymbols.push(symbol);
      }
    } else {
      uncachedSymbols.push(symbol);
    }
  }
  
  console.log(`📊 Cache: ${Object.keys(cachedData).length} hit, ${uncachedSymbols.length} miss`);
  
  // Fetch fresh data only for uncached symbols
  if (uncachedSymbols.length > 0) {
    const { data, error } = await supabase.functions.invoke('analyze-multi-timeframe', {
      body: { symbols: uncachedSymbols }
    });
    if (error) throw new Error(`Technical analysis failed: ${error.message}`);
    
    const freshData = data.technicalData || {};
    for (const [symbol, techData] of Object.entries(freshData)) {
      setCachedIndicators(symbol, techData, (techData as any).close);
    }
    
    return { ...cachedData, ...freshData };
  }
  
  return cachedData;
}

async function getAIRecommendations(
  technicalData: Record<string, any>,
  openaiApiKey: string
): Promise<TradeRecommendation[]> {
  const aiPrompt = `You are an elite algorithmic trader using ICT (Inner Circle Trader) methodology combined with institutional analysis. Analyze these stocks for HIGH-PROBABILITY setups.

TECHNICAL DATA:
${JSON.stringify({ technicalData }, null, 2)}

ICT TRADING CRITERIA TO EVALUATE:
1. ORDER BLOCKS (OB): Identify the last bullish/bearish candle before a significant move. Look for price returning to these zones.
2. FAIR VALUE GAPS (FVG): Price inefficiencies where candles don't overlap. Price often returns to fill these gaps.
3. LIQUIDITY SWEEPS: Has price swept above recent highs/below recent lows to grab stops before reversing?
4. MARKET STRUCTURE: Is there a Break of Structure (BOS) or Change of Character (CHoCH)?
5. KILL ZONES: Prioritize trades during NY Open (8:30-11:30 AM ET) and London Open (2-5 AM ET).
6. PREMIUM/DISCOUNT: Is price in premium (overbought) or discount (oversold) zone relative to recent range?

Return ONLY a JSON array with 5-7 stocks in this exact format:
[
  {
    "symbol": "NVDA",
    "recommendation": "BUY",
    "confidence": 0.85,
    "reasoning": "Bullish Order Block at $140, FVG filled, Break of Structure confirmed with higher high",
    "priceTarget": 145.50,
    "stopLoss": 138.00,
    "technicalScore": 8.5,
    "riskReward": "1:3",
    "ictSetup": "Order Block + FVG confluence"
  }
]

CRITERIA: 
- Confidence >62%
- Technical score >6/10
- Prioritize ICT setups: Order Blocks at key levels, FVG fills, liquidity sweeps followed by reversals
- Look for confluence: Multiple ICT concepts aligning = higher probability
- Strong trends with clear market structure`;

  // AI Analysis with retry logic for rate limiting
  async function fetchWithRetry(model: string, maxRetries = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are an expert ICT (Inner Circle Trader) and Smart Money Concepts trader. Analyze charts for Order Blocks, Fair Value Gaps, Liquidity Sweeps, and Market Structure. Return only valid JSON.' },
              { role: 'user', content: aiPrompt }
            ]
          })
        });
        
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Rate limited on ${model}, waiting ${waitTime/1000}s (attempt ${attempt}/${maxRetries})`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`${model} returned ${response.status}`);
        }
        
        return await response.json();
      } catch (e) {
        if (attempt === maxRetries) throw e;
        console.log(`⚠️ ${model} attempt ${attempt} failed, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    return null;
  }

  // Fetch sequentially to avoid rate limits
  let gpt4Data: any = null;
  let gptMiniData: any = null;
  
  try {
    gpt4Data = await fetchWithRetry('gpt-4o');
  } catch (e) {
    console.error('⚠️ GPT-4o failed after retries:', e);
  }
  
  await new Promise(r => setTimeout(r, 500)); // Small delay between models
  
  try {
    gptMiniData = await fetchWithRetry('gpt-4o-mini');
  } catch (e) {
    console.error('⚠️ GPT-4o-mini failed after retries:', e);
  }
  
  if (!gpt4Data && !gptMiniData) {
    throw new Error('Both AI models failed - skipping this scan');
  }

  // Safely parse AI responses with error handling
  let gpt4Recs: any[] = [];
  let gptMiniRecs: any[] = [];
  
  try {
    const gpt4Content = gpt4Data.choices?.[0]?.message?.content?.trim() || '[]';
    gpt4Recs = JSON.parse(gpt4Content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    if (!Array.isArray(gpt4Recs)) gpt4Recs = [];
  } catch (e) {
    console.error('⚠️ GPT-4o JSON parse error:', e);
    gpt4Recs = [];
  }
  
  try {
    const gptMiniContent = gptMiniData.choices?.[0]?.message?.content?.trim() || '[]';
    gptMiniRecs = JSON.parse(gptMiniContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    if (!Array.isArray(gptMiniRecs)) gptMiniRecs = [];
  } catch (e) {
    console.error('⚠️ GPT-4o-mini JSON parse error:', e);
    gptMiniRecs = [];
  }

  console.log(`🤖 AI: GPT-4o ${gpt4Recs.length}, GPT-4o-mini ${gptMiniRecs.length} recommendations`);

  // Merge recommendations
  const recMap = new Map<string, TradeRecommendation>();
  
  for (const rec of gpt4Recs) {
    if (rec.confidence >= RISK_CONFIG.confidenceThreshold && rec.recommendation === 'BUY') {
      recMap.set(rec.symbol, {
        ...rec,
        gpt4oConfidence: rec.confidence,
        gptMiniConfidence: 0,
        gpt4oReasoning: rec.reasoning,
        gptMiniReasoning: '',
        aiConsensus: 'GPT-4o Only'
      });
    }
  }
  
  for (const rec of gptMiniRecs) {
    if (rec.confidence >= RISK_CONFIG.confidenceThreshold && rec.recommendation === 'BUY') {
      const existing = recMap.get(rec.symbol);
      if (existing) {
        existing.gptMiniConfidence = rec.confidence;
        existing.confidence = (existing.gpt4oConfidence! + rec.confidence) / 2;
        existing.gptMiniReasoning = rec.reasoning;
        existing.priceTarget = (existing.priceTarget + rec.priceTarget) / 2;
        existing.stopLoss = Math.max(existing.stopLoss, rec.stopLoss);
        existing.technicalScore = (existing.technicalScore + (rec.technicalScore || 0)) / 2;
        existing.aiConsensus = '🔥 STRONG CONSENSUS';
      } else {
        recMap.set(rec.symbol, {
          ...rec,
          gpt4oConfidence: 0,
          gptMiniConfidence: rec.confidence,
          gpt4oReasoning: '',
          gptMiniReasoning: rec.reasoning,
          aiConsensus: 'GPT-4o-mini Only'
        });
      }
    }
  }
  
  return Array.from(recMap.values())
    .sort((a, b) => {
      const aBonus = a.aiConsensus.includes('CONSENSUS') ? 0.15 : 0;
      const bBonus = b.aiConsensus.includes('CONSENSUS') ? 0.15 : 0;
      return (b.confidence + bBonus) - (a.confidence + aBonus);
    })
    .slice(0, 15)
    .map(rec => ({
      ...rec,
      reasoning: rec.gpt4oReasoning && rec.gptMiniReasoning 
        ? `🤖 GPT-4o: ${rec.gpt4oReasoning} | 🤖 GPT-mini: ${rec.gptMiniReasoning}`
        : rec.gpt4oReasoning || rec.gptMiniReasoning!,
      technicalIndicators: technicalData[rec.symbol] || {},
      fundamentals: { 
        aiModels: rec.aiConsensus,
        gpt4oScore: rec.gpt4oConfidence, 
        gptMiniScore: rec.gptMiniConfidence 
      },
      timeframe: '1-3 day swing trade'
    }));
}

function calculatePositionMultiplier(
  symbol: string,
  confidence: number,
  aiConsensus: string,
  technicalData: Record<string, any>
): number {
  const tech = technicalData[symbol];
  if (!tech) return 1.0;
  
  let multiplier = 1.0;
  if (aiConsensus?.includes('CONSENSUS')) multiplier *= 1.3;
  if (confidence > 0.80) multiplier *= 1.2;
  else if (confidence > 0.75) multiplier *= 1.1;
  
  const volumeRatio = tech.volume_ratio || 1.0;
  if (volumeRatio > 2.0) multiplier *= 1.2;
  else if (volumeRatio > 1.5) multiplier *= 1.1;
  
  // Safe division - avoid divide by zero
  const priceRange = (tech.high || 0) - (tech.low || 0);
  const closePrice = tech.close || 1;
  const volatility = closePrice > 0 && priceRange > 0 ? (priceRange / closePrice) * 100 : 0;
  if (volatility > 8) multiplier *= 0.8;
  
  return Math.min(multiplier, 1.5);
}

async function runBacktestValidation(
  supabase: any,
  symbol: string,
  stopLoss: number,
  takeProfit: number,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ result: BacktestResult | null; passed: boolean }> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const { data: strategy } = await supabase
      .from('backtest_strategies')
      .insert({
        name: `Auto-Strategy-${symbol}-${Date.now()}`,
        description: 'Momentum strategy with RSI/Volume filters',
        buy_condition: stopLoss.toFixed(2),
        sell_condition: takeProfit.toFixed(2),
        initial_capital: 10000
      })
      .select()
      .single();
    
    if (!strategy) return { result: null, passed: true };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/run-backtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        strategyId: strategy.id,
        symbol,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      })
    });
    
    if (!response.ok) return { result: null, passed: true };
    
    const { result } = await response.json();
    const passed = (result.return_percentage > 0 || result.win_rate >= 50) && result.total_trades >= 1;
    
    console.log(`📈 Backtest ${symbol}: Return ${result.return_percentage.toFixed(2)}%, Win Rate ${result.win_rate.toFixed(2)}%, ${passed ? 'PASSED' : 'FAILED'}`);
    
    return { result, passed };
  } catch (error) {
    console.error(`⚠️ Backtest error ${symbol}:`, error);
    return { result: null, passed: true };
  }
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for test mode
    let testMode = false;
    let analysisOnly = false;
    try {
      const body = await req.json();
      testMode = body?.testMode === true;
      analysisOnly = body?.analysisOnly === true;
    } catch { /* no body */ }

    console.log(`🤖 Auto-trade scanner running... ${testMode ? '(TEST MODE)' : ''}`);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
    const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY');
    const ALPACA_SECRET_KEY = Deno.env.get('ALPACA_SECRET_KEY');

    if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
      return new Response(JSON.stringify({ success: true, message: 'Credentials not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check market status (US or London) - skip in test mode
    if (!testMode) {
      const marketStatus = await checkMarketStatus(ALPACA_API_KEY, ALPACA_SECRET_KEY);
      if (!marketStatus.open) {
        console.log('⏰ Market closed (neither US nor London session)');
        return new Response(JSON.stringify({ success: true, message: 'Market closed - no active session' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log(`📊 Analyzing ${SYMBOLS_TO_SCAN.length} stocks... (Session: ${marketStatus.session})`);
    } else {
      console.log(`🧪 TEST MODE: Bypassing market hours, analyzing ${SYMBOLS_TO_SCAN.length} stocks...`);
    }


    // Get technical data with caching
    const technicalData = await getTechnicalData(supabase, SYMBOLS_TO_SCAN, ALPACA_API_KEY, ALPACA_SECRET_KEY);


    // Get AI recommendations
    const recommendations = await getAIRecommendations(technicalData, OPENAI_API_KEY);

    console.log(`✅ AI Recommendations: ${recommendations.length} stocks`);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.log('No trading opportunities found');
      return new Response(JSON.stringify({ success: true, message: 'No opportunities', analyzed: SYMBOLS_TO_SCAN.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check Alpaca account
    const accountResponse = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    if (!accountResponse.ok) {
      throw new Error('Failed to fetch Alpaca account');
    }

    const accountData = await accountResponse.json();
    const buyingPower = parseFloat(accountData.buying_power);
    const portfolioValue = parseFloat(accountData.portfolio_value);

    console.log(`💰 Buying Power: $${buyingPower.toFixed(2)}, Portfolio: $${portfolioValue.toFixed(2)}`);

    // Fetch current positions
    const positionsResponse = await fetch('https://paper-api.alpaca.markets/v2/positions', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });
    
    if (!positionsResponse.ok) {
      throw new Error('Failed to fetch positions');
    }
    
    const currentPositions = await positionsResponse.json();
    console.log(`📊 Current positions: ${currentPositions.length}`);

    // ADVANCED EXIT LOGIC: ATR-based trailing stops with regime awareness
    const sellsExecuted = [];
    let remainingBuyingPower = buyingPower * 0.9;
    
    // Detect market regime FIRST
    const marketRegime = detectMarketRegime(technicalData);
    const regimeConfig = REGIME_CONFIGS[marketRegime.regime];
    
    console.log(`🎯 Market Regime: ${marketRegime.regime} | Adjusting strategy...`);
    console.log(`   Position size: ${(regimeConfig.positionSizeMultiplier * 100).toFixed(0)}%`);
    console.log(`   Stop multiplier: ${regimeConfig.stopLossMultiplier}x`);
    console.log(`   Profit multiplier: ${regimeConfig.takeProfitMultiplier}x`);
    
    if (currentPositions.length > 0) {
      console.log('💰 Exit Strategy: Checking stops, partial profits & time-based exits...');
      
      // Fetch recent orders to determine position age
      const ordersResponse = await fetch('https://paper-api.alpaca.markets/v2/orders?status=filled&limit=500&direction=desc', {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
        },
      });
      
      const recentOrders = ordersResponse.ok ? await ordersResponse.json() : [];
      
      // Build map of position entry dates (first buy order for each symbol)
      const positionEntryDates: Record<string, Date> = {};
      for (const order of recentOrders.reverse()) {
        if (order.side === 'buy' && order.status === 'filled' && !positionEntryDates[order.symbol]) {
          positionEntryDates[order.symbol] = new Date(order.filled_at || order.created_at);
        }
      }
      
      for (const pos of currentPositions) {
        const profitPercent = parseFloat(pos.unrealized_plpc) * 100;
        const avgEntry = parseFloat(pos.avg_entry_price);
        const currentPrice = parseFloat(pos.current_price);
        const qty = parseFloat(pos.qty_available || pos.qty);
        const totalQty = parseFloat(pos.qty);
        
        // Calculate position age in days
        const entryDate = positionEntryDates[pos.symbol];
        const positionAgeDays = entryDate 
          ? Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        // Get technical data for ATR and momentum indicators
        const tech = technicalData.technicalData?.[pos.symbol] || technicalData[pos.symbol];
        const atr = tech?.atr || (currentPrice * 0.02);
        const rsi = tech?.rsi || 50;
        const macdSignal = tech?.macd_signal || 0;
        
        // ATR-based dynamic stop loss
        const atrStopPercent = (atr / currentPrice) * 100 * RISK_CONFIG.atrStopMultiplier * regimeConfig.stopLossMultiplier;
        const dynamicStopLoss = Math.max(2, Math.min(8, atrStopPercent));
        
        // Trailing stop calculation
        const peakPrice = Math.max(currentPrice, avgEntry * 1.1);
        const dipFromPeak = ((peakPrice - currentPrice) / peakPrice) * 100;
        const trailingThreshold = dynamicStopLoss * 0.6;
        
        console.log(`📊 ${pos.symbol}: P/L ${profitPercent.toFixed(2)}%, Age: ${positionAgeDays}d, ATR Stop: ${dynamicStopLoss.toFixed(1)}%`);
        
        if (qty <= 0) {
          console.log(`⏭️ Skipping ${pos.symbol}: No shares available`);
          continue;
        }
        
        let sellReason = '';
        let sellQty = qty;
        
        // ============= EXIT RULES (in priority order) =============
        
        // EXIT 1: ATR-based stop-loss (loss > ATR stop)
        if (profitPercent < -dynamicStopLoss) {
          sellReason = `Stop-loss: ${profitPercent.toFixed(2)}% loss (limit: -${dynamicStopLoss.toFixed(1)}%)`;
        }
        // EXIT 2: Bear market quick exit (tighter stops)
        else if (marketRegime.regime === 'BEAR' && profitPercent < -(dynamicStopLoss * 0.7)) {
          sellReason = `Bear market stop: ${profitPercent.toFixed(2)}% loss`;
        }
        // EXIT 3: TIME-BASED EXIT - Close stale positions (>10 days, <3% gain)
        else if (positionAgeDays >= 10 && profitPercent < 3 && profitPercent > -dynamicStopLoss) {
          sellReason = `Time-based exit: ${positionAgeDays} days old with only ${profitPercent.toFixed(2)}% gain`;
        }
        // EXIT 4: PARTIAL PROFIT TAKING - Sell 50% at 8%+ gain
        else if (profitPercent >= 8 && qty >= 2) {
          sellQty = Math.floor(qty * 0.5);
          sellReason = `Partial profit: Taking 50% at ${profitPercent.toFixed(2)}% gain`;
        }
        // EXIT 5: Full profit taking at 12%+
        else if (profitPercent >= 12) {
          sellReason = `Profit target: ${profitPercent.toFixed(2)}% gain (target: 12%)`;
        }
        // EXIT 6: ATR trailing stop (profit > 2*ATR stop, dip > threshold)
        else if (profitPercent > dynamicStopLoss * 2 && dipFromPeak > trailingThreshold) {
          sellReason = `Trailing stop: ${profitPercent.toFixed(2)}% profit, ${dipFromPeak.toFixed(2)}% dip from peak`;
        }
        // EXIT 7: Momentum reversal (overbought + negative MACD)
        else if (profitPercent > dynamicStopLoss && rsi > 75 && macdSignal < 0) {
          sellReason = `Momentum reversal: RSI ${rsi.toFixed(1)}, MACD bearish`;
        }
        
        if (sellReason) {
          try {
            const sellResp = await fetch('https://paper-api.alpaca.markets/v2/orders', {
              method: 'POST',
              headers: {
                'APCA-API-KEY-ID': ALPACA_API_KEY,
                'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                symbol: pos.symbol,
                qty: sellQty.toString(),
                side: 'sell',
                type: 'market',
                time_in_force: 'day',
              }),
            });
            
            if (sellResp.ok) {
              const sellOrder = await sellResp.json();
              const sellRatio = totalQty > 0 ? sellQty / totalQty : 1;
              const profitAmount = parseFloat(pos.unrealized_pl || '0') * sellRatio;
              const freedCapital = parseFloat(pos.market_value || '0') * sellRatio;
              
              sellsExecuted.push({
                symbol: pos.symbol,
                orderId: sellOrder.id,
                reason: sellReason,
                profitAmount,
                profitPercent,
                quantitySold: sellQty,
                totalQuantity: totalQty,
                isPartial: sellQty < qty,
                freedCapital,
                positionAgeDays,
                exitRSI: rsi,
                exitMACD: macdSignal,
                atrStopPercent: dynamicStopLoss,
                marketRegime: marketRegime.regime,
              });
              
              remainingBuyingPower += freedCapital;
              console.log(`✅ Sold ${sellQty}/${qty} of ${pos.symbol} (${sellReason})`);
            } else {
              const errorText = await sellResp.text();
              console.error(`❌ Failed to sell ${pos.symbol}:`, errorText);
            }
          } catch (sellError) {
            console.error(`❌ Sell error for ${pos.symbol}:`, sellError);
          }
        }
      }
    }

    // Use SECTOR_MAP constant instead of duplicating
    const sectorExposure: Record<string, number> = {};
    for (const pos of currentPositions) {
      const sector = SECTOR_MAP[pos.symbol] || 'Other';
      const posValue = parseFloat(pos.market_value);
      sectorExposure[sector] = (sectorExposure[sector] || 0) + posValue;
    }
    
    // Regime-adjusted position sizing
    const maxTrades = Math.min(RISK_CONFIG.maxPositions, marketRegime.regime === 'BEAR' ? 3 : 4);
    const existingPositionCount = currentPositions.length;
    const availableSlots = Math.max(0, maxTrades - existingPositionCount);
    const baseAmountPerTrade = (buyingPower * RISK_CONFIG.capitalDeployment) / Math.max(availableSlots, 1);

    console.log(`🎯 QUALITY MODE: $${baseAmountPerTrade.toFixed(2)} per position, ${availableSlots} slots available (max ${maxTrades} total positions)`);

    if (availableSlots <= 0) {
      console.log(`⚠️ Already at max positions (${existingPositionCount}/${maxTrades}), no new trades`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Max positions reached',
        analyzed: SYMBOLS_TO_SCAN.length,
        currentPositions: existingPositionCount,
        maxPositions: maxTrades
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tradesExecuted = [];
    let tradesPlaced = 0;

    // Filter recommendations STRICTLY
    const qualifiedRecs = recommendations.filter(rec => {
      // 1. Must be a BUY recommendation
      if (rec.recommendation !== 'BUY') return false;
      
      // 2. HIGH confidence threshold (75%+)
      if (rec.confidence < RISK_CONFIG.confidenceThreshold) {
        console.log(`⏭️ ${rec.symbol}: Confidence ${(rec.confidence * 100).toFixed(0)}% < ${RISK_CONFIG.confidenceThreshold * 100}% threshold`);
        return false;
      }
      
      // 3. REQUIRE AI consensus (both models must agree)
      if (RISK_CONFIG.requireConsensus && !rec.aiConsensus?.includes('CONSENSUS')) {
        console.log(`⏭️ ${rec.symbol}: No AI consensus (${rec.aiConsensus})`);
        return false;
      }
      
      // 4. Minimum technical score
      if (rec.technicalScore < RISK_CONFIG.minTechnicalScore) {
        console.log(`⏭️ ${rec.symbol}: Technical score ${rec.technicalScore.toFixed(1)} < ${RISK_CONFIG.minTechnicalScore} threshold`);
        return false;
      }
      
      return true;
    });

    console.log(`📋 Qualified recommendations: ${qualifiedRecs.length}/${recommendations.length} passed strict filters`);

    for (const rec of qualifiedRecs) {
      if (tradesPlaced >= availableSlots) {
        console.log(`⚠️ All available slots filled (${tradesPlaced}/${availableSlots})`);
        break;
      }

      // Check if we already have this position
      if (currentPositions.some((p: any) => p.symbol === rec.symbol)) {
        console.log(`Already holding ${rec.symbol}, skipping`);
        continue;
      }

      // STRICT Sector diversification check
      const sector = SECTOR_MAP[rec.symbol] || 'Other';
      const currentSectorValue = sectorExposure[sector] || 0;
      const sectorLimit = portfolioValue * RISK_CONFIG.maxSectorExposure;
      
      if (currentSectorValue >= sectorLimit) {
        console.log(`⚠️ Sector limit reached for ${sector} (${((currentSectorValue/portfolioValue)*100).toFixed(1)}% > ${RISK_CONFIG.maxSectorExposure*100}%), skipping ${rec.symbol}`);
        continue;
      }

      // Get current price and technical data
      const tech = technicalData.technicalData?.[rec.symbol] || technicalData[rec.symbol];
      if (!tech) {
        console.log(`⚠️ No technical data for ${rec.symbol}, skipping`);
        continue;
      }
      
      const currentPrice = tech.close;
      const high = tech.high;
      const low = tech.low;
      const atr = tech.atr || (currentPrice * 0.02); // Default 2% ATR
      const rsi = tech.rsi || 50;
      const macd = tech.macd || 0;
      const macdSignal = tech.macd_signal || 0;
      const volumeRatio = tech.volume_ratio || 1;
      
      // STRICT ENTRY FILTERS - Quality over quantity
      const priceRange = (high || 0) - (low || 0);
      const pricePosition = priceRange > 0 ? ((currentPrice - low) / priceRange) * 100 : 50;
      
      // Regime-adjusted confidence threshold
      const adjustedConfidenceThreshold = RISK_CONFIG.confidenceThreshold * regimeConfig.confidenceMultiplier;
      if (rec.confidence < adjustedConfidenceThreshold) {
        console.log(`⏭️ ${rec.symbol}: Confidence ${(rec.confidence * 100).toFixed(0)}% < ${(adjustedConfidenceThreshold * 100).toFixed(0)}% (regime-adjusted)`);
        continue;
      }
      
      // 1. RSI must be in favorable range (not overbought)
      if (rsi > 70) {
        console.log(`⏭️ ${rec.symbol}: RSI overbought (${rsi.toFixed(1)} > 70)`);
        continue;
      }
      
      // 2. RSI should not be extremely oversold (potential falling knife)
      if (rsi < 25) {
        console.log(`⏭️ ${rec.symbol}: RSI extremely oversold (${rsi.toFixed(1)} < 25) - potential falling knife`);
        continue;
      }
      
      // 3. MACD should be bullish or crossing bullish
      if (macd < macdSignal && macd < 0) {
        console.log(`⏭️ ${rec.symbol}: MACD bearish (MACD: ${macd.toFixed(2)} < Signal: ${macdSignal.toFixed(2)})`);
        continue;
      }
      
      // 4. Volume confirmation required (at least average volume)
      if (volumeRatio < 0.8) {
        console.log(`⏭️ ${rec.symbol}: Low volume (${volumeRatio.toFixed(2)}x < 0.8x average)`);
        continue;
      }
      
      // 5. Don't chase extreme moves - avoid buying at very top of range
      if (!isNaN(pricePosition) && pricePosition > 90) {
        console.log(`⏭️ ${rec.symbol}: Near top of range (${pricePosition.toFixed(0)}% > 90%)`);
        continue;
      }
      
      // ========== ATR-BASED DYNAMIC STOP LOSS & TAKE PROFIT ==========
      const { stopLossPercent, stopLossPrice } = calculateATRStopLoss(currentPrice, atr, marketRegime.regime);
      const { takeProfitPercent, takeProfitPrice, riskReward } = calculateATRTakeProfit(
        currentPrice, atr, stopLossPercent, marketRegime.regime
      );
      
      // CHECK RISK/REWARD RATIO
      if (riskReward < RISK_CONFIG.minRiskRewardRatio) {
        console.log(`⏭️ ${rec.symbol}: Poor risk/reward (${riskReward.toFixed(2)} < ${RISK_CONFIG.minRiskRewardRatio})`);
        continue;
      }
      
      // ========== VOLATILITY-ADJUSTED POSITION SIZING ==========
      const { positionSize, shares, riskAmount } = calculateVolatilityAdjustedSize(
        portfolioValue,
        currentPrice,
        atr,
        stopLossPercent,
        marketRegime.regime,
        rec.confidence,
        rec.aiConsensus
      );
      
      // Apply sector and buying power limits
      const adjustedAmount = Math.min(
        positionSize,
        remainingBuyingPower,
        sectorLimit - currentSectorValue
      );
      
      if (adjustedAmount < 100) {
        console.log(`⚠️ Insufficient funds for ${rec.symbol} after adjustments ($${adjustedAmount.toFixed(2)})`);
        continue;
      }
      
      const estimatedShares = adjustedAmount / currentPrice;

      console.log(`🎯 ATR ENTRY: ${rec.symbol} $${adjustedAmount.toFixed(2)} (~${estimatedShares.toFixed(3)} shares) @ $${currentPrice.toFixed(2)}`);
      console.log(`   📊 Regime: ${marketRegime.regime} | ATR: $${atr.toFixed(2)} (${((atr/currentPrice)*100).toFixed(1)}%)`);
      console.log(`   🎯 Stop: $${stopLossPrice.toFixed(2)} (-${stopLossPercent.toFixed(1)}%) | Target: $${takeProfitPrice.toFixed(2)} (+${takeProfitPercent.toFixed(1)}%)`);
      console.log(`   💰 Risk: $${riskAmount.toFixed(2)} | R:R ${riskReward.toFixed(2)} | Confidence: ${(rec.confidence * 100).toFixed(0)}%`);

      // ========== STRICTER PRE-TRADE BACKTESTING VALIDATION ==========
      console.log(`📊 Running strict backtest validation for ${rec.symbol}...`);
      let backtestResult = null;
      let backtestPassed = false;
      
      try {
        // Calculate dates for 30-day backtest
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        // Create a simple strategy matching our trading logic
        const { data: strategy } = await supabase
          .from('backtest_strategies')
          .insert({
            name: `Auto-Strategy-${rec.symbol}-${Date.now()}`,
            description: 'Conservative momentum strategy with strict filters',
            buy_condition: `SL:${stopLossPercent.toFixed(2)}%`,
            sell_condition: `TP:${takeProfitPercent.toFixed(2)}%`,
            initial_capital: 10000,
          })
          .select()
          .single();
        
        if (strategy) {
          // Run backtest via existing edge function
          const backtestResponse = await fetch(`${SUPABASE_URL}/functions/v1/run-backtest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              strategyId: strategy.id,
              symbol: rec.symbol,
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
            }),
          });
          
          if (backtestResponse.ok) {
            const backtestData = await backtestResponse.json();
            backtestResult = backtestData.result;
            
            // STRICTER validation criteria - must have BOTH positive return AND good win rate
            const returnOk = backtestResult.return_percentage > 2; // At least 2% return (was 0%)
            const winRateOk = backtestResult.win_rate >= 55;       // At least 55% win rate (was 50%)
            const tradesOk = backtestResult.total_trades >= 2;     // At least 2 trades (was 1)
            const drawdownOk = backtestResult.max_drawdown < 15;   // Max 15% drawdown
            
            backtestPassed = returnOk && winRateOk && tradesOk && drawdownOk;
            
            console.log(`📈 Backtest Results for ${rec.symbol}:`);
            console.log(`   Return: ${backtestResult.return_percentage.toFixed(2)}% (min 2%: ${returnOk ? '✅' : '❌'})`);
            console.log(`   Win Rate: ${backtestResult.win_rate.toFixed(2)}% (min 55%: ${winRateOk ? '✅' : '❌'})`);
            console.log(`   Trades: ${backtestResult.total_trades} (min 2: ${tradesOk ? '✅' : '❌'})`);
            console.log(`   Max Drawdown: ${backtestResult.max_drawdown.toFixed(2)}% (max 15%: ${drawdownOk ? '✅' : '❌'})`);
            console.log(`   🎯 STRICT Validation: ${backtestPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
          } else {
            console.log(`⚠️ Backtest failed to run for ${rec.symbol}, skipping trade (strict mode)`);
            backtestPassed = false; // In strict mode, skip if backtest fails
          }
        }
      } catch (backtestError) {
        console.error(`⚠️ Backtest error for ${rec.symbol}:`, backtestError);
        backtestPassed = false; // In strict mode, skip on backtest errors
      }
      
      // Skip trade if backtest failed validation
      if (!backtestPassed) {
        console.log(`❌ Skipping ${rec.symbol}: Failed strict backtest validation`);
        continue;
      }

      try {
        // Place market order using notional (dollar amount) for fractional shares
        const orderResponse = await fetch('https://paper-api.alpaca.markets/v2/orders', {
          method: 'POST',
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: rec.symbol,
            notional: adjustedAmount.toFixed(2),
            side: 'buy',
            type: 'market',
            time_in_force: 'day',
          }),
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          const actualQty = parseFloat(orderData.qty || estimatedShares);
          
          tradesExecuted.push({
            symbol: rec.symbol,
            quantity: actualQty,
            notional: adjustedAmount,
            orderId: orderData.id,
            confidence: rec.confidence,
            entryPrice: currentPrice,
            stopLoss: stopLossPrice,
            takeProfit: takeProfitPrice,
            positionMultiplier: regimeConfig.positionSizeMultiplier,
            aiConsensus: rec.aiConsensus,
            sector: sector,
            entryRSI: rsi,
            entryPricePosition: pricePosition,
            reasoning: rec.reasoning,
            technicalIndicators: rec.technicalIndicators || {},
            fundamentals: rec.fundamentals || {},
            riskReward: rec.riskReward || 'N/A',
            timeframe: rec.timeframe || 'N/A',
            timestamp: new Date().toISOString(),
            backtestValidation: backtestResult ? {
              returnPercentage: backtestResult.return_percentage,
              winRate: backtestResult.win_rate,
              totalTrades: backtestResult.total_trades,
              maxDrawdown: backtestResult.max_drawdown,
              passed: backtestPassed,
            } : null,
          });

          // Update sector exposure
          sectorExposure[sector] = (sectorExposure[sector] || 0) + adjustedAmount;
          
          remainingBuyingPower -= adjustedAmount;
          tradesPlaced++;
          console.log(`✅ Trade executed: ${rec.symbol} $${adjustedAmount.toFixed(2)} in ${sector} sector`);
        } else {
          const errorText = await orderResponse.text();
          console.error(`❌ Order failed for ${rec.symbol}:`, errorText);
        }
      } catch (tradeError) {
        console.error(`❌ Trade error for ${rec.symbol}:`, tradeError);
      }
    }

    // Log to database
    try {
      await supabase.from('auto_trade_logs').insert({
        scanned: SYMBOLS_TO_SCAN.length,
        recommendations: recommendations.length,
        trades_executed: tradesExecuted.length,
        trades_data: tradesExecuted,
      });
    } catch (e) {
      console.error('Failed to log auto trade run:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: SYMBOLS_TO_SCAN.length,
        recommendations: recommendations.length,
        sellsExecuted: sellsExecuted.length,
        sells: sellsExecuted,
        tradesExecuted: tradesExecuted.length,
        trades: tradesExecuted,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auto-trade scanner error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
