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
    const { stocks } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const stockData = stocks.map((s: any) => 
      `${s.symbol}: Price $${s.rawPrice}, Change +${s.rawChange}%, Volume ${s.volume}`
    ).join("\n");

    const prompt = `You are an expert stock analyst. Analyze these top daily gaining stocks with STRICT criteria.

CRITICAL RULES FOR BUY RECOMMENDATIONS:
- Only recommend BUY if the stock meets ALL of these criteria:
  1. Price change is above +15% (strong momentum)
  2. High volume indicates institutional interest
  3. The gain appears sustainable (not just a short squeeze or pump)
  4. Risk/reward ratio is favorable for swing trading
  5. No obvious red flags (company fundamentals, sector weakness)

- Recommend HOLD if:
  1. Price gain is between 8-15% (moderate momentum, needs confirmation)
  2. Volume is average or below (lacks conviction)
  3. Price is extended and due for pullback
  4. Sector or market conditions are uncertain
  5. Better to wait for consolidation or re-entry

IMPORTANT: Be conservative. Only recommend BUY when you have high confidence. When in doubt, recommend HOLD.

Top Gaining Stocks Today:
${stockData}

Provide a recommendation (BUY or HOLD) with a specific, actionable reason (max 20 words) for each stock.`;

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
            content: "You are a conservative stock analyst. Only recommend BUY when you have high confidence based on momentum, volume, and sustainability. Prioritize capital preservation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "stock_recommendations",
            description: "Return buy/hold recommendations for stocks with strict criteria",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      symbol: { type: "string" },
                      recommendation: { type: "string", enum: ["BUY", "HOLD"] },
                      reason: { type: "string" }
                    },
                    required: ["symbol", "recommendation", "reason"]
                  }
                }
              },
              required: ["recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "stock_recommendations" } }
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
