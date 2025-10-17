-- Fix search_path for security
DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Recreate triggers
CREATE TRIGGER update_portfolio_updated_at
BEFORE UPDATE ON public.portfolio
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_paper_portfolio_updated_at
BEFORE UPDATE ON public.paper_portfolio
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();