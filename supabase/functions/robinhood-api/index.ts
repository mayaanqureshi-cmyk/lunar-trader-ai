import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RobinhoodCredentials {
  username: string;
  password: string;
  mfa_code?: string;
  device_token?: string;
}

interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  mfa_required?: boolean;
  backup_code?: boolean;
  error?: string;
}

interface PortfolioPosition {
  symbol: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  equity: number;
  percent_change: number;
  intraday_percent_change: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, mfa_code, symbol, quantity, type } = await req.json();
    
    const username = Deno.env.get('ROBINHOOD_USERNAME');
    const password = Deno.env.get('ROBINHOOD_PASSWORD');

    if (!username || !password) {
      throw new Error('Robinhood credentials not configured');
    }

    // Login to Robinhood
    const authToken = await loginToRobinhood(username, password, mfa_code);

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed', mfa_required: !mfa_code }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    switch (action) {
      case 'get_portfolio':
        const portfolio = await getPortfolio(authToken);
        return new Response(
          JSON.stringify({ portfolio }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'get_account':
        const account = await getAccount(authToken);
        return new Response(
          JSON.stringify({ account }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'place_order':
        if (!symbol || !quantity || !type) {
          throw new Error('Missing required parameters for order');
        }
        const order = await placeOrder(authToken, symbol, quantity, type);
        return new Response(
          JSON.stringify({ order }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Robinhood API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function loginToRobinhood(
  username: string,
  password: string,
  mfa_code?: string
): Promise<string | null> {
  try {
    const deviceToken = crypto.randomUUID();
    
    const loginPayload: any = {
      username,
      password,
      grant_type: 'password',
      client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
      expires_in: 86400,
      device_token: deviceToken,
      scope: 'internal',
    };

    if (mfa_code) {
      loginPayload.mfa_code = mfa_code;
    }

    const response = await fetch('https://api.robinhood.com/oauth2/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(loginPayload),
    });

    const data = await response.json();
    
    if (data.access_token) {
      return data.access_token;
    }

    if (data.mfa_required) {
      console.log('MFA code required');
      return null;
    }

    console.error('Login failed:', data);
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function getAccount(token: string) {
  const response = await fetch('https://api.robinhood.com/accounts/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    const account = data.results[0];
    return {
      account_number: account.account_number,
      buying_power: parseFloat(account.buying_power || 0),
      cash: parseFloat(account.cash || 0),
      portfolio_cash: parseFloat(account.portfolio_cash || 0),
    };
  }

  return null;
}

async function getPortfolio(token: string): Promise<PortfolioPosition[]> {
  // Get positions
  const positionsResponse = await fetch('https://api.robinhood.com/positions/?nonzero=true', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  const positionsData = await positionsResponse.json();
  
  if (!positionsData.results) {
    return [];
  }

  const positions: PortfolioPosition[] = [];

  for (const position of positionsData.results) {
    try {
      // Get instrument details
      const instrumentResponse = await fetch(position.instrument, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      const instrument = await instrumentResponse.json();

      // Get quote for current price
      const quoteResponse = await fetch(`https://api.robinhood.com/quotes/${instrument.symbol}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      const quote = await quoteResponse.json();

      const quantity = parseFloat(position.quantity);
      const avgBuyPrice = parseFloat(position.average_buy_price);
      const currentPrice = parseFloat(quote.last_trade_price);
      const equity = quantity * currentPrice;
      const costBasis = quantity * avgBuyPrice;
      const percentChange = ((equity - costBasis) / costBasis) * 100;

      positions.push({
        symbol: instrument.symbol,
        quantity,
        average_buy_price: avgBuyPrice,
        current_price: currentPrice,
        equity,
        percent_change: percentChange,
        intraday_percent_change: parseFloat(quote.intraday_percent_change || 0),
      });
    } catch (error) {
      console.error(`Error processing position:`, error);
    }
  }

  return positions;
}

async function placeOrder(
  token: string,
  symbol: string,
  quantity: number,
  type: 'buy' | 'sell'
): Promise<any> {
  // Get account
  const accountResponse = await fetch('https://api.robinhood.com/accounts/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  const accountData = await accountResponse.json();
  const accountUrl = accountData.results[0].url;

  // Get instrument
  const instrumentResponse = await fetch(`https://api.robinhood.com/instruments/?symbol=${symbol}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  const instrumentData = await instrumentResponse.json();
  const instrumentUrl = instrumentData.results[0].url;

  // Get current price
  const quoteResponse = await fetch(`https://api.robinhood.com/quotes/${symbol}/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  const quote = await quoteResponse.json();
  const currentPrice = parseFloat(quote.last_trade_price);

  // Place order
  const orderPayload = {
    account: accountUrl,
    instrument: instrumentUrl,
    symbol: symbol,
    type: 'market',
    time_in_force: 'gfd',
    trigger: 'immediate',
    quantity: quantity.toString(),
    side: type,
    price: currentPrice.toFixed(2),
  };

  const orderResponse = await fetch('https://api.robinhood.com/orders/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  const orderData = await orderResponse.json();
  
  if (!orderResponse.ok) {
    throw new Error(`Order failed: ${JSON.stringify(orderData)}`);
  }

  return {
    id: orderData.id,
    state: orderData.state,
    type: orderData.type,
    side: orderData.side,
    quantity: orderData.quantity,
    price: orderData.price,
    symbol: orderData.symbol,
  };
}
