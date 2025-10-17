import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddToPortfolioProps {
  onAdd: (stock: {
    symbol: string;
    name: string;
    purchase_price: number;
    quantity: number;
  }) => Promise<void>;
}

export const AddToPortfolio = ({ onAdd }: AddToPortfolioProps) => {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-stock-input", {
        body: { text: input }
      });

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      await onAdd({
        symbol: data.symbol,
        name: data.name,
        purchase_price: data.purchase_price,
        quantity: data.quantity,
      });

      setInput("");
      toast({
        title: "Stock added",
        description: `Added ${data.quantity} shares of ${data.symbol}`,
      });
    } catch (error) {
      console.error("Error parsing stock input:", error);
      toast({
        title: "Error",
        description: "Could not parse your input. Try: 'bought 10 AAPL at 150'",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        Add Stock to Portfolio
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="stock-input">Describe your purchase</Label>
          <Textarea
            id="stock-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="bought 10 AAPL at 150"
            className="min-h-[80px]"
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            Examples: "bought 10 AAPL at 150" or "purchased 5 shares of Tesla at 200"
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : "Add to Portfolio"}
        </Button>
      </form>
    </Card>
  );
};
