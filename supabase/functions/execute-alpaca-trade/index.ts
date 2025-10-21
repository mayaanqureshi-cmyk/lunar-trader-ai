import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, action, quantity, orderType = 'market', limit_price, stop_price, stop_loss, take_profit } = await req.json();
    
    console.log(`Executing ${action} order for ${symbol}, quantity: ${quantity}, type: ${orderType}`);

    const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY');
    const ALPACA_SECRET_KEY = Deno.env.get('ALPACA_SECRET_KEY');

    if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
      throw new Error('Alpaca credentials not configured');
    }

    // Check account status first
    const accountResponse = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('Account check failed:', errorText);
      throw new Error(`Account check failed: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();
    console.log('Account status:', accountData.status, 'Buying power:', accountData.buying_power);

    // Place the order
    const alpacaOrderPayload: any = {
      symbol: symbol.toUpperCase(),
      qty: quantity,
      side: action.toLowerCase(),
      type: orderType,
      time_in_force: 'day',
    };

    if (limit_price) {
      alpacaOrderPayload.limit_price = limit_price;
    }

    if (stop_price) {
      alpacaOrderPayload.stop_price = stop_price;
    }

    console.log('Placing order:', alpacaOrderPayload);

    const orderResponse = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alpacaOrderPayload),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Order placement failed:', errorText);
      throw new Error(`Order placement failed: ${orderResponse.status} - ${errorText}`);
    }

    const orderData = await orderResponse.json();
    console.log('Order placed successfully:', orderData.id);

    // Place bracket orders for stop-loss and take-profit if provided
    if (action.toLowerCase() === 'buy' && (stop_loss || take_profit)) {
      const bracketOrders = [];

      if (stop_loss) {
        const stopLossPayload = {
          symbol: symbol.toUpperCase(),
          qty: quantity,
          side: 'sell',
          type: 'stop',
          stop_price: stop_loss,
          time_in_force: 'gtc',
        };
        bracketOrders.push(
          fetch('https://paper-api.alpaca.markets/v2/orders', {
            method: 'POST',
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stopLossPayload),
          })
        );
      }

      if (take_profit) {
        const takeProfitPayload = {
          symbol: symbol.toUpperCase(),
          qty: quantity,
          side: 'sell',
          type: 'limit',
          limit_price: take_profit,
          time_in_force: 'gtc',
        };
        bracketOrders.push(
          fetch('https://paper-api.alpaca.markets/v2/orders', {
            method: 'POST',
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(takeProfitPayload),
          })
        );
      }

      await Promise.all(bracketOrders);
      console.log('Bracket orders placed for stop-loss and take-profit');
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderData.id,
          symbol: orderData.symbol,
          side: orderData.side,
          quantity: orderData.qty,
          status: orderData.status,
          filled_at: orderData.filled_at,
          filled_avg_price: orderData.filled_avg_price,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error executing trade:', error);
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
