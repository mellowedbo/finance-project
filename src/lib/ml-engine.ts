/**
 * MERIDIAN ML Engine - Native Machine Learning using simple-statistics
 * Implements OLS, Ridge, LASSO, Polynomial Regression, K-Means, PCA, Time Series Forecasting
 */

import * as ss from 'simple-statistics';

// ============================================================
// Types & Interfaces
// ============================================================

export interface RegressionResult {
  coefficients: number[];
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number;
  pValues: number[];
  stdErrors: number[];
  tStatistics: number[];
  predictions: number[];
  residuals: number[];
}

export interface RidgeResult {
  coefficients: number[];
  intercept: number;
  rSquared: number;
  predictions: number[];
  residuals: number[];
  alpha: number;
}

export interface LassoResult {
  coefficients: number[];
  intercept: number;
  rSquared: number;
  predictions: number[];
  residuals: number[];
  alpha: number;
  iterations: number;
}

export interface PolynomialResult {
  coefficients: number[];
  rSquared: number;
  adjustedRSquared: number;
  degree: number;
  predictions: number[];
  residuals: number[];
}

export interface KMeansResult {
  centroids: number[][];
  assignments: number[];
  iterations: number;
  withinClusterSS: number[];
  totalWithinClusterSS: number;
  k: number;
}

export interface PCAResult {
  components: number[][];
  eigenvalues: number[];
  explainedVariance: number[];
  cumulativeVariance: number[];
  loadings: number[][];
  projectedData: number[][];
}

export interface TimeSeriesForecastResult {
  forecast: number[];
  lowerBound: number[];
  upperBound: number[];
  method: string;
  parameters: Record<string, number>;
  accuracy: {
    mae: number;
    rmse: number;
    mape: number;
  };
}

export interface MovingAverageResult {
  values: number[];
  smoothed: number[];
  period: number;
}

export interface ExponentialSmoothingResult {
  values: number[];
  smoothed: number[];
  alpha: number;
  level: number[];
  trend: number[];
}

// ============================================================
// Helper Functions
// ============================================================

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function normalize(v: number[]): number[] {
  const mag = magnitude(v);
  if (mag === 0) return v.map(() => 0);
  return v.map(x => x / mag);
}

function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;
  const result: number[][] = [];
  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

// Simple matrix inversion using Gauss-Jordan elimination
function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const augmented: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    if (Math.abs(augmented[col][col]) < 1e-10) return null;

    const pivot = augmented[col][col];
    for (let j = 0; j < 2 * n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = augmented[row][col];
        for (let j = 0; j < 2 * n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
  }

  return augmented.map(row => row.slice(n));
}

// Approximate p-value from t-statistic using normal approximation
function tToPValue(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = x * (1 + x * (1 / 6 + x * (1 / 180 + x * 1 / 2520)));
  return Math.max(0, Math.min(1, p));
}

// ============================================================
// OLS Linear Regression
// ============================================================

export function olsRegression(
  X: number[][],
  y: number[]
): RegressionResult {
  const n = X.length;
  const k = X[0].length;

  // Add intercept column
  const XAug = X.map(row => [1, ...row]);
  const Xt = transpose(XAug);
  const XtX = matMul(Xt, XAug);
  const XtXinv = invert(XtX);

  if (!XtXinv) {
    throw new Error('Matrix is singular, cannot perform OLS regression');
  }

  const Xty = Xt.map(row => dot(row, y));
  const beta = matMul(XtXinv, Xty.map(v => [v])).map(v => v[0]);

  const intercept = beta[0];
  const coefficients = beta.slice(1);

  // Predictions
  const predictions = XAug.map(row => dot(row, beta));
  const residuals = y.map((yi, i) => yi - predictions[i]);

  // R-squared
  const yMean = ss.mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  // Adjusted R-squared
  const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - k - 1);

  // F-statistic
  const fStatistic = ((ssTotal - ssResidual) / k) / (ssResidual / (n - k - 1));

  // Standard errors
  const mse = ssResidual / (n - k - 1);
  const stdErrors = XtXinv.map((row, i) => Math.sqrt(Math.max(0, row[i] * mse)));

  // t-statistics and p-values
  const tStatistics = beta.map((b, i) => stdErrors[i] > 0 ? b / stdErrors[i] : 0);
  const pValues = tStatistics.map((t, i) => {
    const df = n - k - 1;
    return tToPValue(t, df);
  });

  // For coefficients, return p-values for non-intercept
  const coeffPValues = pValues.slice(1);
  const coeffStdErrors = stdErrors.slice(1);
  const coeffTStats = tStatistics.slice(1);

  return {
    coefficients,
    intercept,
    rSquared,
    adjustedRSquared,
    fStatistic,
    pValues: coeffPValues,
    stdErrors: coeffStdErrors,
    tStatistics: coeffTStats,
    predictions,
    residuals,
  };
}

// ============================================================
// Ridge Regression
// ============================================================

export function ridgeRegression(
  X: number[][],
  y: number[],
  alpha: number = 1.0
): RidgeResult {
  const n = X.length;
  const k = X[0].length;

  // Standardize features
  const means = Array.from({ length: k }, (_, j) => ss.mean(X.map(row => row[j])));
  const stds = Array.from({ length: k }, (_, j) => {
    const s = ss.standardDeviation(X.map(row => row[j]));
    return s > 0 ? s : 1;
  });

  const XStd = X.map(row => row.map((x, j) => (x - means[j]) / stds[j]));
  const yMean = ss.mean(y);

  const Xt = transpose(XStd);
  const XtX = matMul(Xt, XStd);

  // Add L2 penalty (alpha * I)
  const penalized = XtX.map((row, i) =>
    row.map((val, j) => (i === j ? val + alpha : val))
  );

  const penalizedInv = invert(penalized);
  if (!penalizedInv) {
    throw new Error('Cannot invert penalized matrix in Ridge regression');
  }

  const Xty = Xt.map(row => row.reduce((sum, xi, i) => sum + xi * (y[i] - yMean), 0));
  const betaStd = matMul(penalizedInv, Xty.map(v => [v])).map(v => v[0]);

  // Convert back to original scale
  const coefficients = betaStd.map((b, j) => b / stds[j]);
  const intercept = yMean - coefficients.reduce((sum, b, j) => sum + b * means[j], 0);

  // Predictions
  const predictions = X.map(row => intercept + dot(row, coefficients));
  const residuals = y.map((yi, i) => yi - predictions[i]);

  // R-squared
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return {
    coefficients,
    intercept,
    rSquared,
    predictions,
    residuals,
    alpha,
  };
}

// ============================================================
// LASSO Regression (Coordinate Descent)
// ============================================================

export function lassoRegression(
  X: number[][],
  y: number[],
  alpha: number = 0.1,
  maxIterations: number = 1000,
  tolerance: number = 1e-6
): LassoResult {
  const n = X.length;
  const k = X[0].length;

  // Standardize
  const means = Array.from({ length: k }, (_, j) => ss.mean(X.map(row => row[j])));
  const stds = Array.from({ length: k }, (_, j) => {
    const s = ss.standardDeviation(X.map(row => row[j]));
    return s > 0 ? s : 1;
  });

  const XStd = X.map(row => row.map((x, j) => (x - means[j]) / stds[j]));
  const yMean = ss.mean(y);
  const yCentered = y.map(yi => yi - yMean);

  // Initialize coefficients to zero
  let beta = new Array(k).fill(0);
  let iterations = 0;

  const softThreshold = (rho: number, lambda: number): number => {
    if (rho > lambda) return rho - lambda;
    if (rho < -lambda) return rho + lambda;
    return 0;
  };

  for (let iter = 0; iter < maxIterations; iter++) {
    const betaOld = [...beta];

    for (let j = 0; j < k; j++) {
      // Partial residual
      let rho = 0;
      for (let i = 0; i < n; i++) {
        const pred = dot(XStd[i], beta) - XStd[i][j] * beta[j];
        rho += XStd[i][j] * (yCentered[i] - pred);
      }
      rho /= n;

      // Soft thresholding
      beta[j] = softThreshold(rho, alpha);
    }

    iterations++;

    // Check convergence
    const diff = beta.reduce((sum, b, i) => sum + (b - betaOld[i]) ** 2, 0);
    if (diff < tolerance) break;
  }

  // Convert back to original scale
  const coefficients = beta.map((b, j) => b / stds[j]);
  const intercept = yMean - coefficients.reduce((sum, b, j) => sum + b * means[j], 0);

  // Predictions
  const predictions = X.map(row => intercept + dot(row, coefficients));
  const residuals = y.map((yi, i) => yi - predictions[i]);

  // R-squared
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return {
    coefficients,
    intercept,
    rSquared,
    predictions,
    residuals,
    alpha,
    iterations,
  };
}

// ============================================================
// Polynomial Regression
// ============================================================

export function polynomialRegression(
  x: number[],
  y: number[],
  degree: number = 2
): PolynomialResult {
  const n = x.length;

  // Build feature matrix [1, x, x^2, ..., x^degree]
  const XAug: number[][] = x.map(xi =>
    Array.from({ length: degree + 1 }, (_, d) => Math.pow(xi, d))
  );

  const Xt = transpose(XAug);
  const XtX = matMul(Xt, XAug);
  const XtXinv = invert(XtX);

  if (!XtXinv) {
    throw new Error('Cannot perform polynomial regression - singular matrix');
  }

  const Xty = Xt.map(row => dot(row, y));
  const beta = matMul(XtXinv, Xty.map(v => [v])).map(v => v[0]);

  const predictions = XAug.map(row => dot(row, beta));
  const residuals = y.map((yi, i) => yi - predictions[i]);

  const yMean = ss.mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssResidual / ssTotal;
  const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - degree - 1);

  return {
    coefficients: beta,
    rSquared,
    adjustedRSquared,
    degree,
    predictions,
    residuals,
  };
}

// ============================================================
// K-Means Clustering (Lloyd's Algorithm)
// ============================================================

export function kMeansClustering(
  data: number[][],
  k: number = 3,
  maxIterations: number = 100
): KMeansResult {
  const n = data.length;
  const d = data[0].length;

  // Initialize centroids using random selection
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let centroids = indices.slice(0, k).map(idx => [...data[idx]]);
  let assignments = new Array(n).fill(0);
  let iterations = 0;

  const distance = (a: number[], b: number[]): number => {
    return Math.sqrt(a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0));
  };

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;

    // Assignment step
    const newAssignments = data.map(point => {
      let minDist = Infinity;
      let minCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = distance(point, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minCluster = c;
        }
      }
      return minCluster;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;

    if (!changed) break;

    // Update step
    for (let c = 0; c < k; c++) {
      const members = data.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = Array.from({ length: d }, (_, j) =>
          ss.mean(members.map(m => m[j]))
        );
      }
    }
  }

  // Within-cluster sum of squares
  const withinClusterSS = Array.from({ length: k }, (_, c) => {
    const members = data.filter((_, i) => assignments[i] === c);
    if (members.length === 0) return 0;
    return members.reduce(
      (sum, m) => sum + distance(m, centroids[c]) ** 2,
      0
    );
  });

  return {
    centroids,
    assignments,
    iterations,
    withinClusterSS,
    totalWithinClusterSS: withinClusterSS.reduce((a, b) => a + b, 0),
    k,
  };
}

// ============================================================
// PCA (Principal Component Analysis)
// ============================================================

export function pca(
  data: number[][],
  numComponents?: number
): PCAResult {
  const n = data.length;
  const d = data[0].length;
  const k = numComponents ?? d;

  // Standardize data
  const means = Array.from({ length: d }, (_, j) => ss.mean(data.map(row => row[j])));
  const stds = Array.from({ length: d }, (_, j) => {
    const s = ss.standardDeviation(data.map(row => row[j]));
    return s > 0 ? s : 1;
  });

  const standardized = data.map(row =>
    row.map((x, j) => (x - means[j]) / stds[j])
  );

  // Covariance matrix
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      const xi = standardized.map(row => row[i]);
      const xj = standardized.map(row => row[j]);
      cov[i][j] = ss.sampleCovariance(xi, xj);
      cov[j][i] = cov[i][j];
    }
  }

  // Power iteration for eigenvalue decomposition
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];
  const deflatedCov = cov.map(row => [...row]);

  for (let comp = 0; comp < k; comp++) {
    let v = normalize(Array.from({ length: d }, () => Math.random()));
    let eigenvalue = 0;

    for (let iter = 0; iter < 1000; iter++) {
      const newV = deflatedCov.map(row => dot(row, v));
      eigenvalue = dot(v, newV);
      const norm = magnitude(newV);
      if (norm === 0) break;
      const normalized = newV.map(x => x / norm);

      const converged = v.every((vi, i) => Math.abs(vi - normalized[i]) < 1e-8);
      v = normalized;
      if (converged) break;
    }

    eigenvalues.push(eigenvalue);
    eigenvectors.push(v);

    // Deflate
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        deflatedCov[i][j] -= eigenvalue * v[i] * v[j];
      }
    }
  }

  // Explained variance
  const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
  const explainedVariance = eigenvalues.map(ev => ev / totalVariance);
  const cumulativeVariance = explainedVariance.reduce(
    (acc, ev, i) => [...acc, (acc[i - 1] ?? 0) + ev],
    [] as number[]
  );

  // Project data
  const projectedData = standardized.map(row =>
    eigenvectors.map(ev => dot(row, ev))
  );

  return {
    components: eigenvectors,
    eigenvalues,
    explainedVariance,
    cumulativeVariance,
    loadings: eigenvectors.map(ev =>
      ev.map((v, i) => v * Math.sqrt(Math.max(0, eigenvalues[eigenvectors.indexOf(ev)] ?? 0)))
    ),
    projectedData,
  };
}

// ============================================================
// Time Series Forecasting
// ============================================================

export function movingAverage(
  values: number[],
  period: number = 5
): MovingAverageResult {
  const smoothed: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      smoothed.push(ss.mean(values.slice(0, i + 1)));
    } else {
      smoothed.push(ss.mean(values.slice(i - period + 1, i + 1)));
    }
  }

  return { values, smoothed, period };
}

export function exponentialSmoothing(
  values: number[],
  alpha: number = 0.3,
  useTrend: boolean = false,
  beta: number = 0.1
): ExponentialSmoothingResult {
  const n = values.length;
  const smoothed: number[] = [values[0]];
  const level: number[] = [values[0]];
  const trend: number[] = [0];

  for (let i = 1; i < n; i++) {
    const newLevel = alpha * values[i] + (1 - alpha) * (level[i - 1] + (useTrend ? trend[i - 1] : 0));
    level.push(newLevel);

    if (useTrend) {
      const newTrend = beta * (newLevel - level[i - 1]) + (1 - beta) * trend[i - 1];
      trend.push(newTrend);
      smoothed.push(newLevel + newTrend);
    } else {
      smoothed.push(newLevel);
    }
  }

  return { values, smoothed, alpha, level, trend };
}

export function timeSeriesForecast(
  values: number[],
  forecastHorizon: number = 10,
  method: 'ma' | 'es' | 'arima' = 'es'
): TimeSeriesForecastResult {
  const n = values.length;

  if (method === 'ma') {
    const period = Math.max(3, Math.floor(n / 5));
    const result = movingAverage(values, period);
    const lastSmoothed = result.smoothed[result.smoothed.length - 1];

    // Forecast: last smoothed value repeated
    const forecast = Array(forecastHorizon).fill(lastSmoothed);

    // Confidence interval
    const residuals = values.map((v, i) => v - result.smoothed[i]);
    const residualStd = ss.standardDeviation(residuals.filter(r => !isNaN(r)));
    const margin = 1.96 * residualStd;

    const lowerBound = forecast.map(f => f - margin);
    const upperBound = forecast.map(f => f + margin);

    const mae = ss.mean(residuals.filter(r => !isNaN(r)).map(r => Math.abs(r)));
    const rmse = Math.sqrt(ss.mean(residuals.filter(r => !isNaN(r)).map(r => r * r)));
    const mape = ss.mean(
      values.slice(period).map((v, i) => Math.abs((v - result.smoothed[i + period]) / Math.abs(v) * 100))
    );

    return {
      forecast,
      lowerBound,
      upperBound,
      method: `Moving Average (period=${period})`,
      parameters: { period },
      accuracy: { mae, rmse, mape },
    };
  }

  if (method === 'arima') {
    // Simplified ARIMA(1,1,0) - differencing + AR(1)
    const diff = values.slice(1).map((v, i) => v - values[i]);
    const meanDiff = ss.mean(diff);

    // AR(1) coefficient on differenced series
    const diffLag = diff.slice(0, -1);
    const diffCurr = diff.slice(1);
    let arCoef = 0;
    if (diffLag.length > 2) {
      try {
        const reg = ss.linearRegression({ x: diffLag, y: diffCurr });
        arCoef = reg.m;
      } catch {
        arCoef = 0;
      }
    }

    // Forecast differenced values
    const lastDiff = diff[diff.length - 1];
    const forecastDiff: number[] = [];
    let prevDiff = lastDiff;
    for (let h = 0; h < forecastHorizon; h++) {
      const nextDiff = meanDiff + arCoef * (prevDiff - meanDiff);
      forecastDiff.push(nextDiff);
      prevDiff = nextDiff;
    }

    // Convert back to levels
    const lastValue = values[values.length - 1];
    const forecast: number[] = [];
    let cumulative = lastValue;
    for (const d of forecastDiff) {
      cumulative += d;
      forecast.push(cumulative);
    }

    // Confidence interval
    const residualStd = ss.standardDeviation(diff);
    const margins = forecastDiff.map((_, h) => 1.96 * residualStd * Math.sqrt(h + 1));
    const lowerBound = forecast.map((f, i) => f - margins[i]);
    const upperBound = forecast.map((f, i) => f + margins[i]);

    const mae = ss.mean(diff.map(d => Math.abs(d)));
    const rmse = Math.sqrt(ss.mean(diff.map(d => d * d)));
    const mape = ss.mean(values.slice(1).map((v, i) => Math.abs(diff[i] / Math.abs(v)) * 100));

    return {
      forecast,
      lowerBound,
      upperBound,
      method: 'ARIMA(1,1,0)',
      parameters: { arCoef, meanDiff },
      accuracy: { mae, rmse, mape },
    };
  }

  // Default: Exponential Smoothing with trend
  const alpha = 0.3;
  const beta = 0.1;
  const result = exponentialSmoothing(values, alpha, true, beta);
  const lastLevel = result.level[result.level.length - 1];
  const lastTrend = result.trend[result.trend.length - 1];

  const forecast = Array.from({ length: forecastHorizon }, (_, h) =>
    lastLevel + (h + 1) * lastTrend
  );

  const residuals = values.map((v, i) => v - result.smoothed[i]);
  const residualStd = ss.standardDeviation(residuals);
  const margins = forecast.map((_, h) => 1.96 * residualStd * Math.sqrt(h + 1));
  const lowerBound = forecast.map((f, i) => f - margins[i]);
  const upperBound = forecast.map((f, i) => f + margins[i]);

  const mae = ss.mean(residuals.map(r => Math.abs(r)));
  const rmse = Math.sqrt(ss.mean(residuals.map(r => r * r)));
  const validMape = values
    .map((v, i) => (Math.abs(v) > 0.01 ? Math.abs(residuals[i] / v) * 100 : 0))
    .filter(v => !isNaN(v));
  const mape = ss.mean(validMape);

  return {
    forecast,
    lowerBound,
    upperBound,
    method: 'Holt Exponential Smoothing',
    parameters: { alpha, beta },
    accuracy: { mae, rmse, mape },
  };
}
