import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddToPortfolioProps {
  onAdd: (stock: {
    symbol: string;
    name: string;
    purchase_price: number;
    quantity: number;
  }) => Promise<void>;
}

export const AddToPortfolio = ({ onAdd }: AddToPortfolioProps) => {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol || !name || !price || !quantity) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        symbol: symbol.toUpperCase(),
        name,
        purchase_price: parseFloat(price),
        quantity: parseInt(quantity),
      });

      // Reset form
      setSymbol("");
      setName("");
      setPrice("");
      setQuantity("");
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="AAPL"
              className="uppercase"
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apple Inc"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Purchase Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="150.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              required
            />
          </div>
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
