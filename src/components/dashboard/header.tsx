'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Settings, Radio, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMarketIndices, type MarketIndex } from '@/lib/market-data';
import { useSettingsStore } from '@/lib/settings-store';

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const { demoMode } = useSettingsStore();
  const [indices, setIndices] = useState<MarketIndex[]>(() => getMarketIndices());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshIndices = useCallback(() => {
    setIndices(getMarketIndices());
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(refreshIndices, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshIndices]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      {/* Market Ticker Strip */}
      <div className="h-8 bg-muted/30 border-b border-border flex items-center overflow-hidden">
        <div className="flex animate-scroll whitespace-nowrap gap-8 px-4">
          {indices.map((index) => (
            <div key={index.symbol} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">{index.name}</span>
              <span className="font-mono font-semibold">{index.value.toLocaleString()}</span>
              <span
                className={`font-mono flex items-center gap-0.5 ${
                  index.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {index.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {index.change >= 0 ? '+' : ''}
                {index.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
          {/* Duplicate for seamless scroll */}
          {indices.map((index) => (
            <div key={`${index.symbol}-dup`} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">{index.name}</span>
              <span className="font-mono font-semibold">{index.value.toLocaleString()}</span>
              <span
                className={`font-mono flex items-center gap-0.5 ${
                  index.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {index.change >= 0 ? '+' : ''}
                {index.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Header */}
      <div className="h-14 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <BarChart3Icon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              MERIDIAN
            </h1>
          </div>
          {demoMode && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 border-amber-500/30 text-amber-500">
              <Radio className="h-2.5 w-2.5" />
              DEMO
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16V8" />
      <path d="M11 16V11" />
      <path d="M15 16V6" />
      <path d="M19 16V14" />
    </svg>
  );
}
