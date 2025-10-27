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
    const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY');
    const ALPACA_SECRET_KEY = Deno.env.get('ALPACA_SECRET_KEY');

    if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
      throw new Error('Alpaca credentials not configured');
    }

    console.log('Fetching Alpaca account data...');

    // Fetch account information
    const accountResponse = await fetch('https://api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('Account fetch failed:', errorText);
      throw new Error(`Account fetch failed: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();

    // Fetch current positions
    const positionsResponse = await fetch('https://api.alpaca.markets/v2/positions', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    const positions = positionsResponse.ok ? await positionsResponse.json() : [];

    // Fetch recent orders
    const ordersResponse = await fetch('https://api.alpaca.markets/v2/orders?status=all&limit=10', {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });

    const orders = ordersResponse.ok ? await ordersResponse.json() : [];

    console.log('Successfully fetched Alpaca data');

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          status: accountData.status,
          buying_power: accountData.buying_power,
          cash: accountData.cash,
          portfolio_value: accountData.portfolio_value,
          equity: accountData.equity,
          last_equity: accountData.last_equity,
          daytrade_count: accountData.daytrade_count,
        },
        positions: positions.map((pos: any) => ({
          symbol: pos.symbol,
          qty: pos.qty,
          avg_entry_price: pos.avg_entry_price,
          side: pos.side,
          market_value: pos.market_value,
          cost_basis: pos.cost_basis,
          unrealized_pl: pos.unrealized_pl,
          unrealized_plpc: pos.unrealized_plpc,
          current_price: pos.current_price,
        })),
        recent_orders: orders.map((order: any) => ({
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          qty: order.qty,
          status: order.status,
          filled_avg_price: order.filled_avg_price,
          filled_at: order.filled_at,
          created_at: order.created_at,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Alpaca data:', error);
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