import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    console.log("Fetching historical weekly gainers data...");
    
    // Fetch top weekly gainers from multiple time periods
    const symbols = [
      "NVDA", "TSLA", "AMD", "SMCI", "CELH", "CVNA", "ENPH", "FSLR", 
      "SEDG", "RUN", "PLUG", "BLNK", "LCID", "RIVN", "NIO", "UPST",
      "AFRM", "PYPL", "SQ", "COIN", "MARA", "RIOT", "HUT", "BITF"
    ];

    // Fetch historical data for pattern analysis
    const historicalData = await Promise.all(
      symbols.slice(0, 10).map(async (symbol) => {
        try {
          const endDate = Math.floor(Date.now() / 1000);
          const startDate = endDate - (365 * 5 * 24 * 60 * 60); // 5 years ago
          
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1wk`
          );
          
          if (!response.ok) return null;
          
          const data = await response.json();
          const quotes = data.chart.result[0];
          const prices = quotes.indicators.quote[0];
          
          return {
            symbol,
            weeklyData: prices.close.map((close: number, i: number) => ({
              close,
              volume: prices.volume[i],
              timestamp: quotes.timestamp[i]
            })).filter((d: any) => d.close && d.volume)
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return null;
        }
      })
    );

    const validData = historicalData.filter(d => d !== null);

    // Fetch current top gainers for comparison
    const currentGainersResponse = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=20"
    );
    const currentGainersData = await currentGainersResponse.json();
    const currentGainers = currentGainersData.finance.result[0].quotes.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      marketCap: q.marketCap
    }));

    console.log("Analyzing patterns with AI...");

    // Use AI to analyze patterns and make recommendations
    const prompt = `You are an expert quantitative analyst and data scientist specializing in stock market pattern recognition and predictive modeling.

HISTORICAL DATA ANALYSIS:
Analyze these top weekly gainers from the past 5 years: ${validData.map(d => d.symbol).join(", ")}

KEY PATTERNS TO IDENTIFY:
1. Volume spikes before major price increases
2. Sector trends and correlation (tech, EVs, crypto-related, renewable energy)
3. Market cap sweet spots (small/mid/large cap performance)
4. Volatility patterns preceding breakouts
5. News catalysts (earnings, FDA approvals, contracts, partnerships)
6. Technical indicators (RSI, MACD, moving averages)
7. Institutional buying patterns
8. Short interest and squeeze potential

CURRENT MARKET ANALYSIS:
Today's top gainers: ${JSON.stringify(currentGainers.slice(0, 10), null, 2)}

CRITICAL FACTORS FOR HIGH-PROBABILITY TRADES:
- Look for stocks showing early signs of institutional accumulation
- Identify sector momentum (what's hot NOW)
- Volume confirmation (at least 2x average volume)
- Price action near breakout levels
- Positive fundamental catalysts in next 30 days
- Strong relative strength vs market
- Low debt, strong cash position for growth stocks

YOUR TASK:
Based on the historical patterns you've learned from past 5-year weekly gainers and current market conditions, recommend 5-8 stocks with HIGHEST probability of significant gains (20%+) in the next 1-4 weeks.

For each recommendation, provide:
1. Symbol and company name
2. Current price and price target
3. Specific catalyst driving the move
4. Risk level (1-10)
5. Time horizon (days/weeks)
6. Entry strategy
7. Why this matches historical winning patterns

BE SPECIFIC. BE ACTIONABLE. FOCUS ON MAKING MONEY.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a world-class quantitative analyst with a track record of identifying high-probability stock trades. You analyze patterns, catalysts, and market conditions to find asymmetric risk/reward opportunities. You are conservative but when you find a setup, you're confident."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_analysis",
            description: "Return high-probability stock recommendations based on historical pattern analysis",
            parameters: {
              type: "object",
              properties: {
                analysis_summary: {
                  type: "string",
                  description: "Brief summary of key patterns identified from historical data"
                },
                market_conditions: {
                  type: "string",
                  description: "Current market environment assessment"
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      symbol: { type: "string" },
                      company_name: { type: "string" },
                      current_price: { type: "string" },
                      price_target: { type: "string" },
                      catalyst: { type: "string" },
                      risk_level: { type: "number" },
                      time_horizon: { type: "string" },
                      entry_strategy: { type: "string" },
                      pattern_match: { type: "string" },
                      confidence_score: { type: "number" }
                    },
                    required: ["symbol", "company_name", "current_price", "price_target", "catalyst", "risk_level", "time_horizon", "entry_strategy", "pattern_match", "confidence_score"]
                  }
                }
              },
              required: ["analysis_summary", "market_conditions", "recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "stock_analysis" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
