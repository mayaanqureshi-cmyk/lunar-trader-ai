-- =============================================
-- PHASE 1: FOUNDATION & SECURITY (Fixed)
-- User Authentication, Multi-tenancy, RLS Policies
-- =============================================

-- 1. Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create app roles system
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'premium', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add user_id to existing tables (nullable to preserve existing data)

-- backtest_strategies
ALTER TABLE public.backtest_strategies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can create strategies" ON public.backtest_strategies;
DROP POLICY IF EXISTS "Anyone can delete strategies" ON public.backtest_strategies;
DROP POLICY IF EXISTS "Anyone can update strategies" ON public.backtest_strategies;
DROP POLICY IF EXISTS "Anyone can view strategies" ON public.backtest_strategies;

CREATE POLICY "Users can view their own strategies"
  ON public.backtest_strategies FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own strategies"
  ON public.backtest_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON public.backtest_strategies FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own strategies"
  ON public.backtest_strategies FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- backtest_results
ALTER TABLE public.backtest_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can insert backtest results" ON public.backtest_results;
DROP POLICY IF EXISTS "Anyone can view backtest results" ON public.backtest_results;

CREATE POLICY "Users can view their own backtest results"
  ON public.backtest_results FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own backtest results"
  ON public.backtest_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- paper_portfolio
ALTER TABLE public.paper_portfolio ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can delete from paper portfolio" ON public.paper_portfolio;
DROP POLICY IF EXISTS "Anyone can insert into paper portfolio" ON public.paper_portfolio;
DROP POLICY IF EXISTS "Anyone can update paper portfolio" ON public.paper_portfolio;
DROP POLICY IF EXISTS "Anyone can view paper portfolio" ON public.paper_portfolio;

CREATE POLICY "Users can view their own paper portfolio"
  ON public.paper_portfolio FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own paper portfolio items"
  ON public.paper_portfolio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paper portfolio"
  ON public.paper_portfolio FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete from their own paper portfolio"
  ON public.paper_portfolio FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- paper_trades
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can insert paper trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Anyone can view paper trades" ON public.paper_trades;

CREATE POLICY "Users can view their own paper trades"
  ON public.paper_trades FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own paper trades"
  ON public.paper_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- portfolio
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can delete from portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Anyone can insert into portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Anyone can update portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Anyone can view portfolio" ON public.portfolio;

CREATE POLICY "Users can view their own portfolio"
  ON public.portfolio FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own portfolio items"
  ON public.portfolio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio"
  ON public.portfolio FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete from their own portfolio"
  ON public.portfolio FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- trading_signals
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can delete signals" ON public.trading_signals;
DROP POLICY IF EXISTS "Anyone can insert signals" ON public.trading_signals;
DROP POLICY IF EXISTS "Anyone can update signals" ON public.trading_signals;
DROP POLICY IF EXISTS "Anyone can view signals" ON public.trading_signals;

CREATE POLICY "Users can view their own signals"
  ON public.trading_signals FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own signals"
  ON public.trading_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signals"
  ON public.trading_signals FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own signals"
  ON public.trading_signals FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Create trade audit log
CREATE TABLE IF NOT EXISTS public.trade_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  order_type TEXT,
  status TEXT NOT NULL,
  order_id TEXT,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trade_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit log"
  ON public.trade_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.trade_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.trade_audit_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trade_audit_log_user_id ON public.trade_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_audit_log_created_at ON public.trade_audit_log(created_at DESC);