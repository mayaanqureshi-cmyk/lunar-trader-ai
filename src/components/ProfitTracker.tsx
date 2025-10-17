import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const ProfitTracker = () => {
  const monthlyGoal = 2000;
  const currentProfit = 425; // This would come from actual portfolio data
  const progressPercent = (currentProfit / monthlyGoal) * 100;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const daysRemaining = daysInMonth - currentDay;

  const dailyTarget = monthlyGoal / daysInMonth;
  const requiredDailyRate = (monthlyGoal - currentProfit) / (daysRemaining || 1);

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Monthly Goal Tracker</h2>
      </div>

      {/* Main Goal Display */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Current Progress</p>
            <p className="text-3xl font-bold text-foreground">${currentProfit}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Goal</p>
            <p className="text-3xl font-bold text-primary">${monthlyGoal}</p>
          </div>
        </div>
        
        <Progress value={progressPercent} className="h-3 mb-2" />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {progressPercent.toFixed(1)}% complete
          </span>
          <Badge variant={progressPercent >= 50 ? "default" : "secondary"}>
            ${(monthlyGoal - currentProfit).toFixed(0)} remaining
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Days Remaining</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{daysRemaining}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Day {currentDay} of {daysInMonth}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Daily Target</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${dailyTarget.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Average needed
          </p>
        </div>
      </div>

      {/* Required Daily Rate */}
      <div className={`p-4 rounded-lg border ${
        requiredDailyRate > dailyTarget * 1.5 
          ? 'bg-danger/10 border-danger/20' 
          : requiredDailyRate > dailyTarget 
          ? 'bg-primary/10 border-primary/20'
          : 'bg-success/10 border-success/20'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-semibold text-foreground">Required Daily Rate</span>
          </div>
          {requiredDailyRate > dailyTarget * 1.5 ? (
            <Badge variant="destructive">Challenging</Badge>
          ) : requiredDailyRate > dailyTarget ? (
            <Badge variant="default">On Track</Badge>
          ) : (
            <Badge className="bg-success text-success-foreground">Ahead</Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground mb-2">
          ${requiredDailyRate.toFixed(0)}/day
        </p>
        <p className="text-xs text-muted-foreground">
          {requiredDailyRate > dailyTarget 
            ? `Need to increase daily profit by $${(requiredDailyRate - dailyTarget).toFixed(0)}`
            : `You're ahead of target! Keep it up!`
          }
        </p>
      </div>

      {/* Weekly Breakdown */}
      <div className="mt-6 p-4 rounded-lg bg-secondary/50">
        <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Week 1 Target:</span>
            <span className="font-semibold text-foreground">${(monthlyGoal / 4).toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Week 2 Target:</span>
            <span className="font-semibold text-foreground">${(monthlyGoal / 4).toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Week 3 Target:</span>
            <span className="font-semibold text-foreground">${(monthlyGoal / 4).toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Week 4 Target:</span>
            <span className="font-semibold text-foreground">${(monthlyGoal / 4).toFixed(0)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
