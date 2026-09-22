"use client";

import React, { useEffect, useState, useCallback } from "react";
import { HeaderStats } from "@/components/HeaderStats";
import { SourceFilters } from "@/components/SourceFilters";
import { TimelineVisualizer } from "@/components/TimelineVisualizer";
import { ClusterDetailDrawer } from "@/components/ClusterDetailDrawer";
import { TimelineItem, ClusterDetail, DashboardStats, IngestionJobStatus } from "@/types/news";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function NewsPulseDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    totalClusters: 0,
    sources: [],
    lastUpdated: null,
  });

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedClusterDetail, setSelectedClusterDetail] = useState<ClusterDetail | null>(null);

  const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(true);
  const [isLoadingClusterDetail, setIsLoadingClusterDetail] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingestion Job State
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshProgress, setRefreshProgress] = useState<number>(0);
  const [refreshStatusText, setRefreshStatusText] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // 1. Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/stats");
      if (!res.ok) throw new Error("Failed to load statistics");
      const data = await res.json();
      setStats({
        totalArticles: data.totalArticles,
        totalClusters: data.totalClusters,
        sources: data.sources || [],
        lastUpdated: data.lastUpdated,
      });

      // Default all available sources to selected if not yet populated
      setSelectedSources((prev) => {
        if (prev.length === 0 && data.sources && data.sources.length > 0) {
          return data.sources;
        }
        return prev;
      });
    } catch (err: any) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  // 2. Fetch timeline data
  const fetchTimeline = useCallback(async () => {
    try {
      setIsLoadingTimeline(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (selectedSources.length > 0 && selectedSources.length < stats.sources.length) {
        params.append("sources", selectedSources.join(","));
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const url = `/timeline${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load timeline dataset");
      const data: TimelineItem[] = await res.json();
      setTimeline(data);
    } catch (err: any) {
      console.error("Error fetching timeline:", err);
      setErrorMessage(err.message || "Failed to load timeline data");
    } finally {
      setIsLoadingTimeline(false);
    }
  }, [selectedSources, stats.sources.length, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Auto-refresh interval (every 60s if enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTimeline();
      fetchStats();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTimeline, fetchStats]);

  // Handle cluster selection & detail fetch
  const handleSelectCluster = async (id: number) => {
    setSelectedClusterId(id);
    setIsLoadingClusterDetail(true);
    try {
      const res = await fetch(`/clusters/${id}`);
      if (!res.ok) throw new Error(`Cluster ${id} could not be retrieved`);
      const detail: ClusterDetail = await res.json();
      setSelectedClusterDetail(detail);
    } catch (err) {
      console.error("Error loading cluster detail:", err);
    } finally {
      setIsLoadingClusterDetail(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedClusterId(null);
    setSelectedClusterDetail(null);
  };

  // Source toggle handlers
  const handleToggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleSelectAllSources = () => {
    setSelectedSources(stats.sources);
  };

  // Refresh ingestion trigger workflow
  const handleTriggerRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      setRefreshProgress(10);
      setRefreshStatusText("Queueing RSS ingestion job...");

      const res = await fetch("/ingest/trigger", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to trigger ingestion pipeline");
      }

      const jobId = data.jobId;
      setRefreshProgress(25);
      setRefreshStatusText("Fetching RSS feeds and extracting content...");

      // Poll job status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/ingest/status/${jobId}`);
          if (!statusRes.ok) return;
          const job: IngestionJobStatus = await statusRes.json();

          setRefreshProgress(job.progress || 35);

          if (job.status === "completed") {
            clearInterval(pollInterval);
            setIsRefreshing(false);
            setRefreshProgress(100);
            const created = job.articlesCreated ?? 0;
            const updated = job.clustersUpdated ?? 0;
            setRefreshStatusText(`Ingestion complete! ${created} new articles, ${updated} clusters.`);
            setTimeout(() => setRefreshStatusText(""), 4000);

            // Re-fetch dashboard data
            await fetchStats();
            await fetchTimeline();
          } else if (job.status === "failed") {
            clearInterval(pollInterval);
            setIsRefreshing(false);
            setErrorMessage(`News ingestion failed: ${job.errorMessage || "Unknown error"}`);
          } else {
            setRefreshStatusText(`Running scraper pipeline (${job.progress}%)...`);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 1000);
    } catch (err: any) {
      console.error("Trigger error:", err);
      setIsRefreshing(false);
      setErrorMessage(err.message || "Failed to initiate ingestion pipeline");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-blue-500/20">
      {/* Top Header & Metric Bar */}
      <HeaderStats
        totalArticles={stats.totalArticles}
        totalClusters={stats.totalClusters}
        activeSourcesCount={stats.sources.length}
        lastUpdated={stats.lastUpdated}
        onRefresh={handleTriggerRefresh}
        isRefreshing={isRefreshing}
        refreshProgress={refreshProgress}
        refreshStatusText={refreshStatusText}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Source Filters and Search Bar */}
        <SourceFilters
          availableSources={stats.sources}
          selectedSources={selectedSources}
          onToggleSource={handleToggleSource}
          onSelectAll={handleSelectAllSources}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Error State Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs sm:text-sm font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                fetchTimeline();
              }}
              className="text-xs px-3 py-1 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State or Interactive Timeline */}
        {isLoadingTimeline ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[350px]">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-semibold text-foreground">Loading latest news timeline...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronizing topic clusters and timeline intervals...
            </p>
          </div>
        ) : (
          <TimelineVisualizer
            timeline={timeline}
            selectedClusterId={selectedClusterId}
            onSelectCluster={handleSelectCluster}
          />
        )}
      </main>

      {/* Cluster Detail Drawer / Modal */}
      {selectedClusterId !== null && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleCloseDrawer}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-fadeIn"
          />
          <ClusterDetailDrawer
            cluster={selectedClusterDetail}
            isLoading={isLoadingClusterDetail}
            onClose={handleCloseDrawer}
          />
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card/30 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 News Pulse Intelligence Engine — Full-Stack Technical Assessment</p>
          <div className="flex items-center gap-4">
            <span>Python Scraper (trafilatura / BS4)</span>
            <span>•</span>
            <span>TF-IDF / Overlap Clustering</span>
            <span>•</span>
            <span>PostgreSQL & Next.js</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
