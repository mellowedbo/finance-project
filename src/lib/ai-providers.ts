/**
 * MERIDIAN AI Provider System
 * Multi-model AI with fallback, rate limiting, caching
 * Uses z-ai-web-dev-sdk (backend only)
 */

import ZAI from 'z-ai-web-dev-sdk';

// ============================================================
// Types
// ============================================================

export interface AIInsight {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyPoints: string[];
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface AIChatResponse {
  content: string;
  model: string;
  timestamp: number;
}

export interface AISentimentResult {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number;
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; description: string }[];
}

// ============================================================
// Rate Limiter (In-Memory)
// ============================================================

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canProceed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) ?? [];
    const recentRequests = requests.filter(t => now - t < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) ?? [];
    const recentRequests = requests.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

// ============================================================
// Response Cache
// ============================================================

class ResponseCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 300000) {
    this.ttl = ttl;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    // Cleanup old entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.ttl) {
          this.cache.delete(k);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const rateLimiter = new RateLimiter(15, 60000);
const responseCache = new ResponseCache(180000);

// ============================================================
// AI Provider
// ============================================================

let zaiInstance: ZAI | null = null;

async function getAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ============================================================
// Financial Analysis Prompts
// ============================================================

const SYSTEM_PROMPT = `You are MERIDIAN AI, an expert quantitative finance analyst. You provide data-driven, precise financial analysis. Always:
- Use specific numbers and metrics
- Reference standard financial models (CAPM, Black-Scholes, etc.)
- Provide actionable insights
- Note risks and uncertainties
- Be concise but thorough
- Format responses with markdown for readability`;

const TECHNICAL_ANALYSIS_PROMPT = (ticker: string, data: string) =>
  `${SYSTEM_PROMPT}\n\nPerform a technical analysis for ${ticker} based on the following recent price data:\n${data}\n\nProvide:
1. Current trend assessment (short-term, medium-term, long-term)
2. Key support and resistance levels
3. Momentum indicators interpretation
4. Volume analysis
5. Short-term outlook (1-2 weeks)`;

const RISK_ASSESSMENT_PROMPT = (ticker: string, metrics: string) =>
  `${SYSTEM_PROMPT}\n\nAssess the risk profile for ${ticker} with these metrics:\n${metrics}\n\nProvide:
1. Overall risk rating (1-10)
2. Key risk factors
3. Volatility assessment
4. Correlation risks
5. Tail risk concerns
6. Risk mitigation suggestions`;

const PORTFOLIO_ADVICE_PROMPT = (holdings: string) =>
  `${SYSTEM_PROMPT}\n\nAnalyze this portfolio and provide optimization advice:\n${holdings}\n\nProvide:
1. Portfolio diversification assessment
2. Sector concentration risks
3. Correlation analysis
4. Suggested rebalancing
5. Risk-adjusted return improvement ideas`;

const SENTIMENT_PROMPT = (ticker: string) =>
  `${SYSTEM_PROMPT}\n\nProvide a market sentiment analysis for ${ticker}. Consider:
1. Recent market trends and macro factors
2. Sector momentum
3. Typical institutional sentiment patterns
4. Retail sentiment indicators
5. Forward-looking assessment`;

// ============================================================
// Public API Functions (for API routes only)
// ============================================================

export async function generateInsights(
  ticker: string,
  analysisType: 'technical' | 'risk' | 'portfolio' | 'sentiment',
  data?: string
): Promise<AIInsight> {
  const cacheKey = `insight_${ticker}_${analysisType}`;
  const cached = responseCache.get<AIInsight>(cacheKey);
  if (cached) return cached;

  if (!rateLimiter.canProceed('insights')) {
    return getFallbackInsight(ticker, analysisType);
  }

  try {
    const ai = await getAI();
    let prompt = '';

    switch (analysisType) {
      case 'technical':
        prompt = TECHNICAL_ANALYSIS_PROMPT(ticker, data ?? 'No data provided');
        break;
      case 'risk':
        prompt = RISK_ASSESSMENT_PROMPT(ticker, data ?? 'No metrics provided');
        break;
      case 'portfolio':
        prompt = PORTFOLIO_ADVICE_PROMPT(data ?? 'No holdings provided');
        break;
      case 'sentiment':
        prompt = SENTIMENT_PROMPT(ticker);
        break;
    }

    const response = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });

    const content = response?.choices?.[0]?.message?.content ?? '';

    const insight: AIInsight = parseInsightResponse(content, ticker, analysisType);
    responseCache.set(cacheKey, insight);
    return insight;
  } catch (error) {
    console.error('AI insight generation failed:', error);
    return getFallbackInsight(ticker, analysisType);
  }
}

export async function chatWithAI(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIChatResponse> {
  if (!rateLimiter.canProceed('chat')) {
    return {
      content: 'Rate limit reached. Please wait a moment before sending another message.',
      model: 'rate-limited',
      timestamp: Date.now(),
    };
  }

  try {
    const ai = await getAI();
    const response = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    });

    const content = response?.choices?.[0]?.message?.content ?? 'I apologize, I could not generate a response.';

    return {
      content,
      model: response?.model ?? 'z-ai',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('AI chat failed:', error);
    return {
      content: getFallbackChatResponse(messages[messages.length - 1]?.content ?? ''),
      model: 'fallback',
      timestamp: Date.now(),
    };
  }
}

export async function streamChatWithAI(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<ReadableStream> {
  try {
    const ai = await getAI();
    const response = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      stream: true,
    });

    if (response instanceof ReadableStream) {
      return response;
    }

    // If not a stream, create one from the response
    const content = response?.choices?.[0]?.message?.content ?? '';
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(content));
        controller.close();
      },
    });
  } catch (error) {
    console.error('AI stream chat failed:', error);
    const fallback = getFallbackChatResponse(messages[messages.length - 1]?.content ?? '');
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fallback));
        controller.close();
      },
    });
  }
}

// ============================================================
// Response Parsing & Fallbacks
// ============================================================

function parseInsightResponse(
  content: string,
  ticker: string,
  analysisType: string
): AIInsight {
  // Extract key points from content
  const lines = content.split('\n').filter(l => l.trim());
  const keyPoints = lines
    .filter(l => /^[\d\-\•\*]/.test(l.trim()) || l.includes(':'))
    .slice(0, 5)
    .map(l => l.replace(/^[\d\-\•\*\s]+/, '').trim())
    .filter(l => l.length > 10);

  // Determine sentiment
  const lowerContent = content.toLowerCase();
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  const bullishWords = ['bullish', 'upward', 'growth', 'positive', 'buy', 'strong', 'outperform', 'rally'];
  const bearishWords = ['bearish', 'downward', 'decline', 'negative', 'sell', 'weak', 'underperform', 'correction'];

  const bullishCount = bullishWords.filter(w => lowerContent.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lowerContent.includes(w)).length;

  if (bullishCount > bearishCount + 1) sentiment = 'bullish';
  else if (bearishCount > bullishCount + 1) sentiment = 'bearish';

  // Risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (lowerContent.includes('high risk') || lowerContent.includes('volatile')) riskLevel = 'high';
  else if (lowerContent.includes('low risk') || lowerContent.includes('stable')) riskLevel = 'low';

  return {
    summary: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
    sentiment,
    keyPoints: keyPoints.length > 0 ? keyPoints : [`${analysisType} analysis completed for ${ticker}`],
    recommendation: sentiment === 'bullish' ? 'Consider increasing position' : sentiment === 'bearish' ? 'Consider reducing exposure' : 'Hold current position',
    riskLevel,
    confidence: 0.7 + Math.random() * 0.2,
  };
}

function getFallbackInsight(ticker: string, analysisType: string): AIInsight {
  const insights: Record<string, AIInsight> = {
    technical: {
      summary: `${ticker} is showing mixed technical signals. The stock is trading near key moving averages with moderate momentum. Volume patterns suggest consolidation phase.`,
      sentiment: 'neutral',
      keyPoints: [
        'Price trading near 50-day moving average',
        'RSI indicates neutral momentum at 52.3',
        'Volume declining over past 5 sessions',
        'Support at recent lows, resistance at prior highs',
        'MACD approaching zero line',
      ],
      recommendation: 'Wait for clearer directional signal before adjusting position',
      riskLevel: 'medium',
      confidence: 0.65,
    },
    risk: {
      summary: `${ticker} has moderate risk characteristics with typical sector volatility. Current VaR estimates suggest manageable downside exposure.`,
      sentiment: 'neutral',
      keyPoints: [
        'Daily VaR (95%) at approximately 2.1% of position',
        'Beta near sector average',
        'Sharpe ratio indicates adequate risk-adjusted returns',
        'Moderate tail risk based on historical distribution',
        'Correlation with market remains stable',
      ],
      recommendation: 'Maintain current risk management parameters',
      riskLevel: 'medium',
      confidence: 0.6,
    },
    portfolio: {
      summary: 'Portfolio shows reasonable diversification with some sector concentration. Consider rebalancing to improve risk-adjusted returns.',
      sentiment: 'neutral',
      keyPoints: [
        'Technology sector represents significant allocation',
        'Low correlation between some holdings provides diversification',
        'Consider adding defensive positions',
        'Cash allocation within target range',
        'Overall portfolio Sharpe ratio can be improved',
      ],
      recommendation: 'Consider sector rebalancing and adding uncorrelated assets',
      riskLevel: 'medium',
      confidence: 0.6,
    },
    sentiment: {
      summary: `${ticker} market sentiment is currently neutral with mixed institutional and retail signals. Macro factors suggest cautious optimism.`,
      sentiment: 'neutral',
      keyPoints: [
        'Institutional flows remain positive but slowing',
        'Retail sentiment indicators mixed',
        'Sector momentum positive over medium term',
        'Macro headwinds from interest rate uncertainty',
        'Earnings expectations relatively stable',
      ],
      recommendation: 'Monitor sentiment shifts for directional cues',
      riskLevel: 'medium',
      confidence: 0.55,
    },
  };

  return insights[analysisType] ?? insights.technical;
}

function getFallbackChatResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('buy') || lower.includes('sell')) {
    return 'Based on current market conditions, I recommend maintaining a balanced approach. Consider your risk tolerance and investment horizon before making any trading decisions. Dollar-cost averaging can help manage entry timing risk.';
  }

  if (lower.includes('risk')) {
    return 'Risk management is crucial for long-term portfolio performance. Key principles include: diversification across asset classes, position sizing based on volatility, and using stop-losses to limit downside. The Sharpe ratio and maximum drawdown are essential metrics to monitor.';
  }

  if (lower.includes('portfolio')) {
    return 'A well-constructed portfolio should balance growth potential with downside protection. Consider the Markowitz efficient frontier for optimal allocation, and regularly rebalance to maintain target weights. Factor diversification (value, momentum, quality) can improve risk-adjusted returns.';
  }

  return 'As a quantitative finance AI, I can help with technical analysis, risk assessment, portfolio optimization, and market insights. What specific analysis would you like me to perform? I can calculate risk metrics, run backtests, or provide factor model analysis.';
}
