/**
 * MERIDIAN Trading Engine - Paper Trading
 * Virtual portfolio, order management, P&L tracking
 */

// ============================================================
// Types
// ============================================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';
export type PositionSide = 'long' | 'short';

export interface Order {
  id: string;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledPrice?: number;
  timestamp: number;
  portfolioId: string;
}

export interface Position {
  ticker: string;
  shares: number;
  avgPrice: number;
  side: PositionSide;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Trade {
  id: string;
  ticker: string;
  side: OrderSide;
  shares: number;
  price: number;
  timestamp: number;
  portfolioId: string;
  pnl?: number;
}

export interface PortfolioState {
  id: string;
  name: string;
  cash: number;
  positions: Position[];
  /** Sampled portfolio value over time — powers real drawdown/Sharpe metrics */
  equityHistory: { at: number; value: number }[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  trades: Trade[];
  orders: Order[];
}

export interface PortfolioMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldPeriod: number;
}

// ============================================================
// Portfolio Manager
// ============================================================

const DEFAULT_STARTING_CASH = 100000;
const COMMISSION_RATE = 0.001; // 0.1% commission

class TradingEngine {
  private portfolios: Map<string, PortfolioState> = new Map();
  private nextOrderId = 1;

  createPortfolio(id: string, name: string = 'Main Portfolio', cash: number = DEFAULT_STARTING_CASH): PortfolioState {
    const portfolio: PortfolioState = {
      id,
      name,
      cash,
      positions: [],
      equityHistory: [{ at: Date.now(), value: cash }],
      totalValue: cash,
      totalPnL: 0,
      totalPnLPercent: 0,
      dayPnL: 0,
      dayPnLPercent: 0,
      trades: [],
      orders: [],
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  getPortfolio(id: string): PortfolioState | undefined {
    return this.portfolios.get(id);
  }

  placeOrder(
    portfolioId: string,
    ticker: string,
    side: OrderSide,
    type: OrderType,
    shares: number,
    price?: number,
    stopPrice?: number
  ): Order {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    if (shares <= 0) {
      throw new Error('Shares must be positive');
    }

    const order: Order = {
      id: `ORD-${this.nextOrderId++}`,
      ticker: ticker.toUpperCase(),
      side,
      type,
      shares,
      price,
      stopPrice,
      status: 'pending',
      timestamp: Date.now(),
      portfolioId,
    };

    // For market orders, fill immediately
    if (type === 'market') {
      this.fillOrder(order, portfolio);
    } else {
      portfolio.orders.push(order);
    }

    return order;
  }

  private fillOrder(order: Order, portfolio: PortfolioState): void {
    const fillPrice = order.price ?? this.getSimulatedPrice(order.ticker);
    if (!fillPrice || fillPrice <= 0) {
      order.status = 'rejected';
      return;
    }

    const totalCost = fillPrice * order.shares;
    const commission = totalCost * COMMISSION_RATE;

    if (order.side === 'buy') {
      if (portfolio.cash < totalCost + commission) {
        order.status = 'rejected';
        return;
      }
      portfolio.cash -= totalCost + commission;

      // Update or create position
      const existingPos = portfolio.positions.find(p => p.ticker === order.ticker);
      if (existingPos) {
        const totalShares = existingPos.shares + order.shares;
        const totalCostBasis = existingPos.avgPrice * existingPos.shares + fillPrice * order.shares;
        existingPos.shares = totalShares;
        existingPos.avgPrice = totalCostBasis / totalShares;
      } else {
        portfolio.positions.push({
          ticker: order.ticker,
          shares: order.shares,
          avgPrice: fillPrice,
          side: 'long',
          currentPrice: fillPrice,
          marketValue: totalCost,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        });
      }
    } else {
      // Sell
      const existingPos = portfolio.positions.find(p => p.ticker === order.ticker);
      if (!existingPos || existingPos.shares < order.shares) {
        order.status = 'rejected';
        return;
      }

      const realizedPnL = (fillPrice - existingPos.avgPrice) * order.shares - commission;
      portfolio.cash += totalCost - commission;

      existingPos.shares -= order.shares;
      if (existingPos.shares === 0) {
        portfolio.positions = portfolio.positions.filter(p => p.ticker !== order.ticker);
      }
    }

    order.status = 'filled';
    order.filledPrice = fillPrice;

    // Record trade
    const trade: Trade = {
      id: order.id,
      ticker: order.ticker,
      side: order.side,
      shares: order.shares,
      price: fillPrice,
      timestamp: order.timestamp,
      portfolioId: order.portfolioId,
      pnl: order.side === 'sell' ? (fillPrice - (portfolio.positions.find(p => p.ticker === order.ticker)?.avgPrice ?? fillPrice)) * order.shares : undefined,
    };
    portfolio.trades.push(trade);

    // Remove from pending orders
    portfolio.orders = portfolio.orders.filter(o => o.id !== order.id);
  }

  updatePrices(priceMap: Record<string, number>, portfolioId: string): void {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return;

    let previousTotalValue = portfolio.totalValue;

    for (const position of portfolio.positions) {
      if (priceMap[position.ticker]) {
        position.currentPrice = priceMap[position.ticker];
        position.marketValue = position.currentPrice * position.shares;
        position.unrealizedPnL = (position.currentPrice - position.avgPrice) * position.shares;
        position.unrealizedPnLPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
      }
    }

    portfolio.totalValue = portfolio.cash + portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0);
    portfolio.totalPnL = portfolio.totalValue - DEFAULT_STARTING_CASH;
    portfolio.totalPnLPercent = ((portfolio.totalValue - DEFAULT_STARTING_CASH) / DEFAULT_STARTING_CASH) * 100;
    portfolio.dayPnL = portfolio.totalValue - previousTotalValue;
    portfolio.dayPnLPercent = previousTotalValue > 0 ? (portfolio.dayPnL / previousTotalValue) * 100 : 0;

    // Sample the equity curve (max 5_000 points, oldest dropped)
    const history = portfolio.equityHistory;
    if (history.length === 0 || portfolio.totalValue !== history[history.length - 1].value) {
      history.push({ at: Date.now(), value: portfolio.totalValue });
      if (history.length > 5_000) history.splice(0, history.length - 5_000);
    }

    // Check limit and stop orders
    for (const order of portfolio.orders) {
      if (order.type === 'limit' && order.price) {
        if (order.side === 'buy' && priceMap[order.ticker] <= order.price) {
          this.fillOrder(order, portfolio);
        } else if (order.side === 'sell' && priceMap[order.ticker] >= order.price) {
          this.fillOrder(order, portfolio);
        }
      }
      if (order.type === 'stop' && order.stopPrice && priceMap[order.ticker] <= order.stopPrice) {
        order.price = priceMap[order.ticker];
        this.fillOrder(order, portfolio);
      }
    }
  }

  calculateMetrics(portfolioId: string): PortfolioMetrics {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        totalTrades: 0,
        avgHoldPeriod: 0,
      };
    }

    const sellTrades = portfolio.trades.filter(t => t.side === 'sell' && t.pnl !== undefined);
    const wins = sellTrades.filter(t => (t.pnl ?? 0) > 0);
    const losses = sellTrades.filter(t => (t.pnl ?? 0) < 0);

    const totalReturn = portfolio.totalPnLPercent / 100;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;

    // ── Real risk metrics from the sampled equity curve ──
    const equity = portfolio.equityHistory.map(p => p.value);
    let peak = equity[0] ?? DEFAULT_STARTING_CASH;
    let maxDrawdown = 0;
    for (const value of equity) {
      if (value > peak) peak = value;
      const drawdown = (value - peak) / peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }

    const periodReturns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      if (equity[i - 1] > 0) periodReturns.push(equity[i] / equity[i - 1] - 1);
    }
    const meanReturn = periodReturns.length > 0
      ? periodReturns.reduce((s, r) => s + r, 0) / periodReturns.length : 0;
    const variance = periodReturns.length > 1
      ? periodReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (periodReturns.length - 1) : 0;
    const periodVol = Math.sqrt(variance);
    // Annualise assuming ~5 price updates per trading day (30s polling)
    const sharpeRatio = periodVol > 0
      ? (meanReturn / periodVol) * Math.sqrt(252 * 5) : 0;

    // Average holding period from matched buy->sell pairs (days)
    const buyTimes = portfolio.trades.filter(t => t.side === 'buy').map(t => t.timestamp);
    const holdDays = sellTrades
      .map(sell => {
        const priorBuys = buyTimes.filter(bt => bt <= sell.timestamp);
        const lastBuy = priorBuys[priorBuys.length - 1];
        return lastBuy ? (sell.timestamp - lastBuy) / 86_400_000 : undefined;
      })
      .filter((d): d is number => d !== undefined);
    const avgHoldPeriod = holdDays.length > 0
      ? holdDays.reduce((s, d) => s + d, 0) / holdDays.length : 0;

    const spanDays = equity.length > 1
      ? (portfolio.equityHistory[equity.length - 1].at - portfolio.equityHistory[0].at) / 86_400_000 : 0;
    const annualizedReturn = spanDays > 1
      ? Math.pow(1 + totalReturn, 365 / spanDays) - 1 : totalReturn;

    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      winRate: sellTrades.length > 0 ? wins.length / sellTrades.length : 0,
      avgWin,
      avgLoss,
      profitFactor: avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0,
      totalTrades: portfolio.trades.length,
      avgHoldPeriod,
    };
  }

  private getSimulatedPrice(ticker: string): number {
    // Simple price simulation
    const basePrices: Record<string, number> = {
      AAPL: 189.50, GOOGL: 141.80, MSFT: 378.90, AMZN: 178.25,
      TSLA: 248.50, NVDA: 875.30, META: 505.75, JPM: 196.40,
    };
    const base = basePrices[ticker.toUpperCase()] ?? 100;
    return Math.round((base * (1 + (Math.random() - 0.5) * 0.02)) * 100) / 100;
  }

  getWatchlist(portfolioId: string): string[] {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return [];
    return portfolio.positions.map(p => p.ticker);
  }
}

// Singleton instance
export const tradingEngine = new TradingEngine();
