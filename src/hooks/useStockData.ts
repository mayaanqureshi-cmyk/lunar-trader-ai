import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StockData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  volume: string;
  rawPrice?: number;
  rawChange?: number;
}

export interface NewsItem {
  source: string;
  title: string;
  summary: string;
  link?: string;
}

export const useStockData = () => {
  const [gainers, setGainers] = useState<StockData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchGainers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-stock-data', {
        body: { type: 'gainers' }
      });

      if (error) throw error;
      
      if (data?.data) {
        setGainers(data.data);
      }
    } catch (error) {
      console.error('Error fetching gainers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock data. Using cached data.",
        variant: "destructive",
      });
    }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-stock-data', {
        body: { type: 'sentiment' }
      });

      if (error) throw error;
      
      if (data?.data) {
        setNews(data.data);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const fetchQuotes = async (symbols: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-stock-data', {
        body: { type: 'quotes', symbols }
      });

      if (error) throw error;
      
      return data?.data || [];
    } catch (error) {
      console.error('Error fetching quotes:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchGainers(), fetchNews()]);
      setIsLoading(false);
    };

    loadData();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchGainers();
      fetchNews();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { gainers, news, isLoading, fetchQuotes, refetch: fetchGainers };
};
