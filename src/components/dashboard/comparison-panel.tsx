'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ArrowLeftRight } from 'lucide-react';
import { getStockQuote, getHistoricalData, getReturnsFromOHLCV, getAvailableTickers } from '@/lib/market-data';
import { correlationMatrix, calculateBeta, capm } from '@/lib/finance-engine';

const COMPARE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function getComparisonData(ticker1: string, ticker2: string) {
  const data1 = getHistoricalData(ticker1, '1Y').data;
  const data2 = getHistoricalData(ticker2, '1Y').data;
  const minLen = Math.min(data1.length, data2.length, 252);
  const d1 = data1.slice(-minLen);
  const d2 = data2.slice(-minLen);

  return d1.map((d, i) => ({
    date: d.date,
    [ticker1]: ((d.close - d1[0].close) / d1[0].close) * 100,
    [ticker2]: ((d2[i].close - d2[0].close) / d2[0].close) * 100,
  }));
}

function getCorrelation(ticker1: string, ticker2: string): number {
  const r1 = getReturnsFromOHLCV(getHistoricalData(ticker1, '1Y').data);
  const r2 = getReturnsFromOHLCV(getHistoricalData(ticker2, '1Y').data);
  const minLen = Math.min(r1.length, r2.length);
  const cm = correlationMatrix({
    [ticker1]: r1.slice(0, minLen),
    [ticker2]: r2.slice(0, minLen),
  });
  return cm.matrix[0]?.[1] ?? 0;
}

function getBetaValue(ticker1: string, ticker2: string): number {
  const r1 = getReturnsFromOHLCV(getHistoricalData(ticker1, '1Y').data);
  const r2 = getReturnsFromOHLCV(getHistoricalData(ticker2, '1Y').data);
  return calculateBeta(r1, r2);
}

function getCAPMResult(ticker1: string, ticker2: string) {
  const r1 = getReturnsFromOHLCV(getHistoricalData(ticker1, '1Y').data);
  const r2 = getReturnsFromOHLCV(getHistoricalData(ticker2, '1Y').data);
  const minLen = Math.min(r1.length, r2.length);
  return capm(r1.slice(0, minLen), r2.slice(0, minLen));
}

export function ComparisonPanel() {
  const [ticker1, setTicker1] = useState('AAPL');
  const [ticker2, setTicker2] = useState('NVDA');

  const availableTickers = getAvailableTickers();
  const quote1 = getStockQuote(ticker1);
  const quote2 = getStockQuote(ticker2);
  const comparisonData = getComparisonData(ticker1, ticker2);
  const correlation = getCorrelation(ticker1, ticker2);
  const beta = getBetaValue(ticker1, ticker2);
  const capmResult = getCAPMResult(ticker1, ticker2);

  const metrics = [
    { metric: 'Price', val1: `$${quote1.price.toFixed(2)}`, val2: `$${quote2.price.toFixed(2)}` },
    { metric: 'Change %', val1: `${quote1.changePercent >= 0 ? '+' : ''}${quote1.changePercent.toFixed(2)}%`, val2: `${quote2.changePercent >= 0 ? '+' : ''}${quote2.changePercent.toFixed(2)}%` },
    { metric: 'Market Cap', val1: `$${(quote1.marketCap / 1e9).toFixed(1)}B`, val2: `$${(quote2.marketCap / 1e9).toFixed(1)}B` },
    { metric: 'P/E Ratio', val1: quote1.pe.toFixed(1), val2: quote2.pe.toFixed(1) },
    { metric: 'Volume', val1: `${(quote1.volume / 1e6).toFixed(1)}M`, val2: `${(quote2.volume / 1e6).toFixed(1)}M` },
    { metric: 'Sector', val1: quote1.sector, val2: quote2.sector },
    { metric: 'Beta', val1: beta.toFixed(3), val2: '1.000' },
    { metric: 'Correlation', val1: correlation.toFixed(3), val2: correlation.toFixed(3) },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Stock Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Stock A</Label>
              <Select value={ticker1} onValueChange={setTicker1}>
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
              <Label className="text-xs">Stock B</Label>
              <Select value={ticker2} onValueChange={setTicker2}>
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
          </div>
        </CardContent>
      </Card>

      {/* Performance Overlay */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Normalized Performance (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5, 10)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={ticker1}
                  stroke={COMPARE_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={ticker2}
                  stroke={COMPARE_COLORS[1]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Correlation & CAPM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Correlation
            </span>
            <p className="text-2xl font-bold font-mono mt-1">
              {correlation.toFixed(3)}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] mt-1 ${
                Math.abs(correlation) > 0.5
                  ? 'border-amber-500/30 text-amber-500'
                  : 'border-emerald-500/30 text-emerald-500'
              }`}
            >
              {Math.abs(correlation) > 0.7 ? 'High' : Math.abs(correlation) > 0.4 ? 'Moderate' : 'Low'}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Beta ({ticker1} vs {ticker2})
            </span>
            <p className="text-2xl font-bold font-mono mt-1">
              {beta.toFixed(3)}
            </p>
            <Badge variant="outline" className="text-[10px] mt-1 border-muted-foreground/30">
              {beta > 1.2 ? 'High Vol' : beta < 0.8 ? 'Low Vol' : 'Market-like'}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              CAPM Alpha
            </span>
            <p className="text-2xl font-bold font-mono mt-1">
              {(capmResult.alpha * 100).toFixed(3)}%
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] mt-1 ${
                capmResult.alpha > 0 ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500'
              }`}
            >
              {capmResult.alpha > 0 ? 'Outperforming' : 'Underperforming'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Comparison Table */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Key Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-muted-foreground font-medium">Metric</th>
                  <th className="p-2 text-right font-mono font-medium" style={{ color: COMPARE_COLORS[0] }}>
                    {ticker1}
                  </th>
                  <th className="p-2 text-right font-mono font-medium" style={{ color: COMPARE_COLORS[1] }}>
                    {ticker2}
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((row) => (
                  <tr key={row.metric} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground">{row.metric}</td>
                    <td className="p-2 text-right font-mono">{row.val1}</td>
                    <td className="p-2 text-right font-mono">{row.val2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
