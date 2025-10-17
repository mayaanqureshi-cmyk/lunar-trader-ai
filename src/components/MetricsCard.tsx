import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricsCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: LucideIcon;
}

export const MetricsCard = ({ title, value, change, isPositive, icon: Icon }: MetricsCardProps) => {
  return (
    <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground mb-2">{value}</h3>
          <p className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '↑' : '↓'} {change}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${isPositive ? 'bg-success/10' : 'bg-danger/10'}`}>
          <Icon className={`h-6 w-6 ${isPositive ? 'text-success' : 'text-danger'}`} />
        </div>
      </div>
    </Card>
  );
};
