'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { getMarketIndices, type MarketIndex } from '@/lib/market-data';

export function MarketOverview() {
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {indices.map((index) => {
        const isPositive = index.change >= 0;
        const sparkData = index.sparkline.map((value, i) => ({ value, i }));

        return (
          <Card
            key={index.symbol}
            className="border-border hover:border-emerald-500/30 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {index.name}
                </span>
                <div
                  className={`flex items-center gap-1 text-xs font-mono ${
                    isPositive ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPositive ? '+' : ''}
                  {index.changePercent.toFixed(2)}%
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl font-bold font-mono tabular-nums">
                  {index.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`text-sm font-mono ${
                    isPositive ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {index.change.toFixed(2)}
                </span>
              </div>

              {/* Sparkline */}
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient
                        id={`gradient-${index.symbol}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={isPositive ? '#10B981' : '#EF4444'}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={isPositive ? '#10B981' : '#EF4444'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={isPositive ? '#10B981' : '#EF4444'}
                      strokeWidth={1.5}
                      fill={`url(#gradient-${index.symbol})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
