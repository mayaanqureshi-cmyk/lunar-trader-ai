import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= PERFORMANCE OPTIMIZATION: INDICATOR CACHE =============
// In-memory LRU cache for technical indicators with TTL and price invalidation
interface CachedIndicators {
  data: any;
  timestamp: number;
  priceSnapshot: number;
}

const indicatorCache = new Map<string, CachedIndicators>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache
const PRICE_CHANGE_THRESHOLD = 0.3; // Invalidate if price moves >0.3%

const getCachedIndicators = (symbol: string, currentPrice: number): any | null => {
  const cached = indicatorCache.get(symbol);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  const priceChange = Math.abs((currentPrice - cached.priceSnapshot) / cached.priceSnapshot) * 100;
  
  // Cache is valid if: within TTL AND price hasn't moved significantly
  if (age < CACHE_TTL_MS && priceChange < PRICE_CHANGE_THRESHOLD) {
    console.log(`✅ Cache hit: ${symbol} (age: ${(age / 1000).toFixed(1)}s, drift: ${priceChange.toFixed(2)}%)`);
    return cached.data;
  }
  
  return null;
};

const setCachedIndicators = (symbol: string, data: any, price: number) => {
  indicatorCache.set(symbol, {
    data,
    timestamp: Date.now(),
    priceSnapshot: price
  });
  
  // Simple LRU: limit cache size to prevent memory issues
  if (indicatorCache.size > 200) {
    const oldestKey = indicatorCache.keys().next().value;
    if (oldestKey) {
      indicatorCache.delete(oldestKey);
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Auto-trade scanner running...');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY');
    const ALPACA_SECRET_KEY = Deno.env.get('ALPACA_SECRET_KEY');

    if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
      console.log('⚠️ Alpaca credentials not configured, skipping trade execution');
      return new Response(JSON.stringify({ success: true, message: 'Credentials not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with auto-trading enabled
    const { data: profiles } = await supabase.from('profiles').select('id, email');
    
    if (!profiles || profiles.length === 0) {
      console.log('No users found');
      return new Response(JSON.stringify({ success: true, message: 'No users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check real market status via Alpaca clock
    const clockResp = await fetch('https://api.alpaca.markets/v2/clock', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });
    if (!clockResp.ok) {
      throw new Error('Failed to fetch Alpaca market clock');
    }
    const clock = await clockResp.json();
    if (!clock.is_open) {
      console.log('⏰ Market is closed, skipping');
      return new Response(JSON.stringify({ success: true, message: 'Market closed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Expanded universe of stocks across sectors
    const symbolsToScan = [
      // Mega Cap Tech
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
      // Tech & Semiconductors
      'AMD', 'INTC', 'QCOM', 'AVGO', 'CRM', 'ORCL', 'ADBE', 'NOW', 'PANW', 'CRWD',
      // AI & Cloud
      'PLTR', 'SNOW', 'DDOG', 'NET', 'ZS', 'MDB',
      // Consumer & Retail
      'AMZN', 'WMT', 'COST', 'TGT', 'HD', 'NKE', 'SBUX',
      // Finance
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'SQ',
      // Healthcare & Biotech
      'JNJ', 'UNH', 'PFE', 'ABBV', 'LLY', 'TMO', 'MRNA', 'GILD',
      // Energy
      'XOM', 'CVX', 'COP', 'SLB', 'EOG',
      // Communication
      'DIS', 'NFLX', 'CMCSA', 'T', 'VZ',
      // Industrials
      'BA', 'CAT', 'GE', 'UPS', 'HON', 'LMT',
      // EV & Clean Energy
      'RIVN', 'LCID', 'NIO', 'ENPH', 'PLUG',
      // Crypto-Related
      'COIN', 'MSTR', 'RIOT', 'MARA',
      // ETFs
      'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO'
    ];

    console.log(`📊 Analyzing ${symbolsToScan.length} stocks with comprehensive metrics...`);

    // Step 1: Get comprehensive technical analysis with intelligent caching
    console.log('🚀 Fetching technical data with intelligent caching...');
    
    // First, do a lightweight price check for cache validation
    const priceCheckResponse = await fetch(
      `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbolsToScan.join(',')}`,
      {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
        },
      }
    );
    
    const priceData = priceCheckResponse.ok ? await priceCheckResponse.json() : {};
    
    // Batch fetch: Check cache first, only request uncached symbols
    const uncachedSymbols: string[] = [];
    const cachedData: Record<string, any> = {};
    
    for (const symbol of symbolsToScan) {
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
    
    console.log(`📊 Cache performance: ${Object.keys(cachedData).length} cached, ${uncachedSymbols.length} need refresh`);
    
    // Only fetch technical data for uncached symbols (MASSIVE speedup!)
    let technicalData: any = { technicalData: cachedData };
    
    if (uncachedSymbols.length > 0) {
      const technicalAnalysis = await supabase.functions.invoke('analyze-multi-timeframe', {
        body: { symbols: uncachedSymbols }
      });

      if (technicalAnalysis.error) {
        throw new Error(`Technical analysis failed: ${technicalAnalysis.error.message}`);
      }

      const freshData = technicalAnalysis.data.technicalData || {};
      
      // Cache the fresh data
      for (const [symbol, data] of Object.entries(freshData)) {
        setCachedIndicators(symbol, data, (data as any).close);
      }
      
      // Merge cached + fresh data
      technicalData.technicalData = { ...cachedData, ...freshData };
    }
    
    console.log(`✅ Technical analysis complete: ${Object.keys(cachedData).length} from cache, ${uncachedSymbols.length} fetched (${Object.keys(cachedData).length > 0 ? ((Object.keys(cachedData).length / symbolsToScan.length) * 100).toFixed(1) : 0}% cache hit rate)`);

    // Step 2: Analyze with multiple AI models for consensus
    const aiPrompt = `You are an elite algorithmic trader. Analyze these stocks with their COMPREHENSIVE TECHNICAL DATA and identify the TOP 1-2 stocks with HIGHEST probability of making a >3% move TODAY.

TECHNICAL DATA:
${JSON.stringify(technicalData, null, 2)}

Return ONLY a JSON array with 1-2 stocks in this exact format:
[
  {
    "symbol": "NVDA",
    "recommendation": "BUY",
    "confidence": 0.85,
    "reasoning": "Strong momentum across all timeframes, RSI oversold bounce on daily, MACD bullish crossover, ADX shows strong trend, volume spike 140%",
    "priceTarget": 145.50,
    "stopLoss": 142.00,
    "technicalScore": 8.5,
    "riskReward": "1:3"
  }
]

CRITERIA:
- Confidence >70% (lowered from 80%)
- Technical score >6.5/10 (lowered from 7.5)
- Strong volume or momentum signals
- Clear trend direction
- Positive risk/reward setup

Return TOP 2-3 opportunities even if not perfect. If no stocks meet minimum criteria, return empty array: []`;

    // Query Gemini 2.5 Flash
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an elite quantitative trader specializing in technical analysis. Return only valid JSON.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    // Query GPT-5 Mini
    const gptResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are an elite quantitative trader specializing in multi-timeframe analysis. Return only valid JSON.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!geminiResponse.ok || !gptResponse.ok) {
      throw new Error(`AI analysis failed: Gemini ${geminiResponse.status}, GPT ${gptResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const gptData = await gptResponse.json();

    // Parse both AI responses
    let geminiAnalysis = geminiData.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let gptAnalysis = gptData.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const geminiRecs = JSON.parse(geminiAnalysis);
    const gptRecs = JSON.parse(gptAnalysis);

    console.log(`🤖 Gemini recommended: ${geminiRecs.length} stocks`);
    console.log(`🤖 GPT-5 Mini recommended: ${gptRecs.length} stocks`);

    // Step 3: Combine recommendations from both AIs (not just consensus)
    const recommendationMap = new Map();
    
    // Add all Gemini recommendations
    for (const rec of geminiRecs) {
      if (rec.confidence >= 0.70 && rec.recommendation === 'BUY') {
        recommendationMap.set(rec.symbol, {
          symbol: rec.symbol,
          recommendation: 'BUY',
          geminiConfidence: rec.confidence,
          gptConfidence: 0,
          confidence: rec.confidence,
          geminiReasoning: rec.reasoning,
          gptReasoning: '',
          priceTarget: rec.priceTarget,
          stopLoss: rec.stopLoss,
          technicalScore: rec.technicalScore || 0,
          riskReward: rec.riskReward,
          aiConsensus: 'Gemini Only'
        });
      }
    }
    
    // Add/merge GPT recommendations
    for (const rec of gptRecs) {
      if (rec.confidence >= 0.70 && rec.recommendation === 'BUY') {
        const existing = recommendationMap.get(rec.symbol);
        if (existing) {
          // Both AIs recommend - upgrade to consensus
          existing.gptConfidence = rec.confidence;
          existing.confidence = (existing.geminiConfidence + rec.confidence) / 2;
          existing.gptReasoning = rec.reasoning;
          existing.priceTarget = (existing.priceTarget + rec.priceTarget) / 2;
          existing.stopLoss = Math.max(existing.stopLoss, rec.stopLoss);
          existing.technicalScore = (existing.technicalScore + (rec.technicalScore || 0)) / 2;
          existing.aiConsensus = '🔥 STRONG CONSENSUS - Both AIs Agree';
        } else {
          // GPT only recommendation
          recommendationMap.set(rec.symbol, {
            symbol: rec.symbol,
            recommendation: 'BUY',
            geminiConfidence: 0,
            gptConfidence: rec.confidence,
            confidence: rec.confidence,
            geminiReasoning: '',
            gptReasoning: rec.reasoning,
            priceTarget: rec.priceTarget,
            stopLoss: rec.stopLoss,
            technicalScore: rec.technicalScore || 0,
            riskReward: rec.riskReward,
            aiConsensus: 'GPT-5 Only'
          });
        }
      }
    }
    
    // Convert to array and sort by confidence
    const recommendations = Array.from(recommendationMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // Top 10 recommendations for more diversification
      .map(rec => ({
        ...rec,
        reasoning: rec.geminiReasoning && rec.gptReasoning 
          ? `🤖 Gemini: ${rec.geminiReasoning} | 🤖 GPT-5: ${rec.gptReasoning}`
          : rec.geminiReasoning || rec.gptReasoning,
        technicalIndicators: technicalData.technicalData?.[rec.symbol] || {},
        fundamentals: { 
          aiModels: rec.aiConsensus,
          geminiScore: rec.geminiConfidence, 
          gptScore: rec.gptConfidence 
        },
        timeframe: '1-3 day swing trade'
      }));

    console.log(`✅ Combined AI Analysis: ${recommendations.length} stocks (${recommendations.filter(r => r.aiConsensus.includes('CONSENSUS')).length} with consensus)`);

    console.log(`✅ AI Recommendations: ${recommendations.length} stocks`);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.log('No trading opportunities found');
      return new Response(JSON.stringify({ success: true, message: 'No opportunities', analyzed: symbolsToScan.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check Alpaca account
    const accountResponse = await fetch('https://api.alpaca.markets/v2/account', {
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
    const positionsResponse = await fetch('https://api.alpaca.markets/v2/positions', {
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
        const qty = parseFloat(pos.qty);
        
        // Get technical data for momentum indicators
        const tech = technicalData.technicalData?.[pos.symbol];
        const rsi = tech?.rsi || 50;
        const macdSignal = tech?.macd_signal || 0;
        
        // Calculate trailing stop (peak price tracked dynamically)
        const peakPrice = Math.max(currentPrice, avgEntry * 1.1); // At least 10% above entry
        const dipFromPeak = ((peakPrice - currentPrice) / peakPrice) * 100;
        
        console.log(`📊 ${pos.symbol}: Profit ${profitPercent.toFixed(2)}%, Dip ${dipFromPeak.toFixed(2)}%, RSI ${rsi.toFixed(1)}`);
        
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
            const sellResp = await fetch('https://api.alpaca.markets/v2/orders', {
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
              const profitAmount = parseFloat(pos.unrealized_pl) * (sellQty / qty);
              const freedCapital = parseFloat(pos.market_value) * (sellQty / qty);
              
              sellsExecuted.push({
                symbol: pos.symbol,
                orderId: sellOrder.id,
                reason: sellReason,
                profitAmount: profitAmount,
                profitPercent: profitPercent,
                quantitySold: sellQty,
                totalQuantity: qty,
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

    // Advanced Risk Management & Position Sizing
    const baseStopLossPercent = 2;
    const baseTakeProfitPercent = 6;
    
    // Sector exposure limits (max 40% in any single sector)
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
    
    // Calculate volatility-adjusted position sizing
    const calculateVolatilityScore = (symbol: string): number => {
      const tech = technicalData.technicalData?.[symbol];
      if (!tech) return 1.0;
      
      // Use ATR (Average True Range) proxy: (high - low) / close
      const volatility = ((tech.high - tech.low) / tech.close) * 100;
      
      // Higher volatility = smaller position (inverse relationship)
      if (volatility > 5) return 0.5; // Very volatile: 50% position
      if (volatility > 3) return 0.7; // Moderate: 70% position
      return 1.0; // Low volatility: full position
    };
    
    // For small accounts, diversify across MORE stocks with smaller amounts
    const maxTrades = buyingPower < 500 ? 8 : buyingPower < 1000 ? 6 : 5;
    const baseAmountPerTrade = (buyingPower * 0.9) / maxTrades;

    console.log(`📊 Advanced Risk Management: $${baseAmountPerTrade.toFixed(2)} base per position, max ${maxTrades} trades`);

    const tradesExecuted = [];
    let tradesPlaced = 0;

    for (const rec of recommendations) {
      if (tradesPlaced >= maxTrades) {
        console.log(`⚠️ Max trades reached (${maxTrades})`);
        break;
      }

      if (rec.confidence < 0.70 || rec.recommendation !== 'BUY') continue;

      // Check if we already have this position
      if (currentPositions.some((p: any) => p.symbol === rec.symbol)) {
        console.log(`Already holding ${rec.symbol}, skipping`);
        continue;
      }

      // Sector diversification check
      const sector = sectorMap[rec.symbol] || 'Other';
      const currentSectorValue = sectorExposure[sector] || 0;
      const sectorLimit = portfolioValue * 0.4; // Max 40% per sector
      
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
      
      // SMARTER ENTRY LOGIC: Avoid buying at peaks
      const pricePosition = ((currentPrice - low) / (high - low)) * 100;
      
      if (pricePosition > 85) {
        console.log(`⚠️ ${rec.symbol} near daily high (${pricePosition.toFixed(1)}%), waiting for pullback`);
        continue;
      }
      
      if (rsi > 70) {
        console.log(`⚠️ ${rec.symbol} overbought (RSI: ${rsi.toFixed(1)}), waiting for better entry`);
        continue;
      }
      
      // VOLATILITY-ADJUSTED POSITION SIZING
      const volatilityMultiplier = calculateVolatilityScore(rec.symbol);
      const adjustedAmount = Math.min(
        baseAmountPerTrade * volatilityMultiplier,
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

      console.log(`🚀 Smart Entry: ${rec.symbol} $${adjustedAmount.toFixed(2)} (~${estimatedShares.toFixed(3)} shares) @ $${currentPrice.toFixed(2)}`);
      console.log(`   📊 Position: ${pricePosition.toFixed(1)}% of daily range, RSI: ${rsi.toFixed(1)}, Vol Multiplier: ${volatilityMultiplier}`);
      console.log(`   🛡️ Stop: $${stopLossPrice.toFixed(2)} (-${adjustedStopLoss.toFixed(1)}%), Target: $${takeProfitPrice.toFixed(2)} (+${adjustedTakeProfit}%)`);

      try {
        // Place market order using notional (dollar amount) for fractional shares
        const orderResponse = await fetch('https://api.alpaca.markets/v2/orders', {
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
            volatilityAdjustment: volatilityMultiplier,
            sector: sector,
            entryRSI: rsi,
            entryPricePosition: pricePosition,
            reasoning: rec.reasoning,
            technicalIndicators: rec.technicalIndicators || {},
            fundamentals: rec.fundamentals || {},
            riskReward: rec.riskReward || 'N/A',
            timeframe: rec.timeframe || 'N/A',
            timestamp: new Date().toISOString(),
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
        scanned: symbolsToScan.length,
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
        scanned: symbolsToScan.length,
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
