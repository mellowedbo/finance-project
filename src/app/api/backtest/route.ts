import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/lib/backtest-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, strategy, period, startingCapital, customParams } = body;

    if (!ticker || !strategy) {
      return NextResponse.json(
        { error: 'Ticker and strategy are required' },
        { status: 400 }
      );
    }

    const result = runBacktest(
      ticker,
      strategy,
      period ?? '1Y',
      startingCapital ?? 100000,
      customParams
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Backtest error:', error);
    const message = error instanceof Error ? error.message : 'Failed to run backtest';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
