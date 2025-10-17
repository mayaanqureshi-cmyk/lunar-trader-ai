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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch portfolio and trading signals history
    const { data: portfolio } = await supabaseClient
      .from('portfolio')
      .select('*');

    const { data: signals } = await supabaseClient
      .from('trading_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!portfolio || portfolio.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No portfolio data available for optimization',
          recommendations: {
            dip_threshold: 5,
            gain_threshold: 30,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for AI analysis
    const portfolioSummary = portfolio.map(stock => ({
      symbol: stock.symbol,
      purchase_price: stock.purchase_price,
      quantity: stock.quantity,
      days_held: Math.floor((Date.now() - new Date(stock.purchase_date).getTime()) / (1000 * 60 * 60 * 24))
    }));

    const signalsSummary = signals?.map(signal => ({
      type: signal.signal_type,
      price_change: signal.price_change_percent,
      gain: signal.current_gain_percent,
      created: signal.created_at
    })) || [];

    const prompt = `You are an expert quantitative trading analyst. Analyze this portfolio data and recommend optimal trading thresholds.

Current Portfolio:
${JSON.stringify(portfolioSummary, null, 2)}

Recent Trading Signals History (last 100):
${JSON.stringify(signalsSummary, null, 2)}

Current Thresholds:
- Dip Alert: -5% (triggers notification when price drops 5%)
- Sell Signal: -5% dip + 30% overall gain (triggers sell recommendation)

Based on this data, analyze:
1. Market volatility patterns in these stocks
2. Optimal dip threshold to catch meaningful drops (not just noise)
3. Optimal gain threshold to maximize profits while protecting gains
4. Risk/reward balance for this specific portfolio

Respond with JSON only:
{
  "dip_threshold": <number between 3 and 10>,
  "gain_threshold": <number between 20 and 50>,
  "reasoning": "<brief explanation>",
  "risk_assessment": "<low|medium|high>",
  "suggested_actions": ["<action1>", "<action2>"]
}`;

    console.log('Calling Lovable AI for threshold optimization...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a quantitative trading analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiContent);

    // Parse AI response
    let recommendations;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || 
                       aiContent.match(/```\n([\s\S]*?)\n```/) ||
                       [null, aiContent];
      recommendations = JSON.parse(jsonMatch[1] || aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to default values
      recommendations = {
        dip_threshold: 5,
        gain_threshold: 30,
        reasoning: 'Using default values due to parsing error',
        risk_assessment: 'medium',
        suggested_actions: ['Monitor portfolio regularly', 'Review signals weekly']
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations,
        portfolio_summary: {
          total_stocks: portfolio.length,
          total_signals: signals?.length || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error optimizing thresholds:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
