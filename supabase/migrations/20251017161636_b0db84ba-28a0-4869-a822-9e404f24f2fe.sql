-- Create paper trading portfolio table
CREATE TABLE public.paper_portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create paper trading history table
CREATE TABLE public.paper_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  profit_loss NUMERIC,
  trade_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backtesting strategies table
CREATE TABLE public.backtest_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  buy_condition TEXT NOT NULL,
  sell_condition TEXT NOT NULL,
  initial_capital NUMERIC NOT NULL DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backtesting results table
CREATE TABLE public.backtest_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id UUID NOT NULL REFERENCES public.backtest_strategies(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  total_profit_loss NUMERIC NOT NULL,
  return_percentage NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  sharpe_ratio NUMERIC,
  win_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paper_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

-- Create policies for paper_portfolio
CREATE POLICY "Anyone can view paper portfolio" ON public.paper_portfolio FOR SELECT USING (true);
CREATE POLICY "Anyone can insert into paper portfolio" ON public.paper_portfolio FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update paper portfolio" ON public.paper_portfolio FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete from paper portfolio" ON public.paper_portfolio FOR DELETE USING (true);

-- Create policies for paper_trades
CREATE POLICY "Anyone can view paper trades" ON public.paper_trades FOR SELECT USING (true);
CREATE POLICY "Anyone can insert paper trades" ON public.paper_trades FOR INSERT WITH CHECK (true);

-- Create policies for backtest_strategies
CREATE POLICY "Anyone can view strategies" ON public.backtest_strategies FOR SELECT USING (true);
CREATE POLICY "Anyone can create strategies" ON public.backtest_strategies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update strategies" ON public.backtest_strategies FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete strategies" ON public.backtest_strategies FOR DELETE USING (true);

-- Create policies for backtest_results
CREATE POLICY "Anyone can view backtest results" ON public.backtest_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert backtest results" ON public.backtest_results FOR INSERT WITH CHECK (true);

-- Create trigger for paper_portfolio updated_at
CREATE TRIGGER update_paper_portfolio_updated_at
BEFORE UPDATE ON public.paper_portfolio
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();