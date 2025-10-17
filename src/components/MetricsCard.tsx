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
    <Card className="p-6 bg-card border border-border shadow-card hover:shadow-elevated transition-shadow duration-150">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
          <h3 className="text-3xl font-semibold text-foreground mb-2">{value}</h3>
          <p className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '↑' : '↓'} {change}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${isPositive ? 'bg-success/10' : 'bg-danger/10'}`}>
          <Icon className={`h-5 w-5 ${isPositive ? 'text-success' : 'text-danger'}`} />
        </div>
      </div>
    </Card>
  );
};
