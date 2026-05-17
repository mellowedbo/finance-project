/**
 * MERIDIAN Market Data Service
 * Demo/sample data generator for realistic financial data
 */

// ============================================================
// Types & Interfaces
// ============================================================

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  pe: number;
  sector: string;
  industry: string;
  previousClose: number;
  dayRange: string;
  yearRange: string;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeSeriesData {
  ticker: string;
  period: string;
  data: OHLCV[];
}

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

// ============================================================
// Stock Info Database
// ============================================================

interface StockInfo {
  name: string;
  basePrice: number;
  dailyVol: number;
  drift: number;
  sector: string;
  industry: string;
  marketCap: number;
  pe: number;
}

const STOCK_DB: Record<string, StockInfo> = {
  AAPL: { name: 'Apple Inc.', basePrice: 189.50, dailyVol: 0.018, drift: 0.0004, sector: 'Technology', industry: 'Consumer Electronics', marketCap: 2950e9, pe: 31.2 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 141.80, dailyVol: 0.020, drift: 0.0003, sector: 'Technology', industry: 'Internet Services', marketCap: 1780e9, pe: 26.8 },
  MSFT: { name: 'Microsoft Corp.', basePrice: 378.90, dailyVol: 0.016, drift: 0.0005, sector: 'Technology', industry: 'Software', marketCap: 2810e9, pe: 35.4 },
  AMZN: { name: 'Amazon.com Inc.', basePrice: 178.25, dailyVol: 0.022, drift: 0.0004, sector: 'Consumer Cyclical', industry: 'E-Commerce', marketCap: 1860e9, pe: 62.1 },
  TSLA: { name: 'Tesla Inc.', basePrice: 248.50, dailyVol: 0.035, drift: 0.0006, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', marketCap: 790e9, pe: 78.5 },
  NVDA: { name: 'NVIDIA Corp.', basePrice: 875.30, dailyVol: 0.030, drift: 0.0008, sector: 'Technology', industry: 'Semiconductors', marketCap: 2160e9, pe: 68.2 },
  META: { name: 'Meta Platforms Inc.', basePrice: 505.75, dailyVol: 0.025, drift: 0.0005, sector: 'Technology', industry: 'Social Media', marketCap: 1290e9, pe: 33.7 },
  JPM: { name: 'JPMorgan Chase & Co.', basePrice: 196.40, dailyVol: 0.015, drift: 0.0002, sector: 'Financial Services', industry: 'Banking', marketCap: 565e9, pe: 11.8 },
};

const INDEX_DB: Record<string, { name: string; baseValue: number; dailyVol: number }> = {
  'SPX': { name: 'S&P 500', baseValue: 5234.18, dailyVol: 0.010 },
  'IXIC': { name: 'NASDAQ Composite', baseValue: 16399.52, dailyVol: 0.014 },
  'DJI': { name: 'Dow Jones Industrial', baseValue: 39512.84, dailyVol: 0.009 },
};

// ============================================================
// LRU Cache
// ============================================================

class LRUCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttl: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const quoteCache = new LRUCache<StockQuote>(50, 30000);
const historyCache = new LRUCache<TimeSeriesData>(30, 120000);
const indexCache = new LRUCache<MarketIndex[]>(10, 30000);

// ============================================================
// Data Generation
// ============================================================

// Seeded random for deterministic demo data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePricePath(
  basePrice: number,
  days: number,
  dailyVol: number,
  drift: number,
  seed: number
): number[] {
  const rng = seededRandom(seed);
  const prices: number[] = [basePrice];
  // Box-Muller for normal distribution
  for (let i = 1; i < days; i++) {
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const ret = drift + dailyVol * z;
    prices.push(prices[i - 1] * (1 + ret));
  }
  return prices;
}

function formatDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const PERIOD_DAYS: Record<string, number> = {
  '1D': 1,
  '1W': 5,
  '1M': 22,
  '3M': 66,
  '6M': 132,
  '1Y': 252,
  '5Y': 1260,
};

// ============================================================
// Public API
// ============================================================

export function getStockQuote(ticker: string): StockQuote {
  const upper = ticker.toUpperCase();
  const cached = quoteCache.get(`quote_${upper}`);
  if (cached) return cached;

  const info = STOCK_DB[upper];
  if (!info) {
    // Generate generic quote for unknown tickers
    const genericBase = 50 + Math.random() * 200;
    return {
      ticker: upper,
      name: `${upper} Corp.`,
      price: Math.round(genericBase * 100) / 100,
      change: Math.round((Math.random() - 0.5) * 4 * 100) / 100,
      changePercent: Math.round((Math.random() - 0.5) * 4 * 100) / 100,
      open: Math.round(genericBase * 0.99 * 100) / 100,
      high: Math.round(genericBase * 1.02 * 100) / 100,
      low: Math.round(genericBase * 0.98 * 100) / 100,
      volume: Math.floor(Math.random() * 50000000),
      marketCap: Math.floor(Math.random() * 100e9),
      pe: Math.round((10 + Math.random() * 50) * 10) / 10,
      sector: 'Unknown',
      industry: 'Unknown',
      previousClose: Math.round(genericBase * 1.001 * 100) / 100,
      dayRange: `${(genericBase * 0.98).toFixed(2)} - ${(genericBase * 1.02).toFixed(2)}`,
      yearRange: `${(genericBase * 0.7).toFixed(2)} - ${(genericBase * 1.3).toFixed(2)}`,
    };
  }

  // Simulate current price with small random change from base
  const currentPriceChange = (Math.random() - 0.48) * info.basePrice * 0.03;
  const price = Math.round((info.basePrice + currentPriceChange) * 100) / 100;
  const previousClose = Math.round((price - currentPriceChange) * 100) / 100;
  const change = Math.round(currentPriceChange * 100) / 100;
  const changePercent = Math.round((currentPriceChange / previousClose) * 10000) / 100;
  const dayLow = Math.round((price * (1 - Math.random() * 0.02)) * 100) / 100;
  const dayHigh = Math.round((price * (1 + Math.random() * 0.02)) * 100) / 100;
  const open = Math.round((previousClose + (Math.random() - 0.5) * previousClose * 0.01) * 100) / 100;

  const quote: StockQuote = {
    ticker: upper,
    name: info.name,
    price,
    change,
    changePercent,
    open,
    high: dayHigh,
    low: dayLow,
    volume: Math.floor(20000000 + Math.random() * 60000000),
    marketCap: info.marketCap,
    pe: info.pe,
    sector: info.sector,
    industry: info.industry,
    previousClose,
    dayRange: `${dayLow.toFixed(2)} - ${dayHigh.toFixed(2)}`,
    yearRange: `${(info.basePrice * 0.7).toFixed(2)} - ${(info.basePrice * 1.35).toFixed(2)}`,
  };

  quoteCache.set(`quote_${upper}`, quote);
  return quote;
}

export function getHistoricalData(ticker: string, period: string = '1Y'): TimeSeriesData {
  const upper = ticker.toUpperCase();
  const cacheKey = `hist_${upper}_${period}`;
  const cached = historyCache.get(cacheKey);
  if (cached) return cached;

  const info = STOCK_DB[upper];
  const basePrice = info?.basePrice ?? 100;
  const dailyVol = info?.dailyVol ?? 0.02;
  const drift = info?.drift ?? 0.0003;

  const days = PERIOD_DAYS[period] ?? 252;
  const seed = upper.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + days;
  const prices = generatePricePath(basePrice, days, dailyVol, drift, seed);

  const data: OHLCV[] = prices.map((close, i) => {
    const intraVol = close * dailyVol * 0.5;
    const high = close + Math.random() * intraVol;
    const low = close - Math.random() * intraVol;
    const open = low + Math.random() * (high - low);
    return {
      date: formatDateString(days - 1 - i),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(Math.min(low, close, open) * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(10000000 + Math.random() * 50000000),
    };
  }).reverse();

  const result: TimeSeriesData = { ticker: upper, period, data };
  historyCache.set(cacheKey, result);
  return result;
}

export function getMarketIndices(): MarketIndex[] {
  const cached = indexCache.get('indices');
  if (cached) return cached;

  const indices: MarketIndex[] = Object.entries(INDEX_DB).map(([symbol, info]) => {
    const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const sparklinePrices = generatePricePath(info.baseValue, 30, info.dailyVol, 0.0002, seed);
    const current = sparklinePrices[sparklinePrices.length - 1];
    const previous = sparklinePrices[sparklinePrices.length - 2];
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    return {
      name: info.name,
      symbol,
      value: Math.round(current * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      sparkline: sparklinePrices.slice(-20).map(p => Math.round(p * 100) / 100),
    };
  });

  indexCache.set('indices', indices);
  return indices;
}

export function getAvailableTickers(): string[] {
  return Object.keys(STOCK_DB);
}

export function getStockInfo(ticker: string): StockInfo | undefined {
  return STOCK_DB[ticker.toUpperCase()];
}

export function simulateRealtimePrice(quote: StockQuote): StockQuote {
  const tick = (Math.random() - 0.48) * quote.price * 0.002;
  const newPrice = Math.round((quote.price + tick) * 100) / 100;
  const newChange = Math.round((newPrice - quote.previousClose) * 100) / 100;
  const newChangePercent = Math.round((newChange / quote.previousClose) * 10000) / 100;

  return {
    ...quote,
    price: newPrice,
    change: newChange,
    changePercent: newChangePercent,
    high: Math.max(quote.high, newPrice),
    low: Math.min(quote.low, newPrice),
  };
}

export function getReturnsFromOHLCV(data: OHLCV[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
  }
  return returns;
}

export function getAllStockQuotes(): StockQuote[] {
  return Object.keys(STOCK_DB).map(ticker => getStockQuote(ticker));
}
