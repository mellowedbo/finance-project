/**
 * Prisma seed — creates a starter paper-trading portfolio, a watchlist and
 * default settings so a fresh clone has meaningful data on first run.
 *
 * Usage: npm run db:seed   (requires DATABASE_URL, see .env.example)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MERIDIAN database…');

  const portfolio = await prisma.portfolio.upsert({
    where: { id: 'seed-portfolio' },
    update: {},
    create: {
      id: 'seed-portfolio',
      name: 'Demo Portfolio',
      cash: 72_500,
    },
  });

  // A small diversified starter book
  const positions = [
    { ticker: 'AAPL', shares: 40, avgPrice: 187.2 },
    { ticker: 'MSFT', shares: 25, avgPrice: 415.6 },
    { ticker: 'NVDA', shares: 60, avgPrice: 122.4 },
    { ticker: 'JPM', shares: 30, avgPrice: 198.75 },
    { ticker: 'XOM', shares: 50, avgPrice: 104.3 },
  ];
  for (const p of positions) {
    await prisma.position.upsert({
      where: { portfolioId_ticker: { portfolioId: portfolio.id, ticker: p.ticker } },
      update: {},
      create: { portfolioId: portfolio.id, ...p, side: 'long' },
    });
  }

  // A few historical trades so analytics have something to chew on
  const trades = [
    { ticker: 'AAPL', type: 'market', side: 'buy', shares: 40, price: 187.2, daysAgo: 120 },
    { ticker: 'MSFT', type: 'market', side: 'buy', shares: 25, price: 415.6, daysAgo: 95 },
    { ticker: 'NVDA', type: 'market', side: 'buy', shares: 80, price: 108.1, daysAgo: 80 },
    { ticker: 'NVDA', type: 'market', side: 'sell', shares: 20, price: 131.4, daysAgo: 34 },
    { ticker: 'JPM', type: 'market', side: 'buy', shares: 30, price: 198.75, daysAgo: 21 },
    { ticker: 'XOM', type: 'market', side: 'buy', shares: 50, price: 104.3, daysAgo: 9 },
  ];
  for (const t of trades) {
    await prisma.trade.create({
      data: {
        portfolioId: portfolio.id,
        ticker: t.ticker,
        type: t.type,
        side: t.side,
        shares: t.shares,
        price: t.price,
        timestamp: new Date(Date.now() - t.daysAgo * 86_400_000),
      },
    });
  }

  const watchlist = await prisma.watchlist.upsert({
    where: { id: 'seed-watchlist' },
    update: {},
    create: { id: 'seed-watchlist', name: 'Core Watchlist' },
  });
  for (const ticker of ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'JPM', 'JNJ', 'XOM', 'SPY']) {
    await prisma.watchlistItem.upsert({
      where: { watchlistId_ticker: { watchlistId: watchlist.id, ticker } },
      update: {},
      create: { watchlistId: watchlist.id, ticker },
    });
  }

  await prisma.setting.upsert({
    where: { key: 'startingCash' },
    update: {},
    create: { key: 'startingCash', value: '100000' },
  });

  console.log('Seed complete: 1 portfolio, 5 positions, 6 trades, 10 watchlist items.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
