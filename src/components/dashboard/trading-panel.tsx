'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowUpCircle, ArrowDownCircle, Receipt } from 'lucide-react';
import { getStockQuote } from '@/lib/market-data';
import { tradingEngine, type OrderSide, type OrderType } from '@/lib/trading-engine';

interface TradingPanelProps {
  selectedTicker: string;
  portfolioId?: string;
}

export function TradingPanel({ selectedTicker, portfolioId = 'default' }: TradingPanelProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quote = getStockQuote(selectedTicker);
  const portfolio = tradingEngine.getPortfolio(portfolioId);

  const sharesNum = parseFloat(shares) || 0;
  const effectivePrice = orderType === 'market' ? quote.price : parseFloat(price) || quote.price;
  const totalCost = sharesNum * effectivePrice;
  const commission = totalCost * 0.001;

  const handleSubmit = useCallback(async () => {
    if (sharesNum <= 0) {
      toast.error('Please enter a valid number of shares');
      return;
    }

    if (orderType !== 'market' && !price) {
      toast.error('Please enter a limit/stop price');
      return;
    }

    setSubmitting(true);

    try {
      if (!tradingEngine.getPortfolio(portfolioId)) {
        tradingEngine.createPortfolio(portfolioId);
      }

      const order = tradingEngine.placeOrder(
        portfolioId,
        selectedTicker,
        side,
        orderType,
        sharesNum,
        orderType !== 'market' ? parseFloat(price) : undefined,
        orderType === 'stop' ? parseFloat(stopPrice) : undefined
      );

      if (order.status === 'filled') {
        toast.success(
          `${side === 'buy' ? 'Bought' : 'Sold'} ${sharesNum} shares of ${selectedTicker} at $${order.filledPrice?.toFixed(2)}`
        );
      } else if (order.status === 'rejected') {
        toast.error('Order rejected. Insufficient funds or shares.');
      } else {
        toast.info(`${orderType} order placed. Waiting for fill.`);
      }

      setShares('');
      setPrice('');
      setStopPrice('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }, [sharesNum, orderType, price, stopPrice, portfolioId, selectedTicker, side]);

  const recentTrades = portfolio?.trades.slice(-10).reverse() ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Order Form */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Place Order — {selectedTicker}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-lg font-bold">${quote.price.toFixed(2)}</span>
            <Badge
              variant="outline"
              className={
                quote.change >= 0
                  ? 'border-emerald-500/30 text-emerald-500'
                  : 'border-red-500/30 text-red-500'
              }
            >
              {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={side === 'buy' ? 'default' : 'outline'}
              className={
                side === 'buy'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : ''
              }
              onClick={() => setSide('buy')}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1.5" />
              Buy
            </Button>
            <Button
              variant={side === 'sell' ? 'default' : 'outline'}
              className={
                side === 'sell'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : ''
              }
              onClick={() => setSide('sell')}
            >
              <ArrowDownCircle className="h-4 w-4 mr-1.5" />
              Sell
            </Button>
          </div>

          {/* Order Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Order Type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shares */}
          <div className="space-y-1.5">
            <Label className="text-xs">Shares</Label>
            <Input
              type="number"
              placeholder="0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="h-9 font-mono"
              min="1"
              step="1"
            />
            <div className="flex gap-1.5">
              {[10, 50, 100, 500].map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setShares(String(n))}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'limit' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Limit Price</Label>
              <Input
                type="number"
                placeholder={quote.price.toFixed(2)}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9 font-mono"
                step="0.01"
              />
            </div>
          )}

          {/* Stop Price */}
          {orderType === 'stop' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Stop Price</Label>
              <Input
                type="number"
                placeholder={quote.price.toFixed(2)}
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                className="h-9 font-mono"
                step="0.01"
              />
            </div>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Price</span>
              <span className="font-mono">${effectivePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares</span>
              <span className="font-mono">{sharesNum || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Total</span>
              <span className="font-mono font-semibold">
                {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission</span>
              <span className="font-mono">{commission > 0 ? `$${commission.toFixed(2)}` : '—'}</span>
            </div>
          </div>

          <Button
            className={`w-full ${
              side === 'buy'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-red-500 hover:bg-red-600'
            } text-white`}
            onClick={handleSubmit}
            disabled={submitting || sharesNum <= 0}
          >
            {submitting
              ? 'Processing...'
              : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedTicker}`}
          </Button>

          {/* Available balance */}
          <p className="text-[11px] text-muted-foreground text-center">
            Available: ${portfolio?.cash.toFixed(2) ?? '100,000.00'}
          </p>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No trades yet. Place your first order!
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Side</TableHead>
                    <TableHead className="text-[11px]">Ticker</TableHead>
                    <TableHead className="text-[11px] text-right">Shares</TableHead>
                    <TableHead className="text-[11px] text-right">Price</TableHead>
                    <TableHead className="text-[11px] text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            trade.side === 'buy'
                              ? 'border-emerald-500/30 text-emerald-500 text-[10px]'
                              : 'border-red-500/30 text-red-500 text-[10px]'
                          }
                        >
                          {trade.side.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {trade.ticker}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{trade.shares}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        ${trade.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
