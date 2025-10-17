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
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract stock purchase information from user text. Return the stock symbol, company name, quantity, and purchase price."
          },
          {
            role: "user",
            content: text
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_stock_purchase",
              description: "Parse stock purchase details from natural language",
              parameters: {
                type: "object",
                properties: {
                  symbol: {
                    type: "string",
                    description: "Stock ticker symbol in uppercase (e.g., AAPL, TSLA)"
                  },
                  name: {
                    type: "string",
                    description: "Full company name (e.g., Apple Inc, Tesla Inc)"
                  },
                  quantity: {
                    type: "number",
                    description: "Number of shares purchased"
                  },
                  purchase_price: {
                    type: "number",
                    description: "Price per share in USD"
                  }
                },
                required: ["symbol", "name", "quantity", "purchase_price"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_stock_purchase" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse stock input");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to extract stock information");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to parse stock input" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
