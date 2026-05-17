'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  LineChart,
  ArrowLeftRight,
  Brain,
  FlaskConical,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/lib/settings-store';
import { Header } from './header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analysis', label: 'Analysis', icon: LineChart },
  { id: 'trading', label: 'Trading', icon: ArrowLeftRight },
  { id: 'ai', label: 'AI Research', icon: Brain },
  { id: 'backtest', label: 'Backtest', icon: FlaskConical },
];

export function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          className="hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-sm"
          animate={{ width: sidebarCollapsed ? 64 : 200 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <nav className="flex-1 py-4 space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start gap-3 h-10 transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Button>
              );
            })}
          </nav>

          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-8"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </motion.aside>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
          <nav className="flex justify-around py-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className={`flex-col gap-0.5 h-auto py-1.5 px-3 ${
                    isActive ? 'text-emerald-400' : 'text-muted-foreground'
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 md:p-6 max-w-[1600px] mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
