# 📊 MERIDIAN — Finance Analytics & Paper-Trading Platform

A full-stack finance platform built with Next.js 16: **live-style market
dashboards, an ML analysis lab, quantitative risk analytics (Black-Scholes,
VaR/CVaR, Markowitz, Fama-French), a paper-trading engine and an AI research
assistant** — with a Prisma + SQLite persistence layer for portfolios, trades
and watchlists.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

| Area | What you get |
|---|---|
| **Overview** | Market indices header, watchlist with live-style tickers, interactive stock chart, portfolio summary panel |
| **Analysis — Risk Lab** | Historical/parametric VaR & CVaR, Black-Scholes pricing with Greeks, CAPM & Fama-French style factor regressions, Markowitz-style efficient frontier inputs (`src/lib/finance-engine.ts`, ~550 LOC of real quant math) |
| **Analysis — ML Lab** | OLS/Ridge/LASSO regression, k-means clustering, PCA, time-series forecasting (`src/lib/ml-engine.ts`, ~800 LOC) |
| **Trading** | Paper trading with $100k starting capital, market/limit/stop orders, positions, P&L, and **real** risk metrics — max drawdown and Sharpe are computed from the tracked equity curve, not hardcoded |
| **AI Research** | Chat-based research assistant (sandbox LLM SDK with canned fallbacks when unconfigured) |
| **Backtesting** | SMA crossover, momentum and mean-reversion strategies with an equity-curve report |

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5** (strict, `tsc --noEmit` enforced in CI)
- **Tailwind CSS 4** + **shadcn/ui** (57 components)
- **Prisma 6 + SQLite** — portfolios, positions, trades, watchlists, settings
- **zustand** for client state, **recharts** for visualisation
- **simple-statistics** for the quant engines

## Quick start

```bash
git clone https://github.com/mellowedbo/finance-project.git meridian
cd meridian
bun install            # or npm install

cp .env.example .env   # points DATABASE_URL at ./db/custom.db
npm run db:push        # create the SQLite schema
npm run db:seed        # demo portfolio, positions, trades, watchlist

npm run dev            # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build (type errors are **not** suppressed) |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` / `db:seed` | Create schema / seed demo data |

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # 5-tab single-page app
│   └── api/
│       ├── backtest/             # strategy backtests
│       ├── ai/chat               # research assistant
│       ├── market/{quote,history}/
│       └── trading/{order,portfolio}/
├── components/dashboard/         # overview, trading, risk, ML, AI, backtest panels
└── lib/
    ├── finance-engine.ts         # VaR/CVaR, Black-Scholes + Greeks, CAPM/FF, Markowitz
    ├── ml-engine.ts              # OLS/Ridge/LASSO, k-means, PCA, forecasting
    ├── backtest-engine.ts        # SMA/momentum/mean-reversion backtester
    ├── trading-engine.ts         # paper-trading engine + equity-curve metrics
    ├── market-data.ts            # synthetic market simulator (seeded GBM)
    └── db.ts                     # Prisma client singleton
```

## Honest limitations (read this!)

- **Market data is simulated** — `src/lib/market-data.ts` generates seeded
  geometric-Brownian-motion paths for 8 tickers. It behaves like real data but
  is not real. Swap `getHistoricalData`/`getStockQuote` for a live provider to
  make it real.
- **The trading engine is per-process** — portfolio state lives in memory
  (`tradingEngine` singleton) so it resets on restart; the Prisma schema is
  wired for persistence via the `/api/trading/*` routes and seeded demo data,
  but the UI panels currently read the in-memory engine.
- **AI features need sandbox credentials** — without them the assistant falls
  back to canned keyword responses.

## Roadmap

- [ ] Live market data provider (Alpha Vantage / Twelve Data) with the synthetic feed as fallback
- [ ] Persist paper-trading state through `/api/trading/*` into Prisma
- [ ] Per-user auth (next-auth) with isolated portfolios
- [ ] Kupiec VaR backtest + walk-forward validation for strategies

## Disclaimer

Educational project for a finance curriculum — not investment advice. All
prices in demo mode are simulated.

## License

MIT — see [LICENSE](LICENSE).
