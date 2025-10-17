import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PortfolioStock {
  id: string;
  symbol: string;
  name: string;
  purchase_price: number;
  quantity: number;
  purchase_date: string;
  current_price?: number;
  current_gain_percent?: number;
  current_value?: number;
}

export interface TradingSignal {
  id: string;
  portfolio_id: string;
  signal_type: string;
  current_price: number;
  price_change_percent: number;
  current_gain_percent: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPortfolio(data || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio",
        variant: "destructive",
      });
    }
  };

  const fetchSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const addToPortfolio = async (stock: Omit<PortfolioStock, 'id' | 'purchase_date'>) => {
    try {
      const { error } = await supabase
        .from('portfolio')
        .insert([stock]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${stock.symbol} to portfolio`,
      });

      await fetchPortfolio();
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to add stock to portfolio",
        variant: "destructive",
      });
    }
  };

  const removeFromPortfolio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Removed stock from portfolio",
      });

      await fetchPortfolio();
    } catch (error) {
      console.error('Error removing from portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to remove stock",
        variant: "destructive",
      });
    }
  };

  const markSignalAsRead = async (signalId: string) => {
    try {
      const { error } = await supabase
        .from('trading_signals')
        .update({ is_read: true })
        .eq('id', signalId);

      if (error) throw error;
      await fetchSignals();
    } catch (error) {
      console.error('Error marking signal as read:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPortfolio(), fetchSignals()]);
      setIsLoading(false);
    };

    loadData();

    // Subscribe to real-time signals
    const signalsChannel = supabase
      .channel('trading_signals_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('New signal received:', payload);
          setSignals(prev => [payload.new as TradingSignal, ...prev]);
          
          const newSignal = payload.new as TradingSignal;
          toast({
            title: newSignal.signal_type === 'sell_signal' ? "🔔 Sell Signal!" : "⚠️ Price Alert",
            description: newSignal.message,
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalsChannel);
    };
  }, []);

  return {
    portfolio,
    signals,
    isLoading,
    addToPortfolio,
    removeFromPortfolio,
    markSignalAsRead,
    refetch: fetchPortfolio,
  };
};
