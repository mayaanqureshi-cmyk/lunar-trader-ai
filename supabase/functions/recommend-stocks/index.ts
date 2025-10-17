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

    const prompt = `As an expert swing trading analyst specializing in CATALYST-DRIVEN opportunities, recommend 3-5 stocks for each timeframe. Focus on companies with STRONG FUNDAMENTALS + POSITIVE CATALYSTS (like Intel/AMD deals, partnerships, tech breakthroughs):

1. TODAY (Immediate Catalyst Plays):
   - Breaking news: M&A deals, strategic partnerships, major contract wins
   - Earnings surprises beating expectations
   - Analyst upgrades from major firms (Goldman, Morgan Stanley, etc.)
   - Sector rotation into undervalued areas
   - Target: 3-8% quick gains

2. ONE WEEK (Swing Setup with Near-Term Catalysts):
   - Companies announcing partnerships/collaborations in next 1-2 weeks
   - Technical breakouts backed by fundamental strength (P/E improving, revenue growth)
   - Undervalued stocks in hot sectors (AI, semiconductors, cloud, biotech)
   - Recent insider buying activity
   - Positive earnings guidance or product launches upcoming
   - Strong balance sheets with growth potential
   - Target: 8-20% gains

3. ONE MONTH (High-Conviction Fundamental Plays):
   - Companies with major deals/partnerships recently announced (like Intel/AMD opportunities)
   - Industry leaders with competitive moats being undervalued
   - Upcoming FDA approvals, product launches, or earnings
   - Sector tailwinds (AI adoption, chip demand, EV growth, etc.)
   - Strong revenue/earnings growth trajectory
   - Recent strategic moves (acquisitions, expansions, new markets)
   - Institutional accumulation patterns
   - Target: 20-40% gains

CRITICAL SELECTION CRITERIA:
✓ Solid fundamentals: Positive revenue growth, manageable debt, strong margins
✓ Recent positive catalyst: Deal announcement, partnership, breakthrough, upgrade
✓ Technical confirmation: Price breaking resistance or bouncing off support
✓ Sector strength: Operating in growing industry with tailwinds
✓ Value opportunity: Undervalued relative to growth potential or peers
✓ Institutional interest: Smart money accumulating shares

PRIORITIZE:
- Companies with recent major announcements (partnerships, deals, contracts)
- Undervalued relative to sector peers but with strong growth
- Clear competitive advantages or technological edge
- Momentum building from positive fundamentals
- Real catalysts (not just technical patterns)

For each stock provide:
- Symbol (real NYSE/NASDAQ symbols - actively traded, liquid)
- Company name
- Current realistic price (based on recent trading range)
- Recommendation reason: MUST include specific catalyst or fundamental driver (e.g., "Recent $5B partnership with Microsoft", "Trading at 0.8x sales vs sector 2.5x with 40% revenue growth")
- Risk level (low/medium/high - consider volatility, market cap, catalyst certainty)`;

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
