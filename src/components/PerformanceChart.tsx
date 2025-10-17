import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { BarChart3 } from "lucide-react";

const mockData = [
  { date: "Week 1", value: 10000 },
  { date: "Week 2", value: 10500 },
  { date: "Week 3", value: 10300 },
  { date: "Week 4", value: 11200 },
  { date: "Week 5", value: 11800 },
  { date: "Week 6", value: 11500 },
  { date: "Week 7", value: 12400 },
  { date: "Week 8", value: 13100 },
];

export const PerformanceChart = () => {
  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Portfolio Performance</h2>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(189, 94%, 43%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(189, 94%, 43%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 24%)" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(215, 20%, 65%)" 
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(215, 20%, 65%)" 
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(217, 33%, 17%)', 
                border: '1px solid hsl(217, 33%, 24%)',
                borderRadius: '8px',
                color: 'hsl(210, 40%, 98%)'
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(189, 94%, 43%)" 
              strokeWidth={3}
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Starting Value</p>
          <p className="text-lg font-bold text-foreground">$10,000</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Current Value</p>
          <p className="text-lg font-bold text-success">$13,100</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Total Gain</p>
          <p className="text-lg font-bold text-success">+31%</p>
        </div>
      </div>
    </Card>
  );
};
