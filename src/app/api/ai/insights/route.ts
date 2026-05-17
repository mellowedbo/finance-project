import { NextRequest, NextResponse } from 'next/server';
import { generateInsights } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, analysisType, data } = body;

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker is required' },
        { status: 400 }
      );
    }

    const validTypes = ['technical', 'risk', 'portfolio', 'sentiment'];
    const type = validTypes.includes(analysisType) ? analysisType : 'technical';

    const insight = await generateInsights(ticker, type, data);

    return NextResponse.json(insight);
  } catch (error) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
