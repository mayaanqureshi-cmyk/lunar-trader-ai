import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting AI-driven sell monitor...');

    const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY');
    const ALPACA_SECRET_KEY = Deno.env.get('ALPACA_SECRET_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY || !OPENAI_API_KEY) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if market is open
    const clockResponse = await fetch('https://paper-api.alpaca.markets/v2/clock', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });
    
    const clockData = await clockResponse.json();
    if (!clockData.is_open) {
      console.log('Market is closed, skipping sell monitor');
      return new Response(JSON.stringify({ message: 'Market closed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current positions
    const positionsResponse = await fetch('https://paper-api.alpaca.markets/v2/positions', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    const positions = await positionsResponse.json();
    console.log(`Monitoring ${positions.length} positions`);

    const sellDecisions = [];

    // Analyze each position
    for (const position of positions) {
      try {
        const symbol = position.symbol;
        // Use qty_available to avoid selling shares held in pending orders
        const qty = parseFloat(position.qty_available || position.qty);
        const totalQty = parseFloat(position.qty);
        const unrealizedPlpc = parseFloat(position.unrealized_plpc);
        const currentPrice = parseFloat(position.current_price);

        console.log(`Analyzing ${symbol}: P/L ${(unrealizedPlpc * 100).toFixed(2)}%, Available: ${qty}/${totalQty}`);
        
        // Skip if no shares available to sell
        if (qty <= 0) {
          console.log(`⏭️ Skipping ${symbol}: No shares available (${qty} available, ${totalQty} total - likely in pending orders)`);
          continue;
        }

        // Get technical analysis
        const analysisResponse = await supabase.functions.invoke('analyze-multi-timeframe', {
          body: { symbol }
        });

        if (analysisResponse.error) {
          console.error(`Analysis error for ${symbol}:`, analysisResponse.error);
          continue;
        }

        const technicalData = analysisResponse.data;

        // Prepare prompt for AI
        const aiPrompt = `You are analyzing whether to SELL an existing position. Current Position:
Symbol: ${symbol}
Quantity: ${qty}
Current Price: $${currentPrice}
Unrealized P/L: ${(unrealizedPlpc * 100).toFixed(2)}%

TECHNICAL ANALYSIS:
${JSON.stringify(technicalData, null, 2)}

Should we SELL this position now? Consider:
1. Is momentum turning bearish?
2. Are we hitting resistance levels?
3. Is the trend weakening?
4. Should we take profits or cut losses?

Respond with JSON:
{
  "action": "sell" or "hold",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "urgency": "low/medium/high"
}`;

        // Query both AI models
        const aiPromises = [
          // GPT-4o
          fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are an expert day trader specializing in exit strategies. Respond ONLY with valid JSON.' },
                { role: 'user', content: aiPrompt }
              ],
              temperature: 0.7,
            }),
          }),
          // GPT-4o-mini
          fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are an expert day trader specializing in exit strategies. Respond ONLY with valid JSON.' },
                { role: 'user', content: aiPrompt }
              ],
            }),
          }),
        ];

        const aiResponses = await Promise.all(aiPromises);
        const aiResults = await Promise.all(aiResponses.map(r => r.json()));

        const gpt4Rec = JSON.parse(aiResults[0].choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim());
        const gptMiniRec = JSON.parse(aiResults[1].choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim());

        console.log(`${symbol} - GPT-4o: ${gpt4Rec.action} (${gpt4Rec.confidence}), GPT-4o-mini: ${gptMiniRec.action} (${gptMiniRec.confidence})`);

        // Decide if we should sell
        const bothSaysSell = gpt4Rec.action === 'sell' && gptMiniRec.action === 'sell';
        const avgConfidence = (gpt4Rec.confidence + gptMiniRec.confidence) / 2;
        const highConfidenceSell = (gpt4Rec.action === 'sell' && gpt4Rec.confidence >= 0.75) || 
                                    (gptMiniRec.action === 'sell' && gptMiniRec.confidence >= 0.75);

        if (bothSaysSell || highConfidenceSell) {
          sellDecisions.push({
            symbol,
            qty,
            confidence: avgConfidence,
            reasoning: `🤖 GPT-4o: ${gpt4Rec.reasoning} | 🤖 GPT-4o-mini: ${gptMiniRec.reasoning}`,
            urgency: gpt4Rec.urgency === 'high' || gptMiniRec.urgency === 'high' ? 'high' : 'medium',
            unrealizedPl: unrealizedPlpc,
            aiModels: bothSaysSell ? 'Both AIs Agree' : (gpt4Rec.confidence > gptMiniRec.confidence ? 'GPT-4o' : 'GPT-4o-mini')
          });
        }

      } catch (error) {
        console.error(`Error analyzing ${position.symbol}:`, error);
      }
    }

    // Execute sell orders
    const executedSells = [];
    for (const decision of sellDecisions) {
      try {
        console.log(`Executing SELL for ${decision.symbol} (${decision.qty} shares)`);

        const sellResponse = await fetch('https://paper-api.alpaca.markets/v2/orders', {
          method: 'POST',
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: decision.symbol,
            qty: decision.qty,
            side: 'sell',
            type: 'market',
            time_in_force: 'day',
          }),
        });

        if (sellResponse.ok) {
          const orderData = await sellResponse.json();
          executedSells.push({
            ...decision,
            orderId: orderData.id,
            timestamp: new Date().toISOString(),
          });
          console.log(`✅ Sell order placed for ${decision.symbol}: ${orderData.id}`);
        } else {
          const errorText = await sellResponse.text();
          console.error(`Failed to sell ${decision.symbol}:`, errorText);
        }

      } catch (error) {
        console.error(`Error executing sell for ${decision.symbol}:`, error);
      }
    }

    // Log the results
    if (executedSells.length > 0 || sellDecisions.length > 0) {
      await supabase.from('auto_trade_logs').insert({
        scanned: positions.length,
        recommendations: sellDecisions.length,
        trades_executed: executedSells.length,
        trades_data: executedSells,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        positions_monitored: positions.length,
        sell_recommendations: sellDecisions.length,
        sells_executed: executedSells.length,
        decisions: executedSells,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sell monitor:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
