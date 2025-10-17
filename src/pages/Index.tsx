import { Header } from "@/components/Header";
import { MetricsCard } from "@/components/MetricsCard";
import { TopGainers } from "@/components/TopGainers";
import { SentimentAnalysis } from "@/components/SentimentAnalysis";
import { TradingSignals } from "@/components/TradingSignals";
import { PerformanceChart } from "@/components/PerformanceChart";
import { DollarSign, TrendingUp, Target, Activity } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div 
        className="relative h-64 bg-cover bg-center mb-8"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            AI-Powered Trading Intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Track top performers, analyze market sentiment, and receive AI-generated trading signals for optimized profit generation.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="Portfolio Value"
            value="$13,100"
            change="31.0%"
            isPositive={true}
            icon={DollarSign}
          />
          <MetricsCard
            title="Today's Gain"
            value="$425"
            change="3.35%"
            isPositive={true}
            icon={TrendingUp}
          />
          <MetricsCard
            title="Active Signals"
            value="8"
            change="2 new"
            isPositive={true}
            icon={Target}
          />
          <MetricsCard
            title="Win Rate"
            value="78.5%"
            change="5.2%"
            isPositive={true}
            icon={Activity}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <TradingSignals />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopGainers />
          <SentimentAnalysis />
        </div>
      </div>
    </div>
  );
};

export default Index;
