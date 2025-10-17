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

    const prompt = `As a professional stock analyst, recommend 3-5 stocks for each investment timeline based on current market conditions, trends, and fundamental analysis:

1. TODAY (Day Trading): Stocks with high momentum, volume, and short-term catalysts
2. ONE WEEK (Swing Trading): Stocks with technical breakout patterns or near-term catalysts
3. ONE MONTH (Position Trading): Stocks with strong fundamentals and medium-term growth potential

For each stock provide:
- Symbol (real NYSE/NASDAQ symbols only)
- Company name
- Current price estimate
- Recommendation reason (concise, 20 words max)
- Risk level (low/medium/high)`;

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
