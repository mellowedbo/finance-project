import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData } from '@/lib/market-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') ?? 'AAPL';
    const period = searchParams.get('period') ?? '1Y';

    const data = getHistoricalData(ticker, period);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Market history error:', error);
    return NextResponse.json(
      { error: 'Failed to get historical data' },
      { status: 500 }
    );
  }
}
