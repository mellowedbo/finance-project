'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { FlaskConical, Play } from 'lucide-react';
import {
  olsRegression,
  ridgeRegression,
  lassoRegression,
  polynomialRegression,
  kMeansClustering,
  pca,
  timeSeriesForecast,
  type RegressionResult,
  type RidgeResult,
  type LassoResult,
  type PolynomialResult,
  type KMeansResult,
  type PCAResult,
  type TimeSeriesForecastResult,
} from '@/lib/ml-engine';
import { getHistoricalData, getReturnsFromOHLCV, getAvailableTickers } from '@/lib/market-data';

type AnalysisType = 'regression' | 'pca' | 'clustering' | 'forecast';

const CLUSTER_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#3B82F6'];

export function MLLab() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('regression');
  const [ticker, setTicker] = useState('AAPL');
  const [alpha, setAlpha] = useState([1.0]);
  const [degree, setDegree] = useState([2]);
  const [k, setK] = useState([3]);
  const [forecastHorizon, setForecastHorizon] = useState([10]);
  const [result, setResult] = useState<unknown>(null);
  const [running, setRunning] = useState(false);

  const runAnalysis = useCallback(() => {
    setRunning(true);

    try {
      const data = getHistoricalData(ticker, '1Y');
      const ohlcv = data.data;
      const returns = getReturnsFromOHLCV(ohlcv);

      // Create feature matrix from returns
      const X: number[][] = [];
      const y: number[] = [];

      for (let i = 5; i < returns.length; i++) {
        X.push([returns[i - 1], returns[i - 2], returns[i - 3], returns[i - 4], returns[i - 5]]);
        y.push(returns[i]);
      }

      switch (analysisType) {
        case 'regression': {
          const olsResult = olsRegression(X, y);
          const ridgeResult = ridgeRegression(X, y, alpha[0]);
          const lassoResult = lassoRegression(X, y, alpha[0]);
          setResult({ type: 'regression', ols: olsResult, ridge: ridgeResult, lasso: lassoResult });
          break;
        }
        case 'pca': {
          const pcaResult = pca(X, 5);
          setResult({ type: 'pca', pca: pcaResult });
          break;
        }
        case 'clustering': {
          const clusterResult = kMeansClustering(X, k[0]);
          setResult({ type: 'clustering', clustering: clusterResult });
          break;
        }
        case 'forecast': {
          const prices = ohlcv.map(d => d.close);
          const forecastResult = timeSeriesForecast(prices, forecastHorizon[0], 'es');
          setResult({ type: 'forecast', forecast: forecastResult, historicalPrices: prices.slice(-60) });
          break;
        }
      }
    } catch (error) {
      console.error('ML analysis failed:', error);
    } finally {
      setRunning(false);
    }
  }, [analysisType, ticker, alpha, degree, k, forecastHorizon]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            ML Analysis Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Analysis Type</Label>
              <Select value={analysisType} onValueChange={(v) => { setAnalysisType(v as AnalysisType); setResult(null); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regression">Regression</SelectItem>
                  <SelectItem value="pca">PCA</SelectItem>
                  <SelectItem value="clustering">K-Means Clustering</SelectItem>
                  <SelectItem value="forecast">Time Series Forecast</SelectItem>
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
                  {getAvailableTickers().map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(analysisType === 'regression') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Regularization (α): {alpha[0].toFixed(2)}</Label>
                <Slider
                  value={alpha}
                  onValueChange={setAlpha}
                  min={0.01}
                  max={10}
                  step={0.01}
                  className="mt-2"
                />
              </div>
            )}

            {analysisType === 'clustering' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Clusters (k): {k[0]}</Label>
                <Slider
                  value={k}
                  onValueChange={setK}
                  min={2}
                  max={8}
                  step={1}
                  className="mt-2"
                />
              </div>
            )}

            {analysisType === 'forecast' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Forecast Horizon: {forecastHorizon[0]} days</Label>
                <Slider
                  value={forecastHorizon}
                  onValueChange={setForecastHorizon}
                  min={5}
                  max={60}
                  step={5}
                  className="mt-2"
                />
              </div>
            )}

            <div className="flex items-end">
              <Button
                onClick={runAnalysis}
                disabled={running}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Play className="h-4 w-4 mr-1.5" />
                {running ? 'Running...' : 'Run Analysis'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(result as { type: string }).type === 'regression' && (
            <RegressionResults result={result as { type: 'regression'; ols: RegressionResult; ridge: RidgeResult; lasso: LassoResult }} />
          )}
          {(result as { type: string }).type === 'pca' && (
            <PCAResults result={result as { type: 'pca'; pca: PCAResult }} />
          )}
          {(result as { type: string }).type === 'clustering' && (
            <ClusteringResults result={result as { type: 'clustering'; clustering: KMeansResult }} />
          )}
          {(result as { type: string }).type === 'forecast' && (
            <ForecastResults result={result as { type: 'forecast'; forecast: TimeSeriesForecastResult; historicalPrices: number[] }} />
          )}
        </div>
      )}
    </div>
  );
}

function RegressionResults({ result }: { result: { type: 'regression'; ols: RegressionResult; ridge: RidgeResult; lasso: LassoResult } }) {
  const { ols, ridge, lasso } = result;

  const compData = [
    { name: 'OLS', r2: ols.rSquared, adjR2: ols.adjustedRSquared },
    { name: 'Ridge', r2: ridge.rSquared, adjR2: ridge.rSquared },
    { name: 'LASSO', r2: lasso.rSquared, adjR2: lasso.rSquared },
  ];

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                <Bar dataKey="r2" fill="#10B981" name="R²" radius={[4, 4, 0, 0]} />
                <Bar dataKey="adjR2" fill="#F59E0B" name="Adj R²" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Statistical Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">OLS Coefficients</h4>
            {ols.coefficients.map((coef, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="font-mono">X{i + 1}</span>
                <span className="font-mono">{coef.toFixed(6)}</span>
                <Badge variant="outline" className={`text-[10px] ${ols.pValues[i] < 0.05 ? 'border-emerald-500/30 text-emerald-500' : 'border-muted'}`}>
                  p={ols.pValues[i].toFixed(4)}
                </Badge>
              </div>
            ))}
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono">Intercept</span>
              <span className="font-mono">{ols.intercept.toFixed(6)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">F-Statistic</span>
              <p className="font-mono font-semibold">{ols.fStatistic.toFixed(4)}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">R²</span>
              <p className="font-mono font-semibold">{(ols.rSquared * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">Ridge R² (α={ridge.alpha})</span>
              <p className="font-mono font-semibold">{(ridge.rSquared * 100).toFixed(2)}%</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">LASSO R² (α={lasso.alpha})</span>
              <p className="font-mono font-semibold">{(lasso.rSquared * 100).toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function PCAResults({ result }: { result: { type: 'pca'; pca: PCAResult } }) {
  const { pca: pcaResult } = result;

  const varianceData = pcaResult.explainedVariance.map((ev, i) => ({
    component: `PC${i + 1}`,
    variance: ev * 100,
    cumulative: pcaResult.cumulativeVariance[i] * 100,
  }));

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Explained Variance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={varianceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="component" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Bar dataKey="variance" fill="#10B981" name="Explained" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">PCA Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pcaResult.eigenvalues.map((ev, i) => (
            <div key={i} className="flex justify-between items-center text-xs p-2 rounded-md bg-muted/50">
              <span className="font-mono font-medium">PC{i + 1}</span>
              <span className="font-mono">Eigenvalue: {ev.toFixed(4)}</span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                {(pcaResult.explainedVariance[i] * 100).toFixed(1)}%
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function ClusteringResults({ result }: { result: { type: 'clustering'; clustering: KMeansResult } }) {
  const { clustering } = result;

  // Prepare scatter data from projected 2D
  const scatterData = clustering.assignments.map((cluster, i) => ({
    cluster,
    index: i,
  }));

  const clusterStats = Array.from({ length: clustering.k }, (_, c) => ({
    cluster: c,
    count: clustering.assignments.filter(a => a === c).length,
    ss: clustering.withinClusterSS[c],
  }));

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cluster Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="cluster" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `C${v}`} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {clusterStats.map((_, i) => (
                    <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Clustering Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">K (Clusters)</span>
              <p className="font-mono font-semibold">{clustering.k}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">Iterations</span>
              <p className="font-mono font-semibold">{clustering.iterations}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50 col-span-2">
              <span className="text-muted-foreground">Total Within-Cluster SS</span>
              <p className="font-mono font-semibold">{clustering.totalWithinClusterSS.toFixed(4)}</p>
            </div>
          </div>

          {clusterStats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
              />
              <span className="font-medium">Cluster {stat.cluster}</span>
              <span className="text-muted-foreground ml-auto">
                {stat.count} points | SS: {stat.ss.toFixed(2)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function ForecastResults({ result }: { result: { type: 'forecast'; forecast: TimeSeriesForecastResult; historicalPrices: number[] } }) {
  const { forecast, historicalPrices } = result;

  const chartData = [
    ...historicalPrices.map((p, i) => ({
      index: i,
      actual: p,
      forecast: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
    })),
    ...forecast.forecast.map((f, i) => ({
      index: historicalPrices.length + i,
      actual: null as number | null,
      forecast: f,
      upper: forecast.upperBound[i],
      lower: forecast.lowerBound[i],
    })),
  ];

  return (
    <>
      <Card className="lg:col-span-2 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Forecast — {forecast.method}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Actual"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Forecast"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#F59E0B"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                  name="Upper Bound"
                  connectNulls={false}
                  opacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#F59E0B"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                  name="Lower Bound"
                  connectNulls={false}
                  opacity={0.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Forecast Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-md bg-muted/50">
              <span className="text-muted-foreground uppercase text-[10px]">MAE</span>
              <p className="font-mono font-semibold text-sm mt-0.5">{forecast.accuracy.mae.toFixed(4)}</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <span className="text-muted-foreground uppercase text-[10px]">RMSE</span>
              <p className="font-mono font-semibold text-sm mt-0.5">{forecast.accuracy.rmse.toFixed(4)}</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <span className="text-muted-foreground uppercase text-[10px]">MAPE</span>
              <p className="font-mono font-semibold text-sm mt-0.5">{forecast.accuracy.mape.toFixed(2)}%</p>
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <span className="text-muted-foreground uppercase text-[10px]">Horizon</span>
              <p className="font-mono font-semibold text-sm mt-0.5">{forecast.forecast.length} days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
