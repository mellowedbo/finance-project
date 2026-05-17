/**
 * MERIDIAN Settings Store (Zustand)
 * Theme, ticker, AI model, demo mode, chart preferences, refresh interval
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChartPreferences {
  chartType: 'area' | 'line' | 'candlestick';
  showVolume: boolean;
  showGrid: boolean;
  colorScheme: 'default' | 'monochrome' | 'warm';
}

interface SettingsState {
  // Theme
  theme: 'light' | 'dark' | 'system';

  // Default ticker
  defaultTicker: string;

  // Recent tickers
  recentTickers: string[];

  // AI model preference
  aiModel: string;

  // Demo mode
  demoMode: boolean;

  // Chart preferences
  chartPreferences: ChartPreferences;

  // Refresh interval (ms)
  refreshInterval: number;

  // Active tab
  activeTab: string;

  // Sidebar collapsed
  sidebarCollapsed: boolean;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setDefaultTicker: (ticker: string) => void;
  addRecentTicker: (ticker: string) => void;
  setAIModel: (model: string) => void;
  setDemoMode: (enabled: boolean) => void;
  setChartPreferences: (prefs: Partial<ChartPreferences>) => void;
  setRefreshInterval: (interval: number) => void;
  setActiveTab: (tab: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      theme: 'dark',
      defaultTicker: 'AAPL',
      recentTickers: ['AAPL', 'NVDA', 'MSFT'],
      aiModel: 'default',
      demoMode: true,
      chartPreferences: {
        chartType: 'area',
        showVolume: true,
        showGrid: true,
        colorScheme: 'default',
      },
      refreshInterval: 5000,
      activeTab: 'overview',
      sidebarCollapsed: false,

      // Actions
      setTheme: (theme) => set({ theme }),
      setDefaultTicker: (ticker) => set({ defaultTicker: ticker.toUpperCase() }),
      addRecentTicker: (ticker) =>
        set((state) => {
          const upper = ticker.toUpperCase();
          const filtered = state.recentTickers.filter(t => t !== upper);
          return { recentTickers: [upper, ...filtered].slice(0, 10) };
        }),
      setAIModel: (model) => set({ aiModel: model }),
      setDemoMode: (enabled) => set({ demoMode: enabled }),
      setChartPreferences: (prefs) =>
        set((state) => ({
          chartPreferences: { ...state.chartPreferences, ...prefs },
        })),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'meridian-settings',
    }
  )
);
