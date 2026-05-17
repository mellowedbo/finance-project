'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Shield, Play } from 'lucide-react';
import {
  calculateRiskMetrics,
  calculateVaR,
  correlationMatrix,
  type RiskMetrics,
  type CorrelationMatrix,
} from '@/lib/finance-engine';
import { getHistoricalData, getReturnsFromOHLCV, getAvailableTickers } from '@/lib/market-data';
import { Skeleton } from '@/components/ui/skeleton';

export function RiskAnalytics() {
  const [tickers, setTickers] = useState<string[]>(['AAPL', 'NVDA', 'MSFT']);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [corrMatrix, setCorrMatrix] = useState<CorrelationMatrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [primaryTicker, setPrimaryTicker] = useState('AAPL');

  const runAnalysis = useCallback(() => {
    setLoading(true);

    try {
      // Get returns for primary ticker
      const data = getHistoricalData(primaryTicker, '1Y');
      const returns = getReturnsFromOHLCV(data.data);
      const metrics = calculateRiskMetrics(returns);
      setRiskMetrics(metrics);

      // Correlation matrix
      const returnsMap: Record<string, number[]> = {};
      for (const ticker of tickers) {
        const tData = getHistoricalData(ticker, '1Y');
        returnsMap[ticker] = getReturnsFromOHLCV(tData.data);
      }
      const corr = correlationMatrix(returnsMap);
      setCorrMatrix(corr);
    } catch (error) {
      console.error('Risk analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, [primaryTicker, tickers]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Drawdown chart data
  const drawdownData = useMemo(() => {
    const data = getHistoricalData(primaryTicker, '1Y');
    const prices = data.data.map(d => d.close);
    let peak = prices[0];
    return prices.map((p, i) => {
      if (p > peak) peak = p;
      return { day: i, drawdown: ((peak - p) / peak) * 100 };
    });
  }, [primaryTicker]);

  const availableTickers = getAvailableTickers();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Primary Ticker</Label>
              <Select value={primaryTicker} onValueChange={setPrimaryTicker}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTickers.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runAnalysis}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Play className="h-4 w-4 mr-1.5" />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : riskMetrics ? (
        <>
          {/* Key Risk Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Sharpe Ratio
                </span>
                <p className="text-xl font-bold font-mono mt-1">
                  {riskMetrics.sharpeRatio.toFixed(2)}
                </p>
                <Badge variant="outline" className={`text-[10px] mt-1 ${riskMetrics.sharpeRatio > 1 ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}`}>
                  {riskMetrics.sharpeRatio > 1 ? 'Good' : riskMetrics.sharpeRatio > 0.5 ? 'Moderate' : 'Poor'}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Sortino Ratio
                </span>
                <p className="text-xl font-bold font-mono mt-1">
                  {riskMetrics.sortinoRatio.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Max Drawdown
                </span>
                <p className="text-xl font-bold font-mono mt-1 text-red-500">
                  {(riskMetrics.maxDrawdown * 100).toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Annualized Vol
                </span>
                <p className="text-xl font-bold font-mono mt-1">
                  {(riskMetrics.annualizedVolatility * 100).toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* VaR Display */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Value at Risk (VaR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-md bg-muted/50 text-center">
                      <span className="text-muted-foreground text-[10px]">Parametric</span>
                      <p className="font-mono font-semibold mt-1">${riskMetrics.var95.parametric.toFixed(0)}</p>
                      <span className="text-[10px] text-muted-foreground">95% VaR</span>
                    </div>
                    <div className="p-2.5 rounded-md bg-muted/50 text-center">
                      <span className="text-muted-foreground text-[10px]">Historical</span>
                      <p className="font-mono font-semibold mt-1">${riskMetrics.var95.historical.toFixed(0)}</p>
                      <span className="text-[10px] text-muted-foreground">95% VaR</span>
                    </div>
                    <div className="p-2.5 rounded-md bg-muted/50 text-center">
                      <span className="text-muted-foreground text-[10px]">Monte Carlo</span>
                      <p className="font-mono font-semibold mt-1">${riskMetrics.var95.monteCarlo.toFixed(0)}</p>
                      <span className="text-[10px] text-muted-foreground">95% VaR</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-md bg-red-500/5 border border-red-500/10 text-center">
                      <span className="text-red-400 text-[10px]">CVaR (95%)</span>
                      <p className="font-mono font-semibold mt-1 text-red-500">${riskMetrics.cvar95.toFixed(0)}</p>
                    </div>
                    <div className="p-2.5 rounded-md bg-red-500/5 border border-red-500/10 text-center">
                      <span className="text-red-400 text-[10px]">CVaR (99%)</span>
                      <p className="font-mono font-semibold mt-1 text-red-500">${riskMetrics.cvar99.toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-md bg-muted/50 text-center">
                      <span className="text-muted-foreground text-[10px]">Annualized Return</span>
                      <p className="font-mono font-semibold mt-1">{(riskMetrics.annualizedReturn * 100).toFixed(2)}%</p>
                    </div>
                    <div className="p-2.5 rounded-md bg-muted/50 text-center">
                      <span className="text-muted-foreground text-[10px]">Calmar Ratio</span>
                      <p className="font-mono font-semibold mt-1">{riskMetrics.calmarRatio.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Drawdown Chart */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Drawdown Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownData}>
                      <defs>
                        <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="drawdown"
                        stroke="#EF4444"
                        strokeWidth={1.5}
                        fill="url(#ddGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Correlation Heatmap */}
          {corrMatrix && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Correlation Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="p-2 text-left text-muted-foreground" />
                        {corrMatrix.tickers.map((t) => (
                          <th key={t} className="p-2 text-center font-mono font-medium">
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corrMatrix.tickers.map((rowTicker, i) => (
                        <tr key={rowTicker}>
                          <td className="p-2 font-mono font-medium">{rowTicker}</td>
                          {corrMatrix.matrix[i].map((val, j) => {
                            const absVal = Math.abs(val);
                            const color =
                              val > 0.5
                                ? `rgba(16, 185, 129, ${absVal * 0.5})`
                                : val < -0.5
                                ? `rgba(239, 68, 68, ${absVal * 0.5})`
                                : 'transparent';
                            return (
                              <td
                                key={j}
                                className="p-2 text-center font-mono"
                                style={{ backgroundColor: color }}
                              >
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
