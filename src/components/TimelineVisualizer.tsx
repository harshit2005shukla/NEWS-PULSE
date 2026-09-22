"use client";

import React, { useMemo } from "react";
import { TimelineItem } from "@/types/news";
import { formatDateTime, formatDateOnly, getSourceBadgeColor } from "@/lib/formatters";
import { Layers, Calendar, ArrowRight, Tag } from "lucide-react";

interface TimelineVisualizerProps {
  timeline: TimelineItem[];
  selectedClusterId: number | null;
  onSelectCluster: (id: number) => void;
}

export const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({
  timeline,
  selectedClusterId,
  onSelectCluster,
}) => {
  // Compute global timeline bounds (earliest and latest time across all visible clusters)
  const { minTime, maxTime, totalDuration } = useMemo(() => {
    if (!timeline || timeline.length === 0) {
      const now = Date.now();
      return { minTime: now - 86400000, maxTime: now, totalDuration: 86400000 };
    }

    const times = timeline.flatMap((t) => [
      new Date(t.startTime).getTime(),
      new Date(t.endTime).getTime(),
    ]);

    const min = Math.min(...times);
    const max = Math.max(...times);
    // Ensure at least a 2-hour window even for single point in time
    const duration = Math.max(max - min, 2 * 3600 * 1000);

    return { minTime: min, maxTime: Math.max(max, min + duration), totalDuration: duration };
  }, [timeline]);

  // Generate 4 time markers for scale across the timeline header
  const timeMarkers = useMemo(() => {
    const markers = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const timeMs = minTime + (totalDuration * i) / steps;
      markers.push({
        timeMs,
        label: formatDateTime(new Date(timeMs).toISOString()),
        shortLabel: formatDateOnly(new Date(timeMs).toISOString()),
        percent: (i / steps) * 100,
      });
    }
    return markers;
  }, [minTime, totalDuration]);

  if (timeline.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
        <Layers className="w-10 h-10 mb-3 text-muted-foreground/50 stroke-1" />
        <h3 className="text-base font-semibold text-foreground">No Topics Found</h3>
        <p className="text-xs sm:text-sm max-w-sm mt-1">
          No topic clusters match the active source filters or search query. Adjust filters or refresh RSS data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Visual Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Topic Activity Timeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Topic clusters span horizontally from their earliest to latest published article. Click any cluster bar to inspect full articles.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80 inline-block" /> Multi-article
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400/60 inline-block" /> Single item
          </span>
        </div>
      </div>

      {/* Axis Scale */}
      <div className="px-4 py-2 border-b border-border bg-muted/40 relative">
        <div className="relative h-6 w-full flex justify-between text-[11px] font-medium text-muted-foreground select-none">
          {timeMarkers.map((m, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center"
              style={{
                position: idx === 0 ? "relative" : idx === timeMarkers.length - 1 ? "relative" : "absolute",
                left: idx === 0 || idx === timeMarkers.length - 1 ? undefined : `${m.percent}%`,
                transform: idx === 0 || idx === timeMarkers.length - 1 ? undefined : "translateX(-50%)",
              }}
            >
              <span>{m.label}</span>
              <div className="w-px h-1.5 bg-border mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Rows Container */}
      <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
        {timeline.map((cluster) => {
          const startMs = new Date(cluster.startTime).getTime();
          const endMs = new Date(cluster.endTime).getTime();

          // Compute horizontal position % and width %
          const leftPercent = Math.max(0, Math.min(95, ((startMs - minTime) / totalDuration) * 100));
          const rightPercent = Math.max(0, Math.min(100, ((endMs - minTime) / totalDuration) * 100));
          const widthPercent = Math.max(3, rightPercent - leftPercent);

          const isSelected = selectedClusterId === cluster.id;
          const isMulti = cluster.articleCount > 1;

          return (
            <div
              key={cluster.id}
              onClick={() => onSelectCluster(cluster.id)}
              className={`group p-3 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? "bg-blue-500/5 border-blue-500/60 shadow-sm ring-1 ring-blue-500/40"
                  : "bg-background/80 hover:bg-muted/40 border-border/80 hover:border-border"
              }`}
            >
              {/* Top Row: Label, article count, and sources */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isMulti
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {cluster.articleCount} {cluster.articleCount === 1 ? "article" : "articles"}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {cluster.label}
                    </h3>
                  </div>

                  {cluster.keywords && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground overflow-hidden truncate">
                      <Tag className="w-3 h-3 shrink-0" />
                      <span className="truncate">{cluster.keywords}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {cluster.sources.map((s) => (
                    <span
                      key={s}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getSourceBadgeColor(
                        s
                      )}`}
                    >
                      {s}
                    </span>
                  ))}
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-1" />
                </div>
              </div>

              {/* Graphical Time Span Track */}
              <div className="relative w-full h-5 bg-muted/40 rounded-md overflow-hidden flex items-center px-1">
                {/* Time Span Bar */}
                <div
                  className={`absolute h-3.5 rounded-sm transition-all duration-300 flex items-center px-1.5 text-[10px] text-white font-medium shadow-xs ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30"
                      : isMulti
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 opacity-90 group-hover:opacity-100"
                      : "bg-slate-400 dark:bg-slate-600"
                  }`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${Math.max(widthPercent, 5)}%`,
                    minWidth: "28px",
                  }}
                  title={`Spans ${formatDateTime(cluster.startTime)} to ${formatDateTime(cluster.endTime)}`}
                >
                  <span className="truncate">{cluster.articleCount > 1 ? `${cluster.articleCount} arts` : ""}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1 px-0.5">
                <span>{formatDateTime(cluster.startTime)}</span>
                <span>{formatDateTime(cluster.endTime)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
