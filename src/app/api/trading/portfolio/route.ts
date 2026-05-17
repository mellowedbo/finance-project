import { NextRequest, NextResponse } from 'next/server';
import { tradingEngine } from '@/lib/trading-engine';
import { getStockQuote } from '@/lib/market-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId') ?? 'default';

    // Ensure portfolio exists
    if (!tradingEngine.getPortfolio(portfolioId)) {
      tradingEngine.createPortfolio(portfolioId);
    }

    const portfolio = tradingEngine.getPortfolio(portfolioId)!;

    // Update prices
    const priceMap: Record<string, number> = {};
    for (const position of portfolio.positions) {
      const quote = getStockQuote(position.ticker);
      priceMap[position.ticker] = quote.price;
    }
    tradingEngine.updatePrices(priceMap, portfolioId);

    const metrics = tradingEngine.calculateMetrics(portfolioId);

    return NextResponse.json({
      ...portfolio,
      metrics,
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to get portfolio' },
      { status: 500 }
    );
  }
}
