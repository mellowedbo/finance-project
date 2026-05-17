'use client';

import React, { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { TickerSelector } from '@/components/dashboard/ticker-selector';
import { StockChart } from '@/components/dashboard/stock-chart';
import { PortfolioPanel } from '@/components/dashboard/portfolio-panel';
import { TradingPanel } from '@/components/dashboard/trading-panel';
import { MLLab } from '@/components/dashboard/ml-lab';
import { RiskAnalytics } from '@/components/dashboard/risk-analytics';
import { AIResearchAgent } from '@/components/dashboard/ai-research-agent';
import { BacktestPanel } from '@/components/dashboard/backtest-panel';
import { ComparisonPanel } from '@/components/dashboard/comparison-panel';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['AAPL', 'NVDA', 'MSFT']);
  const [primaryTicker, setPrimaryTicker] = useState('AAPL');

  const handleTickerSelect = useCallback((ticker: string) => {
    setSelectedTickers((prev) => [...prev, ticker]);
    setPrimaryTicker(ticker);
  }, []);

  const handleTickerRemove = useCallback((ticker: string) => {
    setSelectedTickers((prev) => {
      const next = prev.filter((t) => t !== ticker);
      if (next.length === 0) next.push('AAPL');
      return next;
    });
    if (primaryTicker === ticker) {
      setPrimaryTicker(selectedTickers.find((t) => t !== ticker) ?? 'AAPL');
    }
  }, [primaryTicker, selectedTickers]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <MarketOverview />

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Watchlist
              </h2>
              <TickerSelector
                selectedTickers={selectedTickers}
                onTickerSelect={handleTickerSelect}
                onTickerRemove={handleTickerRemove}
              />
            </div>

            <StockChart ticker={primaryTicker} />

            <PortfolioPanel />
          </div>
        );

      case 'analysis':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Quantitative Analysis</h2>
              <p className="text-sm text-muted-foreground">
                ML-powered analysis, risk metrics, and stock comparison tools
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-6">
                <MLLab />
                <ComparisonPanel />
              </div>
              <div className="space-y-6">
                <RiskAnalytics />
              </div>
            </div>
          </div>
        );

      case 'trading':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Paper Trading</h2>
              <p className="text-sm text-muted-foreground">
                Practice trading with $100,000 virtual capital — zero risk
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="text-xs text-muted-foreground">Active Ticker:</span>
              {selectedTickers.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setPrimaryTicker(ticker)}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                    primaryTicker === ticker
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                  }`}
                >
                  {ticker}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <StockChart ticker={primaryTicker} />
              <TradingPanel selectedTicker={primaryTicker} />
            </div>

            <PortfolioPanel />
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">AI Research</h2>
              <p className="text-sm text-muted-foreground">
                Multi-model AI assistant for quantitative finance analysis
              </p>
            </div>
            <AIResearchAgent />
          </div>
        );

      case 'backtest':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Strategy Backtesting</h2>
              <p className="text-sm text-muted-foreground">
                Test trading strategies against historical data with detailed performance analytics
              </p>
            </div>
            <BacktestPanel />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}
