'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FlaskConical, Play } from 'lucide-react';
import { BUILTIN_STRATEGIES, type BacktestResult } from '@/lib/backtest-engine';
import { getAvailableTickers } from '@/lib/market-data';

export function BacktestPanel() {
  const [strategy, setStrategy] = useState('SMA Crossover');
  const [ticker, setTicker] = useState('AAPL');
  const [period, setPeriod] = useState('1Y');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);

  const runBacktest = useCallback(async () => {
    setRunning(true);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, strategy, period }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setRunning(false);
    }
  }, [ticker, strategy, period]);

  const availableTickers = getAvailableTickers();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Backtesting Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILTIN_STRATEGIES.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Ticker</Label>
              <Select value={ticker} onValueChange={setTicker}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTickers.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="6M">6 Months</SelectItem>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="5Y">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Strategy Description</Label>
              <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                {BUILTIN_STRATEGIES.find(s => s.name === strategy)?.description}
              </p>
            </div>

            <div className="flex items-end">
              <Button
                onClick={runBacktest}
                disabled={running}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Play className="h-4 w-4 mr-1.5" />
                {running ? 'Running...' : 'Run Backtest'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Return', value: `${(result.totalReturn * 100).toFixed(2)}%`, color: result.totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Ann. Return', value: `${(result.annualizedReturn * 100).toFixed(2)}%`, color: result.annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Sharpe Ratio', value: result.sharpeRatio.toFixed(2), color: result.sharpeRatio > 1 ? 'text-emerald-500' : 'text-amber-500' },
              { label: 'Max Drawdown', value: `${(result.maxDrawdown * 100).toFixed(2)}%`, color: 'text-red-500' },
              { label: 'Win Rate', value: `${(result.winRate * 100).toFixed(1)}%`, color: result.winRate > 0.5 ? 'text-emerald-500' : 'text-amber-500' },
              { label: 'Total Trades', value: String(result.totalTrades), color: '' },
            ].map((metric) => (
              <Card key={metric.label} className="border-border">
                <CardContent className="p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {metric.label}
                  </span>
                  <p className={`text-lg font-bold font-mono mt-0.5 ${metric.color}`}>
                    {metric.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Equity Curve */}
            <Card className="lg:col-span-2 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.equityCurve}>
                      <defs>
                        <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5, 10)} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={55} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
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
                        fill="url(#eqGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Trade Statistics */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Trade Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Profit Factor', value: result.profitFactor.toFixed(2) },
                  { label: 'Avg Win', value: `$${result.metrics.avgWin.toFixed(2)}` },
                  { label: 'Avg Loss', value: `$${result.metrics.avgLoss.toFixed(2)}` },
                  { label: 'Largest Win', value: `$${result.metrics.largestWin.toFixed(2)}` },
                  { label: 'Largest Loss', value: `$${result.metrics.largestLoss.toFixed(2)}` },
                  { label: 'Consec. Wins', value: String(result.metrics.consecutiveWins) },
                  { label: 'Consec. Losses', value: String(result.metrics.consecutiveLosses) },
                  { label: 'Avg Hold Period', value: `${result.avgHoldPeriod} days` },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center text-xs p-2 rounded-md bg-muted/50">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-mono font-medium">{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Trade Log */}
          {result.trades.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Trade Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Entry Date</TableHead>
                        <TableHead className="text-[11px] text-right">Entry Price</TableHead>
                        <TableHead className="text-[11px]">Exit Date</TableHead>
                        <TableHead className="text-[11px] text-right">Exit Price</TableHead>
                        <TableHead className="text-[11px] text-right">Shares</TableHead>
                        <TableHead className="text-[11px] text-right">P&L</TableHead>
                        <TableHead className="text-[11px] text-right">Hold Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.trades.map((trade, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{trade.entryDate}</TableCell>
                          <TableCell className="text-xs font-mono text-right">${trade.entryPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs font-mono">{trade.exitDate}</TableCell>
                          <TableCell className="text-xs font-mono text-right">${trade.exitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{trade.shares}</TableCell>
                          <TableCell className={`text-xs font-mono text-right ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-right">{trade.holdDays}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
