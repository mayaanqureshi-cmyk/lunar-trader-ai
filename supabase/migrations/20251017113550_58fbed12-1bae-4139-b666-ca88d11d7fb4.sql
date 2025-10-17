-- Create portfolio table to track bought stocks
CREATE TABLE public.portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  purchase_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (for now allowing all operations - in production add user_id)
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio access
CREATE POLICY "Anyone can view portfolio"
  ON public.portfolio
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert into portfolio"
  ON public.portfolio
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update portfolio"
  ON public.portfolio
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete from portfolio"
  ON public.portfolio
  FOR DELETE
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER set_portfolio_updated_at
  BEFORE UPDATE ON public.portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create table for tracking trading signals and notifications
CREATE TABLE public.trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolio(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'dip_alert', 'sell_signal', 'buy_signal'
  current_price DECIMAL(10, 2) NOT NULL,
  price_change_percent DECIMAL(5, 2) NOT NULL,
  current_gain_percent DECIMAL(5, 2),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trading signals
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- Create policies for trading signals
CREATE POLICY "Anyone can view signals"
  ON public.trading_signals
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert signals"
  ON public.trading_signals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update signals"
  ON public.trading_signals
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete signals"
  ON public.trading_signals
  FOR DELETE
  USING (true);

-- Enable realtime for trading signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;