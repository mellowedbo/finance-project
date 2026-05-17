'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { getStockQuote } from '@/lib/market-data';
import { tradingEngine, type Position } from '@/lib/trading-engine';

interface PortfolioPanelProps {
  portfolioId?: string;
}

const COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#F97316'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function PortfolioPanel({ portfolioId = 'default' }: PortfolioPanelProps) {
  const [portfolio, setPortfolio] = useState(() => {
    if (!tradingEngine.getPortfolio(portfolioId)) {
      tradingEngine.createPortfolio(portfolioId);
    }
    return tradingEngine.getPortfolio(portfolioId)!;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const pf = tradingEngine.getPortfolio(portfolioId);
      if (pf) {
        const priceMap: Record<string, number> = {};
        for (const pos of pf.positions) {
          const quote = getStockQuote(pos.ticker);
          priceMap[pos.ticker] = quote.price;
        }
        tradingEngine.updatePrices(priceMap, portfolioId);
        setPortfolio({ ...tradingEngine.getPortfolio(portfolioId)! });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [portfolioId]);

  const allocationData = useMemo(() => {
    const data = portfolio.positions.map((pos, i) => ({
      name: pos.ticker,
      value: pos.marketValue,
      color: COLORS[i % COLORS.length],
    }));

    if (portfolio.cash > 0) {
      data.push({
        name: 'Cash',
        value: portfolio.cash,
        color: '#6B7280',
      });
    }

    return data;
  }, [portfolio.positions, portfolio.cash]);

  // Mock equity curve
  const equityCurve = useMemo(() => {
    const curve = [];
    let value = 100000;
    for (let i = 0; i < 30; i++) {
      value += (Math.random() - 0.48) * value * 0.01;
      curve.push({
        day: i,
        equity: Math.round(value * 100) / 100,
      });
    }
    curve[curve.length - 1].equity = portfolio.totalValue;
    return curve;
  }, [portfolio.totalValue]);

  const isDayPositive = portfolio.dayPnL >= 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Total Value</span>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums">
              {formatCurrency(portfolio.totalValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Cash</span>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums">
              {formatCurrency(portfolio.cash)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {isDayPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Day P&L</span>
            </div>
            <p className={`text-xl font-bold font-mono tabular-nums ${isDayPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isDayPositive ? '+' : ''}{formatCurrency(portfolio.dayPnL)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {portfolio.totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Total P&L</span>
            </div>
            <p className={`text-xl font-bold font-mono tabular-nums ${portfolio.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {portfolio.totalPnL >= 0 ? '+' : ''}{formatCurrency(portfolio.totalPnL)}
              <span className="text-sm ml-1">
                ({portfolio.totalPnLPercent >= 0 ? '+' : ''}{portfolio.totalPnLPercent.toFixed(2)}%)
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Holdings Table */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No positions yet. Place a trade to get started.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Ticker</TableHead>
                      <TableHead className="text-[11px] text-right">Shares</TableHead>
                      <TableHead className="text-[11px] text-right">Avg Cost</TableHead>
                      <TableHead className="text-[11px] text-right">Price</TableHead>
                      <TableHead className="text-[11px] text-right">Value</TableHead>
                      <TableHead className="text-[11px] text-right">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.positions.map((pos) => (
                      <TableRow key={pos.ticker}>
                        <TableCell className="font-mono font-semibold text-xs">{pos.ticker}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{pos.shares}</TableCell>
                        <TableCell className="text-right font-mono text-xs">${pos.avgPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">${pos.currentPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(pos.marketValue)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${pos.unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {pos.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnL)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allocation Pie Chart */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-[11px]">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Equity']}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
