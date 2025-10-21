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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `As a quantitative analyst specializing in INSTITUTIONAL POSITIONING and HEDGE FUND ACTIVITY, recommend 3-5 stocks for each timeframe. Focus on stocks with STRONG QUANT SIGNALS + HEDGE FUND ACCUMULATION:

1. TODAY (High-Frequency Institutional Momentum):
   - Stocks with unusual institutional buying volume (>3x average)
   - 13F filings showing major hedge fund NEW positions or significant additions
   - Stocks breaking into new 52-week highs with hedge fund backing
   - Dark pool activity indicating institutional accumulation
   - Renaissance Technologies, Citadel, Bridgewater-style quant signals
   - High Sharpe ratio (>1.5) and positive momentum factor
   - Target: Quick institutional flow trades (3-8% gains)

2. ONE WEEK (Quantitative Factor Convergence):
   - Multi-factor quant score: momentum + value + quality convergence
   - Stocks with 5+ major hedge funds increasing positions (latest 13F data)
   - Low volatility + high institutional ownership (>70%)
   - Statistical arbitrage opportunities: mean reversion from oversold
   - Insider buying + hedge fund accumulation confluence
   - Machine learning signals: price/volume anomalies
   - Factor exposure: Quality (high ROE, low debt) + Growth (revenue acceleration)
   - Target: Systematic swing plays (8-20% gains)

3. ONE MONTH (Long-Term Institutional Conviction):
   - Top 10 hedge fund holdings with consistent quarter-over-quarter increases
   - Warren Buffett, Ray Dalio, Bill Ackman-style concentrated positions
   - Quant scoring system:
     * Value: P/E < sector avg, P/B < 3, PEG < 1
     * Quality: ROE > 15%, Debt/Equity < 0.5, profit margins growing
     * Momentum: 6-month return > S&P 500, making new highs
     * Size: Mid-large cap ($5B+) for institutional liquidity
   - 13F aggregation: 20+ major funds holding/increasing positions
   - Activist hedge fund involvement (Carl Icahn, Elliott Management)
   - Statistical edge: mean reversion + trend following confluence
   - Target: Institutional conviction plays (20-50% gains)

QUANTITATIVE SELECTION CRITERIA:
✓ Multi-factor score: Momentum (12M return) + Value (P/E, P/B) + Quality (ROE, margins)
✓ Institutional flow: Net hedge fund buying >$500M (13F aggregated)
✓ Statistical significance: Sharpe ratio >1.2, max drawdown <15%
✓ Liquidity: Average daily volume >1M shares, market cap >$2B
✓ Hedge fund concentration: Top 50 funds holding stock
✓ Insider alignment: Directors/officers buying (Form 4 filings)

HEDGE FUND ACTIVITY FOCUS:
- Renaissance Technologies (quant/systematic strategies)
- Citadel, DE Shaw (multi-strategy quant funds)
- Bridgewater (macro + systematic)
- Warren Buffett/Berkshire (value + quality)
- Bill Ackman/Pershing Square (activist value)
- Tiger Cubs (Julian Robertson disciples)
- Latest 13F filings showing NEW or INCREASED positions

For each stock provide:
- Symbol (real NYSE/NASDAQ, liquid, institutional favorite)
- Company name
- Current price (realistic recent range)
- Recommendation reason: MUST include specific quant metrics + hedge fund activity (e.g., "5 major funds added $2B in Q4 2024, Sharpe ratio 1.8, trading at 0.6x PEG vs sector 1.5x")
- Risk level (low/medium/high - based on volatility, beta, drawdown risk)`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert stock market analyst. Provide realistic, actionable stock recommendations based on current market trends. Use only real, actively traded stocks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_recommendations_by_timeline",
            description: "Provide stock recommendations organized by investment timeline",
            parameters: {
              type: "object",
              properties: {
                today: {
                  type: "array",
                  description: "Stocks to buy today for day trading",
                  items: {
                    type: "object",
                    properties: {
                      symbol: { type: "string" },
                      name: { type: "string" },
                      price: { type: "number" },
                      reason: { type: "string" },
                      risk: { type: "string", enum: ["low", "medium", "high"] }
                    },
                    required: ["symbol", "name", "price", "reason", "risk"]
                  }
                },
                one_week: {
                  type: "array",
                  description: "Stocks to buy for one week swing trading",
                  items: {
                    type: "object",
                    properties: {
                      symbol: { type: "string" },
                      name: { type: "string" },
                      price: { type: "number" },
                      reason: { type: "string" },
                      risk: { type: "string", enum: ["low", "medium", "high"] }
                    },
                    required: ["symbol", "name", "price", "reason", "risk"]
                  }
                },
                one_month: {
                  type: "array",
                  description: "Stocks to buy for one month position trading",
                  items: {
                    type: "object",
                    properties: {
                      symbol: { type: "string" },
                      name: { type: "string" },
                      price: { type: "number" },
                      reason: { type: "string" },
                      risk: { type: "string", enum: ["low", "medium", "high"] }
                    },
                    required: ["symbol", "name", "price", "reason", "risk"]
                  }
                }
              },
              required: ["today", "one_week", "one_month"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "stock_recommendations_by_timeline" } }
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

    const recommendations = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(recommendations), {
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
