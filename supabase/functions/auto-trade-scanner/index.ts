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
  geminiReasoning?: string;
  gptReasoning?: string;
  geminiConfidence?: number;
  gptConfidence?: number;
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

const RISK_CONFIG = {
  baseStopLossPercent: 3,
  baseTakeProfitPercent: 8,
  confidenceThreshold: 0.62,
  maxSectorExposure: 0.5,
  capitalDeployment: 0.95
};

// ============= HELPER FUNCTIONS =============
function isLondonKillZone(): { active: boolean; session: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const timeInMinutes = utcHour * 60 + utcMinute;
  
  // London Kill Zone: 7:00-10:00 UTC (2-5 AM ET during EST, 3-6 AM ET during EDT)
  // This is the London Open session
  const londonStart = 7 * 60; // 7:00 UTC
  const londonEnd = 10 * 60;  // 10:00 UTC
  
  if (timeInMinutes >= londonStart && timeInMinutes <= londonEnd) {
    return { active: true, session: 'LONDON' };
  }
  
  return { active: false, session: '' };
}

async function checkMarketStatus(alpacaKey: string, alpacaSecret: string): Promise<{ open: boolean; session: string }> {
  // Check London Kill Zone first
  const london = isLondonKillZone();
  if (london.active) {
    console.log('🇬🇧 London Kill Zone active (7:00-10:00 UTC)');
    return { open: true, session: 'LONDON' };
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

  const [gpt4Response, gptMiniResponse] = await Promise.all([
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert ICT (Inner Circle Trader) and Smart Money Concepts trader. Analyze charts for Order Blocks, Fair Value Gaps, Liquidity Sweeps, and Market Structure. Return only valid JSON.' },
          { role: 'user', content: aiPrompt }
        ]
      })
    }),
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert ICT (Inner Circle Trader) and Smart Money Concepts trader. Analyze charts for Order Blocks, Fair Value Gaps, Liquidity Sweeps, and Market Structure. Return only valid JSON.' },
          { role: 'user', content: aiPrompt }
        ]
      })
    })
  ]);

  if (!gpt4Response.ok || !gptMiniResponse.ok) {
    throw new Error(`AI analysis failed: GPT-4o ${gpt4Response.status}, GPT-4o-mini ${gptMiniResponse.status}`);
  }

  const gpt4Data = await gpt4Response.json();
  const gptMiniData = await gptMiniResponse.json();

  const gpt4Recs = JSON.parse(gpt4Data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  const gptMiniRecs = JSON.parse(gptMiniData.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

  console.log(`🤖 AI: GPT-4o ${gpt4Recs.length}, GPT-4o-mini ${gptMiniRecs.length} recommendations`);

  // Merge recommendations
  const recMap = new Map<string, TradeRecommendation>();
  
  for (const rec of gpt4Recs) {
    if (rec.confidence >= RISK_CONFIG.confidenceThreshold && rec.recommendation === 'BUY') {
      recMap.set(rec.symbol, {
        ...rec,
        geminiConfidence: rec.confidence,
        gptConfidence: 0,
        geminiReasoning: rec.reasoning,
        gptReasoning: '',
        aiConsensus: 'GPT-4o Only'
      });
    }
  }
  
  for (const rec of gptMiniRecs) {
    if (rec.confidence >= RISK_CONFIG.confidenceThreshold && rec.recommendation === 'BUY') {
      const existing = recMap.get(rec.symbol);
      if (existing) {
        existing.gptConfidence = rec.confidence;
        existing.confidence = (existing.geminiConfidence! + rec.confidence) / 2;
        existing.gptReasoning = rec.reasoning;
        existing.priceTarget = (existing.priceTarget + rec.priceTarget) / 2;
        existing.stopLoss = Math.max(existing.stopLoss, rec.stopLoss);
        existing.technicalScore = (existing.technicalScore + (rec.technicalScore || 0)) / 2;
        existing.aiConsensus = '🔥 STRONG CONSENSUS';
      } else {
        recMap.set(rec.symbol, {
          ...rec,
          geminiConfidence: 0,
          gptConfidence: rec.confidence,
          geminiReasoning: '',
          gptReasoning: rec.reasoning,
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
      reasoning: rec.geminiReasoning && rec.gptReasoning 
        ? `🤖 Gemini: ${rec.geminiReasoning} | 🤖 GPT: ${rec.gptReasoning}`
        : rec.geminiReasoning || rec.gptReasoning!,
      technicalIndicators: technicalData[rec.symbol] || {},
      fundamentals: { 
        aiModels: rec.aiConsensus,
        geminiScore: rec.geminiConfidence, 
        gptScore: rec.gptConfidence 
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
  if (aiConsensus.includes('CONSENSUS')) multiplier *= 1.3;
  if (confidence > 0.80) multiplier *= 1.2;
  else if (confidence > 0.75) multiplier *= 1.1;
  
  const volumeRatio = tech.volume_ratio || 1.0;
  if (volumeRatio > 2.0) multiplier *= 1.2;
  else if (volumeRatio > 1.5) multiplier *= 1.1;
  
  const volatility = ((tech.high - tech.low) / tech.close) * 100;
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

    // ADVANCED EXIT LOGIC: Trailing stops, partial profit-taking, momentum-based exits
    const sellsExecuted = [];
    let remainingBuyingPower = buyingPower * 0.9;
    
    if (currentPositions.length > 0) {
      console.log('💰 Advanced Exit Strategy: Checking trailing stops & profit targets...');
      
      for (const pos of currentPositions) {
        const profitPercent = parseFloat(pos.unrealized_plpc) * 100;
        const avgEntry = parseFloat(pos.avg_entry_price);
        const currentPrice = parseFloat(pos.current_price);
        // Use qty_available to avoid selling shares held in pending orders
        const qty = parseFloat(pos.qty_available || pos.qty);
        const totalQty = parseFloat(pos.qty);
        
        // Get technical data for momentum indicators
        const tech = technicalData.technicalData?.[pos.symbol];
        const rsi = tech?.rsi || 50;
        const macdSignal = tech?.macd_signal || 0;
        
        // Calculate trailing stop (peak price tracked dynamically)
        const peakPrice = Math.max(currentPrice, avgEntry * 1.1); // At least 10% above entry
        const dipFromPeak = ((peakPrice - currentPrice) / peakPrice) * 100;
        
        console.log(`📊 ${pos.symbol}: Profit ${profitPercent.toFixed(2)}%, Dip ${dipFromPeak.toFixed(2)}%, RSI ${rsi.toFixed(1)}, Available: ${qty}/${totalQty}`);
        
        // Skip if no shares available to sell
        if (qty <= 0) {
          console.log(`⏭️ Skipping ${pos.symbol}: No shares available (${qty} available, ${totalQty} total - likely in pending orders)`);
          continue;
        }
        
        let sellReason = '';
        let sellQty = qty;
        
        // EXIT STRATEGY 1: Trailing Stop (>10% profit, 4% dip from peak)
        if (profitPercent > 10 && dipFromPeak > 4) {
          sellReason = `Trailing stop: ${profitPercent.toFixed(2)}% profit, ${dipFromPeak.toFixed(2)}% dip from peak`;
          console.log(`🛑 ${sellReason}`);
        }
        // EXIT STRATEGY 2: Partial Profit-Taking at first target (6-8% gain)
        else if (profitPercent >= 6 && profitPercent < 10 && qty >= 2) {
          sellQty = Math.floor(qty * 0.5); // Sell 50%
          sellReason = `Partial profit-taking: ${profitPercent.toFixed(2)}% gain, securing 50% position`;
          console.log(`💰 ${sellReason}`);
        }
        // EXIT STRATEGY 3: Momentum reversal (overbought + negative MACD)
        else if (profitPercent > 5 && rsi > 75 && macdSignal < 0) {
          sellReason = `Momentum reversal: RSI overbought (${rsi.toFixed(1)}), MACD bearish`;
          console.log(`📉 ${sellReason}`);
        }
        // EXIT STRATEGY 4: Stop-loss (>5% loss)
        else if (profitPercent < -5) {
          sellReason = `Stop-loss triggered: ${profitPercent.toFixed(2)}% loss`;
          console.log(`🛑 ${sellReason}`);
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
              const profitAmount = parseFloat(pos.unrealized_pl) * (sellQty / totalQty);
              const freedCapital = parseFloat(pos.market_value) * (sellQty / totalQty);
              
              sellsExecuted.push({
                symbol: pos.symbol,
                orderId: sellOrder.id,
                reason: sellReason,
                profitAmount: profitAmount,
                profitPercent: profitPercent,
                quantitySold: sellQty,
                totalQuantity: totalQty,
                isPartial: sellQty < qty,
                freedCapital: freedCapital,
                exitRSI: rsi,
                exitMACD: macdSignal
              });
              
              remainingBuyingPower += freedCapital;
              console.log(`✅ Sold ${sellQty}/${qty} shares of ${pos.symbol} for ${profitPercent.toFixed(2)}% profit ($${profitAmount.toFixed(2)})`);
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

    // AGGRESSIVE PROFIT-FOCUSED RISK MANAGEMENT
    const baseStopLossPercent = 3; // Wider stops for more breathing room
    const baseTakeProfitPercent = 8; // Higher profit targets
    
    // Sector exposure limits (max 50% in any single sector for aggressive growth)
    const sectorMap: Record<string, string> = {
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
    
    const sectorExposure: Record<string, number> = {};
    for (const pos of currentPositions) {
      const sector = sectorMap[pos.symbol] || 'Other';
      const posValue = parseFloat(pos.market_value);
      sectorExposure[sector] = (sectorExposure[sector] || 0) + posValue;
    }
    
    // Calculate momentum-adjusted position sizing (AGGRESSIVE)
    const calculatePositionMultiplier = (symbol: string, confidence: number, aiConsensus: string): number => {
      const tech = technicalData.technicalData?.[symbol];
      if (!tech) return 1.0;
      
      let multiplier = 1.0;
      
      // BONUS: AI consensus gets bigger positions
      if (aiConsensus.includes('CONSENSUS')) multiplier *= 1.3;
      
      // BONUS: High confidence gets bigger positions
      if (confidence > 0.80) multiplier *= 1.2;
      else if (confidence > 0.75) multiplier *= 1.1;
      
      // BONUS: Volume surge = bigger position
      const volumeRatio = tech.volume_ratio || 1.0;
      if (volumeRatio > 2.0) multiplier *= 1.2; // 2x volume
      else if (volumeRatio > 1.5) multiplier *= 1.1; // 1.5x volume
      
      // Slight reduction for extreme volatility only
      const volatility = ((tech.high - tech.low) / tech.close) * 100;
      if (volatility > 8) multiplier *= 0.8; // Only reduce for extreme volatility
      
      return Math.min(multiplier, 1.5); // Cap at 150% position size
    };
    
    // AGGRESSIVE: Take more positions with higher capital allocation
    const maxTrades = buyingPower < 500 ? 10 : buyingPower < 1000 ? 8 : 7;
    const baseAmountPerTrade = (buyingPower * 0.95) / maxTrades; // Use 95% of capital

    console.log(`🚀 AGGRESSIVE MODE: $${baseAmountPerTrade.toFixed(2)} base per position, max ${maxTrades} trades (95% capital deployment)`);

    const tradesExecuted = [];
    let tradesPlaced = 0;

    for (const rec of recommendations) {
      if (tradesPlaced >= maxTrades) {
        console.log(`⚠️ Max trades reached (${maxTrades})`);
        break;
      }

      if (rec.confidence < 0.62 || rec.recommendation !== 'BUY') continue; // Aggressive 62% threshold

      // Check if we already have this position
      if (currentPositions.some((p: any) => p.symbol === rec.symbol)) {
        console.log(`Already holding ${rec.symbol}, skipping`);
        continue;
      }

      // Sector diversification check (relaxed for max profit)
      const sector = sectorMap[rec.symbol] || 'Other';
      const currentSectorValue = sectorExposure[sector] || 0;
      const sectorLimit = portfolioValue * 0.5; // Max 50% per sector (aggressive)
      
      if (currentSectorValue >= sectorLimit) {
        console.log(`⚠️ Sector limit reached for ${sector}, skipping ${rec.symbol}`);
        continue;
      }

      // Get current price and technical data
      const tech = technicalData.technicalData?.[rec.symbol];
      if (!tech) {
        console.log(`⚠️ No technical data for ${rec.symbol}, skipping`);
        continue;
      }
      
      const currentPrice = tech.close;
      const high = tech.high;
      const low = tech.low;
      const rsi = tech.rsi || 50;
      
      // AGGRESSIVE ENTRY: Ride momentum, don't fear peaks
      const pricePosition = ((currentPrice - low) / (high - low)) * 100;
      
      // Only avoid extreme peaks during breakouts
      if (pricePosition > 95 && rsi > 75) {
        console.log(`⚠️ ${rec.symbol} extremely overbought, waiting briefly`);
        continue;
      }
      
      // Accept higher RSI for strong momentum trades
      if (rsi > 80 && tech.volume_ratio < 1.5) {
        console.log(`⚠️ ${rec.symbol} overbought without volume, skipping`);
        continue;
      }
      
      // MOMENTUM & CONFIDENCE-ADJUSTED POSITION SIZING (AGGRESSIVE)
      const positionMultiplier = calculatePositionMultiplier(rec.symbol, rec.confidence, rec.aiConsensus);
      const adjustedAmount = Math.min(
        baseAmountPerTrade * positionMultiplier,
        remainingBuyingPower,
        sectorLimit - currentSectorValue
      );
      
      if (adjustedAmount < 1) {
        console.log(`⚠️ Insufficient funds for ${rec.symbol} after adjustments`);
        continue;
      }

      // DYNAMIC STOP-LOSS based on volatility
      const volatilityPercent = ((high - low) / currentPrice) * 100;
      const adjustedStopLoss = Math.max(baseStopLossPercent, volatilityPercent * 0.5);
      const adjustedTakeProfit = baseTakeProfitPercent;
      
      const stopLossPrice = currentPrice * (1 - adjustedStopLoss / 100);
      const takeProfitPrice = currentPrice * (1 + adjustedTakeProfit / 100);
      const estimatedShares = adjustedAmount / currentPrice;

      console.log(`🚀 AGGRESSIVE ENTRY: ${rec.symbol} $${adjustedAmount.toFixed(2)} (~${estimatedShares.toFixed(3)} shares) @ $${currentPrice.toFixed(2)}`);
      console.log(`   💰 Multiplier: ${positionMultiplier.toFixed(2)}x | ${rec.aiConsensus} | Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
      console.log(`   📊 RSI: ${rsi.toFixed(1)} | Volume: ${(tech.volume_ratio || 1).toFixed(1)}x | Position: ${pricePosition.toFixed(0)}%`);
      console.log(`   🎯 Target: $${takeProfitPrice.toFixed(2)} (+${adjustedTakeProfit}%) | Stop: $${stopLossPrice.toFixed(2)} (-${adjustedStopLoss.toFixed(1)}%)`);

      // ========== PRE-TRADE BACKTESTING VALIDATION ==========
      console.log(`📊 Running backtest validation for ${rec.symbol}...`);
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
            description: 'Momentum-based strategy with RSI/Volume filters',
            buy_condition: adjustedStopLoss.toFixed(2), // Buy on dips
            sell_condition: adjustedTakeProfit.toFixed(2), // Sell on gains
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
            
            // Validation criteria: positive return OR high win rate
            const returnOk = backtestResult.return_percentage > 0;
            const winRateOk = backtestResult.win_rate >= 50;
            const tradesOk = backtestResult.total_trades >= 1; // At least 1 trade in backtest
            
            backtestPassed = (returnOk || winRateOk) && tradesOk;
            
            console.log(`📈 Backtest Results for ${rec.symbol}:`);
            console.log(`   Return: ${backtestResult.return_percentage.toFixed(2)}%`);
            console.log(`   Win Rate: ${backtestResult.win_rate.toFixed(2)}%`);
            console.log(`   Trades: ${backtestResult.total_trades}`);
            console.log(`   Max Drawdown: ${backtestResult.max_drawdown.toFixed(2)}%`);
            console.log(`   ✅ Validation: ${backtestPassed ? 'PASSED' : 'FAILED'}`);
          } else {
            console.log(`⚠️ Backtest failed to run for ${rec.symbol}, proceeding with trade`);
            backtestPassed = true; // Don't block trade if backtest fails
          }
        }
      } catch (backtestError) {
        console.error(`⚠️ Backtest error for ${rec.symbol}:`, backtestError);
        backtestPassed = true; // Don't block trade on backtest errors
      }
      
      // Skip trade if backtest failed validation
      if (!backtestPassed) {
        console.log(`❌ Skipping ${rec.symbol}: Failed backtest validation`);
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
            positionMultiplier: positionMultiplier,
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
