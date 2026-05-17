/**
 * MERIDIAN Finance Engine - Quantitative Finance Library
 * Portfolio Optimization, Risk Metrics, Factor Models, Options Pricing
 */

import * as ss from 'simple-statistics';

// ============================================================
// Types & Interfaces
// ============================================================

export interface PortfolioOptimizationResult {
  weights: Record<string, number>;
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  efficientFrontier: { risk: number; return_: number; sharpe: number }[];
}

export interface VaRResult {
  parametric: number;
  historical: number;
  monteCarlo: number;
  confidence: number;
  timeHorizon: number;
}

export interface RiskMetrics {
  var95: VaRResult;
  var99: VaRResult;
  cvar95: number;
  cvar99: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  annualizedReturn: number;
  annualizedVolatility: number;
}

export interface FamaFrenchResult {
  alpha: number;
  beta: number;
  smb: number;
  hml: number;
  rmw?: number;
  cma?: number;
  rSquared: number;
  residuals: number[];
}

export interface CAPMResult {
  alpha: number;
  beta: number;
  expectedReturn: number;
  rSquared: number;
  residuals: number[];
}

export interface BlackScholesResult {
  callPrice: number;
  putPrice: number;
  d1: number;
  d2: number;
}

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][];
}

export interface DrawdownResult {
  drawdowns: number[];
  maxDrawdown: number;
  maxDrawdownStart: number;
  maxDrawdownEnd: number;
  duration: number;
}

// ============================================================
// Helper Functions
// ============================================================

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.045; // ~4.5% annual risk-free rate

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function boxMullerRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ============================================================
// Portfolio Optimization (Markowitz Mean-Variance)
// ============================================================

export function optimizePortfolio(
  returns: Record<string, number[]>,
  targetReturn?: number
): PortfolioOptimizationResult {
  const tickers = Object.keys(returns);
  const n = tickers.length;

  if (n === 0) {
    return {
      weights: {},
      expectedReturn: 0,
      expectedVolatility: 0,
      sharpeRatio: 0,
      efficientFrontier: [],
    };
  }

  // Calculate expected returns and covariance
  const meanReturns = tickers.map(t => ss.mean(returns[t]) * TRADING_DAYS_PER_YEAR);
  const dailyReturns = tickers.map(t => returns[t]);

  // Covariance matrix
  const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return ss.variance(dailyReturns[i]) * TRADING_DAYS_PER_YEAR;
      return ss.sampleCovariance(dailyReturns[i], dailyReturns[j]) * TRADING_DAYS_PER_YEAR;
    })
  );

  // Generate efficient frontier using random portfolios
  const efficientFrontier: { risk: number; return_: number; sharpe: number }[] = [];
  const numPortfolios = 5000;
  let bestSharpe = -Infinity;
  let bestWeights: number[] = new Array(n).fill(1 / n);

  for (let p = 0; p < numPortfolios; p++) {
    // Generate random weights
    let weights: number[] = Array.from({ length: n }, () => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);

    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * meanReturns[i], 0);
    let portfolioVariance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portfolioVariance += weights[i] * weights[j] * covMatrix[i][j];
      }
    }
    const portfolioRisk = Math.sqrt(Math.max(0, portfolioVariance));
    const sharpe = (portfolioReturn - RISK_FREE_RATE) / (portfolioRisk || 1);

    efficientFrontier.push({ risk: portfolioRisk, return_: portfolioReturn, sharpe });

    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = [...weights];
    }
  }

  // Sort and deduplicate frontier
  efficientFrontier.sort((a, b) => a.risk - b.risk);

  // Build result
  const weightsMap: Record<string, number> = {};
  tickers.forEach((t, i) => {
    weightsMap[t] = bestWeights[i];
  });

  const optimalReturn = bestWeights.reduce((sum, w, i) => sum + w * meanReturns[i], 0);
  let optimalVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      optimalVariance += bestWeights[i] * bestWeights[j] * covMatrix[i][j];
    }
  }
  const optimalRisk = Math.sqrt(Math.max(0, optimalVariance));

  return {
    weights: weightsMap,
    expectedReturn: optimalReturn,
    expectedVolatility: optimalRisk,
    sharpeRatio: (optimalReturn - RISK_FREE_RATE) / (optimalRisk || 1),
    efficientFrontier,
  };
}

// ============================================================
// Risk Metrics
// ============================================================

export function calculateVaR(
  returns: number[],
  confidence: number = 0.95,
  timeHorizon: number = 1,
  portfolioValue: number = 100000
): VaRResult {
  const n = returns.length;
  const mean = ss.mean(returns);
  const std = ss.standardDeviation(returns);

  // Parametric VaR (assuming normal distribution)
  const zScore = confidence === 0.95 ? 1.645 : confidence === 0.99 ? 2.326 : 1.645;
  const parametricVaR = portfolioValue * (mean * timeHorizon - zScore * std * Math.sqrt(timeHorizon));

  // Historical VaR
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * n);
  const historicalVaR = portfolioValue * sortedReturns[index] * timeHorizon;

  // Monte Carlo VaR
  const numSimulations = 10000;
  const simulatedReturns: number[] = [];
  for (let i = 0; i < numSimulations; i++) {
    simulatedReturns.push(mean + std * boxMullerRandom());
  }
  simulatedReturns.sort((a, b) => a - b);
  const mcIndex = Math.floor((1 - confidence) * numSimulations);
  const monteCarloVaR = portfolioValue * simulatedReturns[mcIndex] * timeHorizon;

  return {
    parametric: Math.abs(parametricVaR),
    historical: Math.abs(historicalVaR),
    monteCarlo: Math.abs(monteCarloVaR),
    confidence,
    timeHorizon,
  };
}

export function calculateCVaR(
  returns: number[],
  confidence: number = 0.95,
  portfolioValue: number = 100000
): number {
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const n = sortedReturns.length;
  const cutoff = Math.floor((1 - confidence) * n);
  const tailReturns = sortedReturns.slice(0, cutoff + 1);
  return Math.abs(portfolioValue * ss.mean(tailReturns));
}

export function calculateMaxDrawdown(values: number[]): DrawdownResult {
  let peak = values[0];
  let maxDD = 0;
  let maxDDStart = 0;
  let maxDDEnd = 0;
  let peakIndex = 0;
  const drawdowns: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakIndex = i;
    }
    const dd = (peak - values[i]) / peak;
    drawdowns.push(dd);

    if (dd > maxDD) {
      maxDD = dd;
      maxDDStart = peakIndex;
      maxDDEnd = i;
    }
  }

  return {
    drawdowns,
    maxDrawdown: maxDD,
    maxDrawdownStart: maxDDStart,
    maxDrawdownEnd: maxDDEnd,
    duration: maxDDEnd - maxDDStart,
  };
}

export function calculateRiskMetrics(
  returns: number[],
  portfolioValue: number = 100000
): RiskMetrics {
  const annualReturn = ss.mean(returns) * TRADING_DAYS_PER_YEAR;
  const annualVol = ss.standardDeviation(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVol = negativeReturns.length > 0
    ? ss.standardDeviation(negativeReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR)
    : annualVol;

  const sharpeRatio = (annualReturn - RISK_FREE_RATE) / (annualVol || 1);
  const sortinoRatio = (annualReturn - RISK_FREE_RATE) / (downsideVol || 1);

  const ddResult = calculateMaxDrawdown(
    returns.reduce((acc: number[], r) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : portfolioValue;
      acc.push(last * (1 + r));
      return acc;
    }, [])
  );

  const calmarRatio = ddResult.maxDrawdown > 0
    ? annualReturn / ddResult.maxDrawdown
    : 0;

  return {
    var95: calculateVaR(returns, 0.95, 1, portfolioValue),
    var99: calculateVaR(returns, 0.99, 1, portfolioValue),
    cvar95: calculateCVaR(returns, 0.95, portfolioValue),
    cvar99: calculateCVaR(returns, 0.99, portfolioValue),
    maxDrawdown: ddResult.maxDrawdown,
    maxDrawdownDuration: ddResult.duration,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    annualizedReturn: annualReturn,
    annualizedVolatility: annualVol,
  };
}

// ============================================================
// Fama-French Factor Model
// ============================================================

export function famaFrench3Factor(
  stockReturns: number[],
  marketReturns: number[],
  smbReturns: number[],
  hmlReturns: number[]
): FamaFrenchResult {
  const n = Math.min(stockReturns.length, marketReturns.length, smbReturns.length, hmlReturns.length);
  const y = stockReturns.slice(0, n);
  const X = marketReturns.slice(0, n).map((m, i) => [m, smbReturns[i], hmlReturns[i]]);

  // OLS regression
  const XAug = X.map(row => [1, ...row]);
  const Xt = XAug[0].map((_, j) => XAug.map(row => row[j]));
  const XtX = Xt.map(row => row.map((_, j) => row.reduce((sum, ri, k) => sum + ri * XAug[k][j], 0)));

  // Simple solve using normal equations
  const yMean = ss.mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);

  // Compute coefficients via simple regression approach
  const mktMean = ss.mean(marketReturns.slice(0, n));
  const smbMean = ss.mean(smbReturns.slice(0, n));
  const hmlMean = ss.mean(hmlReturns.slice(0, n));

  // Compute betas using covariance
  const beta = ss.sampleCovariance(y, marketReturns.slice(0, n)) / ss.variance(marketReturns.slice(0, n));
  const smbCov = ss.sampleCovariance(y, smbReturns.slice(0, n));
  const hmlCov = ss.sampleCovariance(y, hmlReturns.slice(0, n));
  const smbBeta = smbCov / ss.variance(smbReturns.slice(0, n));
  const hmlBeta = hmlCov / ss.variance(hmlReturns.slice(0, n));
  const alpha = yMean - beta * mktMean - smbBeta * smbMean - hmlBeta * hmlMean;

  // Predictions & residuals
  const predictions = X.map(row => alpha + row[0] * beta + row[1] * smbBeta + row[2] * hmlBeta);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return {
    alpha,
    beta,
    smb: smbBeta,
    hml: hmlBeta,
    rSquared,
    residuals,
  };
}

export function famaFrench5Factor(
  stockReturns: number[],
  marketReturns: number[],
  smbReturns: number[],
  hmlReturns: number[],
  rmwReturns: number[],
  cmaReturns: number[]
): FamaFrenchResult {
  const result3 = famaFrench3Factor(stockReturns, marketReturns, smbReturns, hmlReturns);
  const n = Math.min(stockReturns.length, rmwReturns.length, cmaReturns.length);

  const rmwCov = ss.sampleCovariance(
    stockReturns.slice(0, n),
    rmwReturns.slice(0, n)
  );
  const cmaCov = ss.sampleCovariance(
    stockReturns.slice(0, n),
    cmaReturns.slice(0, n)
  );
  const rmwBeta = rmwCov / ss.variance(rmwReturns.slice(0, n));
  const cmaBeta = cmaCov / ss.variance(cmaReturns.slice(0, n));

  return {
    ...result3,
    rmw: rmwBeta,
    cma: cmaBeta,
  };
}

// ============================================================
// CAPM
// ============================================================

export function capm(
  stockReturns: number[],
  marketReturns: number[]
): CAPMResult {
  const n = Math.min(stockReturns.length, marketReturns.length);
  const y = stockReturns.slice(0, n);
  const x = marketReturns.slice(0, n);

  const reg = ss.linearRegression({ x, y });
  const beta = reg.m;
  const alpha = reg.b;

  const expectedReturn = RISK_FREE_RATE + beta * (ss.mean(x) * TRADING_DAYS_PER_YEAR - RISK_FREE_RATE);

  const predictions = x.map(xi => alpha + beta * xi);
  const residuals = y.map((yi, i) => yi - predictions[i]);

  const yMean = ss.mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return {
    alpha,
    beta,
    expectedReturn,
    rSquared,
    residuals,
  };
}

// ============================================================
// Black-Scholes Option Pricing
// ============================================================

export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): BlackScholesResult {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const callPrice = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  const putPrice = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);

  return {
    callPrice: Math.max(0, callPrice),
    putPrice: Math.max(0, putPrice),
    d1,
    d2,
  };
}

// ============================================================
// Greeks
// ============================================================

export function calculateGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): GreeksResult {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const delta = normalCDF(d1);
  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
  const theta = -(S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T))
    - r * K * Math.exp(-r * T) * normalCDF(d2);
  const vega = S * Math.sqrt(T) * normalPDF(d1) / 100; // per 1% change
  const rho = K * T * Math.exp(-r * T) * normalCDF(d2) / 100; // per 1% change

  return { delta, gamma, theta, vega, rho };
}

// ============================================================
// Correlation Matrix
// ============================================================

export function correlationMatrix(
  returns: Record<string, number[]>
): CorrelationMatrix {
  const tickers = Object.keys(returns);
  const n = tickers.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const minLen = Math.min(returns[tickers[i]].length, returns[tickers[j]].length);
      const r1 = returns[tickers[i]].slice(0, minLen);
      const r2 = returns[tickers[j]].slice(0, minLen);
      const corr = ss.sampleCorrelation(r1, r2);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return { tickers, matrix };
}

// ============================================================
// Beta Calculation
// ============================================================

export function calculateBeta(
  stockReturns: number[],
  marketReturns: number[]
): number {
  const n = Math.min(stockReturns.length, marketReturns.length);
  const cov = ss.sampleCovariance(stockReturns.slice(0, n), marketReturns.slice(0, n));
  const var_ = ss.variance(marketReturns.slice(0, n));
  return cov / var_;
}
