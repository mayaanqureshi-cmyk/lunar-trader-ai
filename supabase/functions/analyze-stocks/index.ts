import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Invalid symbols array");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const analyses = [];

    for (const symbol of symbols) {
      console.log(`Analyzing ${symbol}...`);

      // Fetch stock data
      const { data: stockData, error: stockError } = await supabase.functions.invoke(
        "fetch-stock-data",
        { body: { symbol } }
      );

      if (stockError || !stockData) {
        console.error(`Error fetching data for ${symbol}:`, stockError);
        continue;
      }

      const currentPrice = stockData.currentPrice;
      const priceHistory = stockData.history || [];

      // Prepare data for AI analysis
      const recentPrices = priceHistory.slice(-30).map((h: any) => h.close);
      const priceChange = priceHistory.length >= 2
        ? ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100
        : 0;

      // Calculate simple technical indicators
      const sma20 = recentPrices.length >= 20
        ? recentPrices.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
        : currentPrice;

      const sma50 = recentPrices.length >= 50
        ? recentPrices.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50
        : currentPrice;

      // Call Lovable AI for analysis
      const aiPrompt = `You are a professional stock analyst. Analyze ${symbol} with the following data:
- Current Price: $${currentPrice}
- 30-day Price Change: ${priceChange.toFixed(2)}%
- 20-day SMA: $${sma20.toFixed(2)}
- 50-day SMA: $${sma50.toFixed(2)}
- Recent Prices: ${recentPrices.slice(-5).map((p: number) => p.toFixed(2)).join(", ")}

Provide a JSON response ONLY with this exact structure (no markdown, no code blocks):
{
  "recommendation": "BUY" or "SELL" or "HOLD",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of the recommendation",
  "technicalSignals": ["signal1", "signal2"],
  "priceTarget": estimated target price or null,
  "stopLoss": suggested stop loss price or null
}`;

      const aiResponse = await fetch("https://api.lovable.app/v1/ai/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: aiPrompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || "{}";
      
      // Clean up the response - remove markdown code blocks if present
      const cleanedContent = aiContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const analysis = JSON.parse(cleanedContent);

      analyses.push({
        symbol,
        recommendation: analysis.recommendation || "HOLD",
        confidence: analysis.confidence || 0.5,
        reasoning: analysis.reasoning || "Analysis unavailable",
        technicalSignals: analysis.technicalSignals || [],
        priceTarget: analysis.priceTarget,
        stopLoss: analysis.stopLoss,
      });
    }

    return new Response(JSON.stringify(analyses), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in analyze-stocks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
