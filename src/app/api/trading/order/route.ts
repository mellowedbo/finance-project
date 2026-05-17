import { NextRequest, NextResponse } from 'next/server';
import { tradingEngine } from '@/lib/trading-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portfolioId, ticker, side, type, shares, price, stopPrice } = body;

    if (!ticker || !side || !type || !shares) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, side, type, shares' },
        { status: 400 }
      );
    }

    const validSides = ['buy', 'sell'];
    const validTypes = ['market', 'limit', 'stop'];

    if (!validSides.includes(side)) {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 });
    }
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });
    }
    if (shares <= 0) {
      return NextResponse.json({ error: 'Shares must be positive' }, { status: 400 });
    }

    const pid = portfolioId ?? 'default';

    // Ensure portfolio exists
    if (!tradingEngine.getPortfolio(pid)) {
      tradingEngine.createPortfolio(pid);
    }

    const order = tradingEngine.placeOrder(pid, ticker, side, type, shares, price, stopPrice);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Trading order error:', error);
    const message = error instanceof Error ? error.message : 'Failed to place order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
