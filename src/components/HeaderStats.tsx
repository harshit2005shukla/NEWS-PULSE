"use client";

import React from "react";
import { Newspaper, Layers, Radio, Clock, Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

interface HeaderStatsProps {
  totalArticles: number;
  totalClusters: number;
  activeSourcesCount: number;
  lastUpdated: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshProgress?: number;
  refreshStatusText?: string;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  totalArticles,
  totalClusters,
  activeSourcesCount,
  lastUpdated,
  onRefresh,
  isRefreshing,
  refreshProgress = 0,
  refreshStatusText = "",
  autoRefresh,
  setAutoRefresh,
}) => {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  NEWS PULSE
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                    Live Ingestion
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Topic-Clustered News Timeline & Intelligence Engine
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Auto refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                autoRefresh
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
              title="Automatically poll for timeline updates every 60s"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-ping" : "bg-muted-foreground"}`} />
              Auto-poll: {autoRefresh ? "ON (60s)" : "OFF"}
            </button>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`text-xs sm:text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all ${
                isRefreshing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-98"
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
              {isRefreshing ? "Ingesting RSS..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Ingestion Progress Banner */}
        {isRefreshing && (
          <div className="mt-3.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-100 flex flex-col gap-1.5 animate-fadeIn">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {refreshStatusText || "Processing RSS feeds..."}
              </span>
              <span>{refreshProgress}%</span>
            </div>
            <div className="w-full bg-blue-200/50 dark:bg-blue-950/60 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(refreshProgress, 12)}%` }}
              />
            </div>
          </div>
        )}

        {/* Dashboard Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Articles</p>
              <p className="text-lg font-bold text-foreground">{totalArticles}</p>
            </div>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Topic Clusters</p>
              <p className="text-lg font-bold text-foreground">{totalClusters}</p>
            </div>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Sources</p>
              <p className="text-lg font-bold text-foreground">{activeSourcesCount}</p>
            </div>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground font-medium">Latest Publication</p>
              <p className="text-xs font-semibold text-foreground truncate" title={lastUpdated || ""}>
                {lastUpdated ? formatDateTime(lastUpdated) : "None yet"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
