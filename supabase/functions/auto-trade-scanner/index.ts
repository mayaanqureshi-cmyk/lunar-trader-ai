import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const clockResp = await fetch('https://paper-api.alpaca.markets/v2/clock', {
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

    console.log(`📊 Analyzing ${symbolsToScan.length} stocks...`);

    // Analyze stocks using AI
    const aiPrompt = `You are an elite algorithmic trader. Analyze these ${symbolsToScan.length} stocks and identify the TOP 1-2 stocks with the HIGHEST probability of making a >3% move TODAY.

Stocks to analyze: ${symbolsToScan.join(', ')}

Return ONLY a JSON array with 1-2 stocks in this exact format:
[
  {
    "symbol": "NVDA",
    "recommendation": "BUY",
    "confidence": 0.85,
    "reasoning": "Strong momentum, RSI oversold bounce, institutional buying",
    "priceTarget": 145.50,
    "stopLoss": 142.00,
    "technicalIndicators": {
      "rsi": "Oversold at 32, bouncing back",
      "macd": "Bullish crossover confirmed",
      "volume": "Above average by 140%",
      "movingAverages": "Price above 50-day MA, approaching 200-day"
    },
    "fundamentals": {
      "sentiment": "Bullish institutional buying",
      "newsImpact": "Positive earnings catalyst expected",
      "sectorStrength": "Tech sector showing relative strength"
    },
    "riskReward": "1:3 risk/reward ratio",
    "timeframe": "1-3 day swing trade"
  }
]

Criteria for recommendation:
- Confidence must be >75%
- Clear technical setup with multiple confirmations
- Strong volume and momentum
- Risk/reward ratio >1:2
- Provide detailed technical analysis for each indicator
- Include fundamental sentiment and news impact

If no stocks meet criteria, return empty array: []`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an elite quantitative trader. Return only valid JSON.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysis = aiData.choices[0].message.content.trim();
    
    // Clean JSON response
    analysis = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendations = JSON.parse(analysis);

    console.log(`✅ AI Recommendations: ${recommendations.length} stocks`);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.log('No trading opportunities found');
      return new Response(JSON.stringify({ success: true, message: 'No opportunities', analyzed: symbolsToScan.length }), {
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

    console.log(`💰 Buying Power: $${buyingPower.toFixed(2)}`);

    // Get auto-trading settings (use defaults if not set)
    const maxPositionSize = 1000; // Default max per trade
    const maxPortfolioRisk = 2; // Default 2%
    const stopLossPercent = 2;
    const takeProfitPercent = 6;

    const tradesExecuted = [];

    for (const rec of recommendations) {
      if (rec.confidence < 0.75 || rec.recommendation !== 'BUY') continue;

      const currentPrice = rec.priceTarget || 100;
      
      // Calculate position size with risk management
      const maxRiskAmount = portfolioValue * (maxPortfolioRisk / 100);
      const riskPerShare = currentPrice * (stopLossPercent / 100);
      const quantity = Math.max(1, Math.min(
        Math.floor(maxRiskAmount / riskPerShare),
        Math.floor(maxPositionSize / currentPrice),
        Math.floor(buyingPower / currentPrice)
      ));

      if (quantity < 1 || quantity * currentPrice > buyingPower) {
        console.log(`⚠️ Insufficient funds for ${rec.symbol}`);
        continue;
      }

      const stopLossPrice = currentPrice * (1 - stopLossPercent / 100);
      const takeProfitPrice = currentPrice * (1 + takeProfitPercent / 100);

      console.log(`🚀 Executing trade: ${rec.symbol} x${quantity} @ ~$${currentPrice.toFixed(2)}`);

      try {
        // Place market order
        const orderResponse = await fetch('https://paper-api.alpaca.markets/v2/orders', {
          method: 'POST',
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: rec.symbol,
            qty: quantity,
            side: 'buy',
            type: 'market',
            time_in_force: 'day',
          }),
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          
          // Place stop-loss
          await fetch('https://paper-api.alpaca.markets/v2/orders', {
            method: 'POST',
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: rec.symbol,
              qty: quantity,
              side: 'sell',
              type: 'stop',
              stop_price: stopLossPrice.toFixed(2),
              time_in_force: 'gtc',
            }),
          });

          // Place take-profit
          await fetch('https://paper-api.alpaca.markets/v2/orders', {
            method: 'POST',
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: rec.symbol,
              qty: quantity,
              side: 'sell',
              type: 'limit',
              limit_price: takeProfitPrice.toFixed(2),
              time_in_force: 'gtc',
            }),
          });

          tradesExecuted.push({
            symbol: rec.symbol,
            quantity,
            orderId: orderData.id,
            confidence: rec.confidence,
            entryPrice: currentPrice,
            stopLoss: stopLossPrice,
            takeProfit: takeProfitPrice,
            reasoning: rec.reasoning,
            technicalIndicators: rec.technicalIndicators || {},
            fundamentals: rec.fundamentals || {},
            riskReward: rec.riskReward || 'N/A',
            timeframe: rec.timeframe || 'N/A',
            timestamp: new Date().toISOString(),
          });

          console.log(`✅ Trade executed: ${rec.symbol}`);
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
