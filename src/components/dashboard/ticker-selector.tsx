'use client';

import React, { useState, useCallback } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getAvailableTickers, getStockQuote } from '@/lib/market-data';
import { useSettingsStore } from '@/lib/settings-store';

interface TickerSelectorProps {
  selectedTickers: string[];
  onTickerSelect: (ticker: string) => void;
  onTickerRemove: (ticker: string) => void;
}

const POPULAR_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'JPM'];

export function TickerSelector({ selectedTickers, onTickerSelect, onTickerRemove }: TickerSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { recentTickers, addRecentTicker } = useSettingsStore();
  const availableTickers = getAvailableTickers();

  const filteredTickers = availableTickers.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback(
    (ticker: string) => {
      const upper = ticker.toUpperCase();
      if (!selectedTickers.includes(upper)) {
        onTickerSelect(upper);
        addRecentTicker(upper);
      }
      setSearch('');
      setOpen(false);
    },
    [selectedTickers, onTickerSelect, addRecentTicker]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selected tickers */}
      {selectedTickers.map((ticker) => {
        const quote = getStockQuote(ticker);
        const isPositive = quote.change >= 0;
        return (
          <Badge
            key={ticker}
            variant="secondary"
            className={`gap-1.5 pr-1 pl-2.5 h-7 font-mono text-xs ${
              isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {ticker}
            <span className="text-[10px] opacity-70">
              ${quote.price.toFixed(2)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-0.5 hover:bg-transparent"
              onClick={() => onTickerRemove(ticker)}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </Badge>
        );
      })}

      {/* Add ticker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs border-dashed"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <Input
              placeholder="Search ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />

            {/* Popular tickers */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Popular
              </span>
              <div className="flex flex-wrap gap-1">
                {POPULAR_TICKERS.filter((t) => !selectedTickers.includes(t)).map((ticker) => (
                  <Button
                    key={ticker}
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] font-mono px-2"
                    onClick={() => handleSelect(ticker)}
                  >
                    {ticker}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recent */}
            {recentTickers.filter((t) => !selectedTickers.includes(t)).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Recent
                </span>
                <div className="flex flex-wrap gap-1">
                  {recentTickers
                    .filter((t) => !selectedTickers.includes(t))
                    .slice(0, 5)
                    .map((ticker) => (
                      <Button
                        key={ticker}
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] font-mono px-2"
                        onClick={() => handleSelect(ticker)}
                      >
                        {ticker}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Search results */}
            {search && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Results
                </span>
                {filteredTickers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filteredTickers.map((ticker) => (
                      <Button
                        key={ticker}
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] font-mono px-2"
                        onClick={() => handleSelect(ticker)}
                      >
                        {ticker}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No tickers found</p>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
