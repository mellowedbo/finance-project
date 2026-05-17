/**
 * MERIDIAN Backtesting Engine
 * Event-driven backtesting with built-in strategies
 */

import { getHistoricalData, getReturnsFromOHLCV, type OHLCV } from './market-data';

// ============================================================
// Types
// ============================================================

export interface Strategy {
  name: string;
  description: string;
  parameters: Record<string, number>;
  signal: (data: OHLCV[], index: number, params: Record<string, number>) => Signal;
}

export type Signal = 'buy' | 'sell' | 'hold';

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  side: 'long';
  pnl: number;
  pnlPercent: number;
  holdDays: number;
}

export interface BacktestResult {
  strategy: string;
  ticker: string;
  startDate: string;
  endDate: string;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgHoldPeriod: number;
  profitFactor: number;
  equityCurve: { date: string; equity: number }[];
  trades: BacktestTrade[];
  metrics: {
    avgWin: number;
    avgLoss: number;
    largestWin: number;
    largestLoss: number;
    consecutiveWins: number;
    consecutiveLosses: number;
  };
}

// ============================================================
// Built-in Strategies
// ============================================================

export function smaCrossoverStrategy(
  data: OHLCV[],
  index: number,
  params: Record<string, number>
): Signal {
  const shortPeriod = Math.floor(params.shortPeriod ?? 10);
  const longPeriod = Math.floor(params.longPeriod ?? 30);

  if (index < longPeriod) return 'hold';

  const shortMA = data.slice(index - shortPeriod + 1, index + 1)
    .reduce((sum, d) => sum + d.close, 0) / shortPeriod;
  const longMA = data.slice(index - longPeriod + 1, index + 1)
    .reduce((sum, d) => sum + d.close, 0) / longPeriod;

  const prevShortMA = data.slice(index - shortPeriod, index)
    .reduce((sum, d) => sum + d.close, 0) / shortPeriod;
  const prevLongMA = data.slice(index - longPeriod, index)
    .reduce((sum, d) => sum + d.close, 0) / longPeriod;

  // Crossover: short MA crosses above long MA -> buy
  if (prevShortMA <= prevLongMA && shortMA > longMA) return 'buy';
  // Crossunder: short MA crosses below long MA -> sell
  if (prevShortMA >= prevLongMA && shortMA < longMA) return 'sell';

  return 'hold';
}

export function momentumStrategy(
  data: OHLCV[],
  index: number,
  params: Record<string, number>
): Signal {
  const lookback = Math.floor(params.lookback ?? 20);
  const threshold = params.threshold ?? 0.02;

  if (index < lookback) return 'hold';

  const currentPrice = data[index].close;
  const pastPrice = data[index - lookback].close;
  const momentum = (currentPrice - pastPrice) / pastPrice;

  if (momentum > threshold) return 'buy';
  if (momentum < -threshold) return 'sell';

  return 'hold';
}

export function meanReversionStrategy(
  data: OHLCV[],
  index: number,
  params: Record<string, number>
): Signal {
  const lookback = Math.floor(params.lookback ?? 20);
  const entryZScore = params.entryZScore ?? 2.0;
  const exitZScore = params.exitZScore ?? 0.5;

  if (index < lookback) return 'hold';

  const slice = data.slice(index - lookback + 1, index + 1).map(d => d.close);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
  const zScore = std > 0 ? (data[index].close - mean) / std : 0;

  if (zScore < -entryZScore) return 'buy';  // Oversold
  if (zScore > entryZScore) return 'sell';   // Overbought
  if (Math.abs(zScore) < exitZScore) return 'sell'; // Mean-reverted (exit)

  return 'hold';
}

export const BUILTIN_STRATEGIES: Strategy[] = [
  {
    name: 'SMA Crossover',
    description: 'Buys when short-term moving average crosses above long-term, sells on crossunder',
    parameters: { shortPeriod: 10, longPeriod: 30 },
    signal: smaCrossoverStrategy,
  },
  {
    name: 'Momentum',
    description: 'Buys when price momentum exceeds threshold, sells on negative momentum',
    parameters: { lookback: 20, threshold: 0.02 },
    signal: momentumStrategy,
  },
  {
    name: 'Mean Reversion',
    description: 'Buys oversold conditions, sells overbought conditions based on z-score',
    parameters: { lookback: 20, entryZScore: 2.0, exitZScore: 0.5 },
    signal: meanReversionStrategy,
  },
];

// ============================================================
// Backtest Runner
// ============================================================

export function runBacktest(
  ticker: string,
  strategyName: string,
  period: string = '1Y',
  startingCapital: number = 100000,
  customParams?: Record<string, number>
): BacktestResult {
  const data = getHistoricalData(ticker, period);
  const ohlcv = data.data;

  if (ohlcv.length < 30) {
    throw new Error('Insufficient historical data for backtesting');
  }

  // Find strategy
  const strategy = BUILTIN_STRATEGIES.find(s => s.name === strategyName);
  if (!strategy) {
    throw new Error(`Strategy "${strategyName}" not found`);
  }

  const params = { ...strategy.parameters, ...customParams };

  // Run event-driven backtest
  let cash = startingCapital;
  let shares = 0;
  let entryPrice = 0;
  let entryDate = '';
  let position = false;
  const equityCurve: { date: string; equity: number }[] = [];
  const trades: BacktestTrade[] = [];
  const commissions = 0.001;

  for (let i = 0; i < ohlcv.length; i++) {
    const bar = ohlcv[i];
    const signal = strategy.signal(ohlcv, i, params);

    if (signal === 'buy' && !position) {
      const maxShares = Math.floor(cash / (bar.close * (1 + commissions)));
      if (maxShares > 0) {
        shares = maxShares;
        entryPrice = bar.close;
        entryDate = bar.date;
        cash -= shares * entryPrice * (1 + commissions);
        position = true;
      }
    } else if (signal === 'sell' && position) {
      const pnl = (bar.close - entryPrice) * shares - shares * bar.close * commissions;
      const pnlPercent = ((bar.close - entryPrice) / entryPrice) * 100;

      trades.push({
        entryDate,
        entryPrice,
        exitDate: bar.date,
        exitPrice: bar.close,
        shares,
        side: 'long',
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        holdDays: Math.round((new Date(bar.date).getTime() - new Date(entryDate).getTime()) / 86400000),
      });

      cash += shares * bar.close * (1 - commissions);
      shares = 0;
      position = false;
    }

    const equity = cash + shares * bar.close;
    equityCurve.push({ date: bar.date, equity: Math.round(equity * 100) / 100 });
  }

  // Close any open position at last price
  if (position && ohlcv.length > 0) {
    const lastBar = ohlcv[ohlcv.length - 1];
    const pnl = (lastBar.close - entryPrice) * shares;
    trades.push({
      entryDate,
      entryPrice,
      exitDate: lastBar.date,
      exitPrice: lastBar.close,
      shares,
      side: 'long',
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(((lastBar.close - entryPrice) / entryPrice) * 10000) / 100,
      holdDays: Math.round((new Date(lastBar.date).getTime() - new Date(entryDate).getTime()) / 86400000),
    });
    cash += shares * lastBar.close;
  }

  // Calculate metrics
  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? startingCapital;
  const totalReturn = (finalEquity - startingCapital) / startingCapital;
  const tradingDays = ohlcv.length;
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / tradingDays) - 1;

  const returns = getReturnsFromOHLCV(ohlcv);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length);
  const sharpeRatio = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(252) : 0;

  // Max drawdown from equity curve
  let peak = startingCapital;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = (peak - point.equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Trade statistics
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxConsWins = 0;
  let maxConsLosses = 0;
  for (const t of trades) {
    if (t.pnl > 0) {
      consecutiveWins++;
      consecutiveLosses = 0;
      maxConsWins = Math.max(maxConsWins, consecutiveWins);
    } else {
      consecutiveLosses++;
      consecutiveWins = 0;
      maxConsLosses = Math.max(maxConsLosses, consecutiveLosses);
    }
  }

  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
  const avgHoldPeriod = trades.length > 0 ? trades.reduce((s, t) => s + t.holdDays, 0) / trades.length : 0;

  return {
    strategy: strategyName,
    ticker: ticker.toUpperCase(),
    startDate: ohlcv[0]?.date ?? '',
    endDate: ohlcv[ohlcv.length - 1]?.date ?? '',
    totalReturn: Math.round(totalReturn * 10000) / 10000,
    annualizedReturn: Math.round(annualizedReturn * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
    winRate: Math.round(winRate * 100) / 100,
    totalTrades: trades.length,
    avgHoldPeriod: Math.round(avgHoldPeriod),
    profitFactor: Math.round(profitFactor * 100) / 100,
    equityCurve,
    trades,
    metrics: {
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      consecutiveWins: maxConsWins,
      consecutiveLosses: maxConsLosses,
    },
  };
}
