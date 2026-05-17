import { NextRequest, NextResponse } from 'next/server';
import { getStockQuote, getAllStockQuotes } from '@/lib/market-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (ticker) {
      const quote = getStockQuote(ticker);
      return NextResponse.json(quote);
    }

    const allQuotes = getAllStockQuotes();
    return NextResponse.json(allQuotes);
  } catch (error) {
    console.error('Market quote error:', error);
    return NextResponse.json(
      { error: 'Failed to get stock quote' },
      { status: 500 }
    );
  }
}
