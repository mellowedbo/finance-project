'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getHistoricalData, type OHLCV } from '@/lib/market-data';
import { getStockQuote } from '@/lib/market-data';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockChartProps {
  ticker: string;
}

const PERIODS = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

export function StockChart({ ticker }: StockChartProps) {
  const [period, setPeriod] = useState('1Y');

  const data: OHLCV[] = useMemo(() => {
    return getHistoricalData(ticker, period).data;
  }, [ticker, period]);

  const quote = useMemo(() => getStockQuote(ticker), [ticker]);
  const isPositive = quote.change >= 0;

  // Format data for recharts
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: d.date,
      close: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      volume: d.volume,
      price: d.close,
    }));
  }, [data]);

  const volumeData = useMemo(() => {
    return data.map((d) => ({
      date: d.date,
      volume: d.volume / 1e6,
      isUp: d.close >= d.open,
    }));
  }, [data]);

  // Determine date format based on period
  const dateFormat = (date: string) => {
    if (period === '1D') return date.slice(11, 16);
    if (period === '1W' || period === '1M') return date.slice(5, 10);
    return date.slice(2, 7);
  };

  // Calculate min/max for Y axis with padding
  const prices = data.map((d) => d.close);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 1;
  const padding = (maxPrice - minPrice) * 0.1;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {ticker}
              <span className="text-sm text-muted-foreground font-normal">
                {quote.name}
              </span>
            </CardTitle>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold font-mono tabular-nums">
                ${quote.price.toFixed(2)}
              </span>
              <span
                className={`flex items-center gap-1 text-sm font-mono ${
                  isPositive ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {isPositive ? '+' : ''}
                {quote.change.toFixed(2)} ({isPositive ? '+' : ''}
                {quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 text-xs px-2.5 font-mono ${
                  period === p
                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Price Chart */}
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? '#10B981' : '#EF4444'}
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? '#10B981' : '#EF4444'}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                tickFormatter={dateFormat}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                domain={[minPrice - padding, maxPrice + padding]}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(label: string) => `Date: ${label}`}
                formatter={(value: number, name: string) => [
                  name === 'price' ? `$${value.toFixed(2)}` : value,
                  name === 'price' ? 'Price' : name,
                ]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: isPositive ? '#10B981' : '#EF4444',
                  strokeWidth: 2,
                  fill: 'var(--card)',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="h-[60px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={false} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}M`, 'Volume']}
              />
              <Bar
                dataKey="volume"
                fill="#10B981"
                opacity={0.4}
                radius={[1, 1, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          {[
            { label: 'Open', value: `$${quote.open.toFixed(2)}` },
            { label: 'High', value: `$${quote.high.toFixed(2)}` },
            { label: 'Low', value: `$${quote.low.toFixed(2)}` },
            { label: 'Volume', value: `${(quote.volume / 1e6).toFixed(1)}M` },
          ].map((stat) => (
            <div key={stat.label}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <p className="font-mono text-sm font-medium mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
