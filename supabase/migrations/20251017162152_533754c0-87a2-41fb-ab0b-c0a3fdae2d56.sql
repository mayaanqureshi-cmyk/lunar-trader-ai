-- Change quantity columns to support fractional shares
ALTER TABLE public.portfolio ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;
ALTER TABLE public.paper_portfolio ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;
ALTER TABLE public.paper_trades ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;